import { matchPath } from 'react-router-dom';
import * as QuorumLightNodeSDK from 'quorum-light-node-sdk';
import { action, observable, reaction, runInAction } from 'mobx';
import { either, function as fp, taskEither } from 'fp-ts';
import { v4 } from 'uuid';
import type { Post, Comment, Profile, Notification } from 'nft-bbs-server';
import { CommentType, DislikeType, ImageType, LikeType, PostDeleteType, PostType, ProfileType } from 'nft-bbs-types';

import { getLoginState, runLoading, sleep, routeUrlPatterns } from '~/utils';
import { CommentApi, ConfigApi, GroupApi, NotificationApi, PostApi, ProfileApi, TrxApi } from '~/apis';
import { socketService, SocketEventListeners } from '~/service/socket';
import { keyService } from '~/service/key';
import { routerService } from '~/service/router';
import { pageStateMap } from '~/utils/pageState';
import type { createPostlistState } from '~/views/Main/PostList';

const state = observable({
  allowMixinLogin: false,
  showJoin: false,
  showMain: false,
  groupId: '',
  groups: [] as Array<GroupApi.GroupItem>,
  group: null as null | QuorumLightNodeSDK.IGroup,
  get groupOwnerAddress() {
    return nodeService.state.group?.ownerPubKey
      ? fp.pipe(
        either.tryCatch(() => QuorumLightNodeSDK.utils.pubkeyToAddress(nodeService.state.group!.ownerPubKey), fp.identity),
        either.getOrElse(() => ''),
      )
      : '';
  },

  config: {
    loaded: false,
    group: {} as ConfigApi.SiteConfig['group'],
    groupId: '',
    get currentGroup() {
      return state.config.group[state.groupId] ?? state.config.group.default ?? {
        anonymous: false,
        keystore: false,
        mixin: false,
      };
    },
    seedUrl: '',
  },

  post: {
    map: new Map<string, Post>(),
    newPostCache: new Set<string>(),
    imageCache: new Map<string, string>(),
  },
  comment: {
    map: new Map<string, Comment>(),
    taskId: 0,
    /** `Map<postTrxId, Set<commentTrx>>` */
    cache: new Map<string, Set<string>>(),
  },
  profile: {
    mapByTrxId: new Map<string, Profile>(),
    mapByAddress: new Map<string, Profile>(),
    cache: new Map<string, Profile>(),
    userPostCountMap: new Map<string, number>(),
    firstPostMap: new Map<string, Date>(),
  },
  notification: {
    limit: 20 as const,
    offset: 0,
    loading: false,
    done: false,
    list: [] as Array<Notification>,
    unreadCount: 0,
  },
  counter: {
    postLike: new Map<string, string>(),
    postDislike: new Map<string, string>(),
    comment: new Map<string, Array<(LikeType | DislikeType) & { trxId: string }>>(),
  },
  groupInfo: {
    avatar: '',
    desc: '',
  },
  get myProfile() {
    return profile.getComputedProfile(keyService.state.address);
  },
  get profileName() {
    return this.myProfile.name || keyService.state.address.slice(0, 10);
  },
  get groupName() {
    return this.group?.groupName || '';
  },
  get logined() {
    return !!keyService.state.address;
  },
});

const trx = {
  create: async (object: any, type: '_Object' | 'Person' = '_Object') => {
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    const groupId = group.groupId;
    let res;
    if (window.location.protocol === 'https:') {
      const signedTrx = await QuorumLightNodeSDK.utils.signTrx({
        type,
        groupId,
        data: object,
        aesKey: group!.cipherKey,
        ...keyService.getTrxCreateParam(),
      });
      res = await TrxApi.create(groupId, signedTrx.TrxItem);
    } else {
      res = type === '_Object'
        ? await QuorumLightNodeSDK.chain.Trx.create({
          groupId,
          object,
          aesKey: group.cipherKey,
          ...keyService.getTrxCreateParam(),
        })
        : await QuorumLightNodeSDK.chain.Trx.createPerson({
          groupId,
          person: object,
          aesKey: group.cipherKey,
          ...keyService.getTrxCreateParam(),
        });
    }

    return res;
  },
};

const profile = {
  get: async (params: { userAddress: string } | { trxId: string }) => {
    let profileItem = 'userAddress' in params
      ? await ProfileApi.getByUserAddress(state.groupId, params.userAddress)
      : await ProfileApi.getByTrxId(state.groupId, params.trxId);

    if ('userAddress' in params && !profileItem) {
      profileItem = {
        userAddress: params.userAddress,
        trxId: '',
        groupId: state.groupId,
        name: '',
        avatar: '',
        timestamp: Date.now(),
      };
    }

    runInAction(() => {
      if (profileItem) {
        profile.save(profileItem);
      }
    });

    return profileItem;
  },

  loadUserInfo: async (userAddress: string) => {
    const [userProfile, postCount, firstComment, firstPost] = await Promise.all([
      profile.get({ userAddress }),
      PostApi.getCount(state.groupId, userAddress),
      comment.getFirstComment(userAddress),
      post.getFirstPost(userAddress),
    ]);
    if (userProfile) {
      const now = Date.now();
      const timestamp = Math.min(firstPost?.timestamp ?? now, firstComment?.timestamp ?? now);
      runInAction(() => {
        profile.save(userProfile);
        state.profile.userPostCountMap.set(userAddress, postCount ?? 0);
        state.profile.firstPostMap.set(userAddress, new Date(timestamp));
      });
    }
    return userProfile;
  },

  submit: async (params: { name: string, avatar?: { mediaType: string, content: string } }) => {
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    try {
      const person: ProfileType = {
        name: params.name,
        image: params.avatar,
      };
      const res = await trx.create(person, 'Person');
      if (res) {
        const profileItem: Profile = {
          groupId: group.groupId,
          trxId: res.trx_id,
          userAddress: keyService.state.address,
          avatar: params.avatar
            ? `data:${params.avatar.mediaType};base64,${params.avatar.content}`
            : '',
          name: params.name,
          timestamp: Date.now(),
        };
        runInAction(() => {
          profile.save(profileItem);
          state.profile.cache.set(keyService.state.address, profileItem);
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  },

  getFallbackProfile: (params: { userAddress: string, groupId?: string }): Profile => ({
    trxId: '',
    groupId: params.groupId ?? '',
    userAddress: params.userAddress,
    name: '',
    avatar: '',
    timestamp: Date.now(),
  }),

  getComputedProfile: (p: Profile | string) => {
    const userAddress = typeof p === 'string' ? p : p.userAddress;
    const item = typeof p === 'string' ? null : p;
    const cached = state.profile.cache.get(userAddress);
    const mapItem = state.profile.mapByAddress.get(userAddress);
    return cached || mapItem || item || profile.getFallbackProfile({ userAddress });
  },

  save: action((profile: Profile) => {
    if (profile.trxId) {
      state.profile.mapByTrxId.set(profile.trxId, profile);
    }
    state.profile.mapByAddress.set(profile.userAddress, profile);
  }),
};

const post = {
  getList: async (params: {
    viewer?: string
    userAddress?: string
    limit: number
    offset: number
    search?: string
  }) => {
    const posts = await PostApi.list(state.groupId, {
      limit: params.limit,
      offset: params.offset,
      viewer: params.viewer ?? keyService.state.address,
      userAddress: params.userAddress,
      search: params.search,
    });
    if (posts) {
      runInAction(() => {
        posts.forEach((v) => {
          state.post.map.set(v.trxId, v);
          if (v.extra?.userProfile) {
            profile.save(v.extra.userProfile);
          }
        });
      });
    }
    return posts;
  },

  create: async (title: string, content: string) => {
    const object: PostType = {
      type: 'Note',
      name: title,
      content,
    };

    const res = await trx.create(object);

    if (res) {
      const post: Post = {
        trxId: res.trx_id,
        title,
        content,
        userAddress: keyService.state.address,
        groupId: state.groupId,
        timestamp: Date.now(),
        commentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        extra: {
          disliked: false,
          liked: false,
          userProfile: { ...state.myProfile },
        },
      };
      runInAction(() => {
        state.post.newPostCache.add(post.trxId);
        state.post.map.set(post.trxId, post);
      });
    }
  },

  delete: async (post: Post) => {
    const object: PostDeleteType = {
      type: 'Note',
      id: post.trxId,
      content: 'OBJECT_STATUS_DELETED',
    };
    await trx.create(object);
  },

  get: async (trxId: string, viewer?: string) => {
    if (!trxId) { return null; }
    const item = await PostApi.get({
      groupId: state.groupId,
      trxId,
      viewer: viewer ?? keyService.state.address,
    });
    if (!item) { return null; }
    return post.save(item);
  },

  save: action((item: Post) => {
    if (item.extra?.userProfile.trxId) {
      profile.save(item.extra.userProfile);
    }
    state.post.map.set(item.trxId, item);
    state.post.newPostCache.delete(item.trxId);
    return state.post.map.get(item.trxId)!;
  }),

  getFirstPost: async (userAddress: string) => {
    const post = await PostApi.getFirst({
      groupId: state.groupId,
      userAddress,
      viewer: keyService.state.address,
    });
    if (post) {
      runInAction(() => {
        state.post.map.set(post.trxId, post);
        state.post.newPostCache.delete(post.trxId);
      });
    }
    return post;
  },

  postImage: async (imgBlob: Blob, mineType: string) => {
    const content = await new Promise<string>((rs) => {
      const reader = new FileReader();
      reader.readAsDataURL(imgBlob);
      reader.addEventListener('loadend', () => {
        const base64data = reader.result;
        rs(base64data as string);
      });
    });
    const base64Data = content.replace(/^data:.+?;base64,/, '');

    const object: ImageType = {
      type: 'Note',
      attributedTo: [{ type: 'Note' }],
      content: '此版本暂不支持插图，更新版本即可支持',
      name: '插图',
      image: [{
        mediaType: mineType,
        content: base64Data,
        name: v4(),
      }],
    };
    const res = await trx.create(object);
    if (res) {
      runInAction(() => {
        state.post.imageCache.set(res.trx_id, URL.createObjectURL(imgBlob));
      });
    }

    return res;
  },

  getStat: (post: Post) => {
    const cachedLike = state.counter.postLike.get(post.trxId);
    const cachedDislike = state.counter.postDislike.get(post.trxId);

    const likeCount = post.likeCount + (cachedLike ? 1 : 0);
    const dislikeCount = post.dislikeCount + (cachedDislike ? 1 : 0);
    const liked = post.extra?.liked || !!cachedLike;
    const disliked = post.extra?.disliked || !!cachedDislike;
    const commentCount = post.commentCount + (state.comment.cache.get(post.trxId)?.size ?? 0);

    return {
      title: post.title,
      content: post.content,
      likeCount,
      dislikeCount,
      liked,
      disliked,
      commentCount,
    };
  },
};

const comment = {
  list: async (postTrxId: string) => {
    const comments = await CommentApi.list(state.groupId, {
      objectId: postTrxId,
      viewer: keyService.state.address,
      offset: 0,
      limit: 500,
    });
    if (!comments) {
      return null;
    }
    runInAction(() => {
      comments.forEach((v) => {
        if (v.extra?.userProfile.trxId) {
          profile.save(v.extra.userProfile);
        }
        state.comment.map.set(v.trxId, v);
      });
    });
    const trxIds = comments.map((v) => v.trxId);
    const postSet = state.comment.cache.get(postTrxId);
    if (postSet) {
      for (const cachedTrxId of postSet) {
        trxIds.push(cachedTrxId);
      }
    }
    return trxIds;
  },
  submit: async (params: { objectId: string, threadId: string, replyId: string, content: string }) => {
    const object: CommentType = {
      type: 'Note',
      content: params.content,
      inreplyto: { trxid: params.replyId || params.threadId || params.objectId },
    };
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    const res = await trx.create(object);
    if (res) {
      const comment: Comment = {
        content: params.content,
        postId: params.objectId,
        threadId: params.threadId,
        replyId: params.replyId,
        userAddress: keyService.state.address,
        groupId: group.groupId,
        trxId: res.trx_id,
        commentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        timestamp: Date.now(),
      };

      runInAction(() => {
        state.comment.map.set(comment.trxId, comment);
        if (!state.comment.cache.has(params.objectId)) {
          state.comment.cache.set(params.objectId, new Set());
        }
        const postSet = state.comment.cache.get(params.objectId)!;
        postSet.add(comment.trxId);
      });
      return comment;
    }

    return null;
  },
  get: async (trxId: string) => {
    const item = await CommentApi.get({
      groupId: state.groupId,
      trxId,
      viewer: keyService.state.address,
    });
    if (!item) { return null; }
    return comment.save(item);
  },
  save: action((item: Comment) => {
    if (item.extra?.userProfile.trxId) {
      profile.save(item.extra.userProfile);
    }
    state.comment.map.set(item.trxId, item);
    state.comment.cache.forEach((s) => {
      s.delete(item.trxId);
    });
    return state.comment.map.get(item.trxId)!;
  }),
  getFirstComment: async (userAddress: string) => {
    const comment = await CommentApi.getFirst(state.groupId, userAddress, keyService.state.address);
    return comment;
  },
  getStat: (comment: Comment) => {
    const liked = (state.counter.comment.get(comment.trxId) ?? []).reduce((p, c) => {
      const unchanged = (p && c.type === 'Like')
        || (!p && c.type === 'Dislike');
      return unchanged ? p : !p;
    }, !!comment.extra?.liked);

    let likeDiff = 0;
    if (!comment.extra?.liked && liked) {
      likeDiff = 1;
    }
    if (comment.extra?.liked && !liked) {
      likeDiff = -1;
    }

    const cachedCommentCount = Array.from(state.comment.cache.get(comment.postId)?.values() ?? []).filter((trxId) => {
      const c = state.comment.map.get(trxId);
      return c?.threadId === comment.trxId;
    }).length;

    const likeCount = comment.likeCount + likeDiff;
    const commentCount = comment.commentCount + cachedCommentCount;
    return {
      likeCount,
      liked,
      commentCount,
    };
  },
};

const notification = {
  load: async (params?: { nextPage?: true }) => {
    if (state.notification.loading) { return; }
    if (!params?.nextPage) {
      runInAction(() => {
        state.notification.list = [];
        state.notification.offset = 0;
        state.notification.done = false;
      });
    }
    const list = await runLoading(
      (l) => { state.notification.loading = l; },
      async () => {
        const notifications = await notification.getList(
          state.notification.offset,
          state.notification.limit,
        );
        if (notifications) {
          runInAction(() => {
            state.notification.offset += state.notification.limit;
            notifications.forEach((v) => {
              state.notification.list.push(v);
            });
            state.notification.done = notifications.length < state.notification.limit;
          });
        }
        return notifications;
      },
    );
    notification.getUnreadCount();
    return list;
  },
  getList: async (offset: number, limit: number) => {
    const notifications = await NotificationApi.list({
      groupId: state.groupId,
      userAddress: keyService.state.address,
      offset,
      limit,
    });
    return notifications;
  },
  getUnreadCount: async () => {
    const count = await NotificationApi.getUnreadCount(state.groupId, keyService.state.address);
    runInAction(() => {
      state.notification.unreadCount = count ?? 0;
    });
    return count;
  },
};

const counter = {
  updatePost: async (item: Post, type: 'Like' | 'Dislike') => {
    const group = state.group;
    if (!group) { return; }
    const trxId = item.trxId;
    const stat = post.getStat(item);
    const liked = stat.liked && type === 'Like';
    const disliked = stat.disliked && type === 'Dislike';
    if (liked || disliked) { return; }
    try {
      const object: LikeType | DislikeType = {
        id: trxId,
        type,
      };
      const res = await trx.create(object);

      const map = type === 'Like'
        ? state.counter.postLike
        : state.counter.postDislike;

      if (res) {
        runInAction(() => {
          map.set(item.trxId, res.trx_id);
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  },
  updateComment: async (item: Comment, type: 'Like' | 'Dislike') => {
    const group = state.group;
    if (!group) { return; }
    const trxId = item.trxId;
    const stat = comment.getStat(item);
    const liked = stat.liked && type === 'Like';
    const disliked = !stat.liked && type === 'Dislike';
    if (liked || disliked) { return; }
    try {
      const object: LikeType | DislikeType = {
        id: trxId,
        type,
      };
      const res = await trx.create(object);
      if (res) {
        runInAction(() => {
          if (!state.counter.comment.has(item.trxId)) {
            state.counter.comment.set(item.trxId, []);
          }
          state.counter.comment.get(item.trxId)!.push({
            ...object,
            trxId: res.trx_id,
          });
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  },
};

const group = {
  join: (seedUrl: string) => either.tryCatch(
    () => {
      QuorumLightNodeSDK.cache.Group.clear();
      QuorumLightNodeSDK.cache.Group.add(seedUrl);

      runInAction(() => {
        state.group = QuorumLightNodeSDK.cache.Group.list()[0];
        state.groupId = state.group.groupId;
      });

      GroupApi.join(seedUrl);
      if (keyService.state.address) {
        profile.get({ userAddress: keyService.state.address });
        notification.getUnreadCount();
      }
    },
    (e) => e as Error,
  ),
  loadGroups: async () => {
    const groups = await GroupApi.get();
    runInAction(() => {
      if (groups) {
        state.groups = groups;
      }
    });
  },
  tryAutoJoin: () => {
    const loginState = getLoginState();
    if (loginState.seedUrl && loginState.autoLogin) {
      group.join(loginState.seedUrl);
    }
  },
};

const config = {
  load: fp.pipe(
    taskEither.fromIO(() => state.config.loaded),
    taskEither.chainW((loaded) => {
      if (loaded) { return taskEither.of(null); }
      return fp.pipe(
        ConfigApi.getConfig,
        taskEither.map((v) => {
          runInAction(() => {
            state.config.group = v.group;
            state.config.seedUrl = v.fixedSeed ?? '';
            state.config.loaded = true;
          });
          return null;
        }),
      );
    }),
  ),
  get: (groupId?: string) => {
    const theGroupId = groupId || state.groupId;
    return state.config.group[theGroupId] ?? state.config.group.default ?? {
      anonymous: false,
      keystore: false,
      mixin: false,
    };
  },
};

const socketEventHandler: Partial<SocketEventListeners> = {
  notification: action((v) => {
    state.notification.unreadCount += 1;
    state.notification.list.unshift(v);
    state.notification.offset += 1;
  }),
  post: action((v) => {
    post.get(v.trxId);
    Array.from(pageStateMap.get('postlist')?.values() ?? []).forEach((_s) => {
      const s = _s as ReturnType<typeof createPostlistState>;
      if (s.mode.type !== 'search' && !s.trxIds.includes(v.trxId)) {
        s.trxIds.unshift(v.trxId);
      }
    });
  }),
  postDelete: action((v) => {
    const trxId = v.trxId;
    state.post.map.delete(trxId);
    Array.from(pageStateMap.get('postlist')?.values() ?? []).forEach((_s) => {
      const s = _s as ReturnType<typeof createPostlistState>;
      const index = s.trxIds.indexOf(trxId);
      if (index !== -1) {
        s.trxIds.splice(index, 1);
      }
    });
    const match = matchPath('/post/:groupId/:trxId', location.pathname);
    if (match && match.params.trxId === trxId) {
      window.location.href = '/';
    }
  }),
  comment: (v) => comment.get(v.trxId),
  counter: (v) => {
    if (v.objectType === 'post') {
      post.get(v.objectId).finally(action(() => {
        state.counter.postLike.delete(v.trxId);
        state.counter.postDislike.delete(v.trxId);
      }));
    }
    if (v.objectType === 'comment') {
      comment.get(v.objectId).finally(action(() => {
        const list = state.counter.comment.get(v.objectId);
        if (list) {
          state.counter.comment.set(
            v.objectId,
            list.filter((u) => u.trxId !== v.trxId),
          );
        }
      }));
    }
  },
  profile: (v) => profile.save(v),
};

const init = () => {
  const removeListeners = socketService.addListeners(socketEventHandler);
  const dispose = reaction(
    () => ({
      userAddress: keyService.state.address,
      groupId: nodeService.state.groupId,
    }),
    (data) => {
      if (data.userAddress && data.groupId) {
        socketService.authenticate(data);
      } else {
        socketService.logout();
      }
    },
  );
  const initCheck = async () => {
    const toJoin = action(() => {
      state.showJoin = true;
      state.showMain = false;
    });
    const toMain = action(() => {
      state.showJoin = false;
      state.showMain = true;
    });
    const pathname = window.location.pathname;

    await config.load();
    await keyService.tryAutoLogin();

    if (pathname === '/') {
      group.tryAutoJoin();
      if (state.group) {
        routerService.navigate(`/${state.groupId}`);
        toMain();
      } else {
        toJoin();
      }
      return;
    }

    const urlMatchMap = {
      postlist: matchPath(routeUrlPatterns.postlist, pathname),
      postdetail: matchPath(routeUrlPatterns.postdetail, pathname),
      newpost: matchPath(routeUrlPatterns.newpost, pathname),
      userprofile: matchPath(routeUrlPatterns.userprofile, pathname),
      notification: matchPath(routeUrlPatterns.notification, pathname),
    };
    const urlMatches = Object.values(urlMatchMap);
    const nonMatch = urlMatches.every((v) => !v);
    if (nonMatch) {
      window.location.href = '/';
      return;
    }
    await group.loadGroups();
    const groupId = urlMatches.find((v) => v?.params?.groupId)?.params.groupId;
    const groupItem = state.groups.find((v) => v.groupId === groupId);
    if (!groupItem) {
      window.location.href = '/';
      return;
    }

    if (groupId && !keyService.state.logined && !state.config.group[groupId].anonymous) {
      toJoin();
      return;
    }

    group.join(groupItem.seedUrl);

    if (!state.group) {
      window.location.href = '/';
      return;
    }

    toMain();
  };
  initCheck();

  return () => {
    removeListeners();
    dispose();
  };
};

export const nodeService = {
  state,
  init,

  post,
  comment,
  profile,
  notification,
  counter,
  group,
  config,
};
