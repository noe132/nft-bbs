import { matchPath } from 'react-router-dom';
import * as QuorumLightNodeSDK from 'quorum-light-node-sdk';
import { action, observable, reaction, runInAction } from 'mobx';
import { either, function as fp, option, taskEither } from 'fp-ts';
import { constantDelay, limitRetries, Monoid } from 'retry-ts';
import { retrying } from 'retry-ts/Task';
import { v4 } from 'uuid';
import type { Post, Comment, Profile, Notification, GroupStatus, GroupConfig } from 'nft-bbs-server';
import { CommentType, DislikeType, ImageType, LikeType, PostDeleteType, PostType, ProfileType } from 'nft-bbs-types';

import { runLoading, routeUrlPatterns, matchRoutePatterns, getPageStateByPageName, constructRoutePath } from '~/utils';
import { CommentApi, ConfigApi, GroupApi, NotificationApi, PostApi, ProfileApi, TrxApi } from '~/apis';
import { socketService, SocketEventListeners } from '~/service/socket';
import { keyService } from '~/service/key';
import type { createPostlistState } from '~/views/Main/PostList';
import { loginStateService } from '../loginState';

const state = observable({
  groups: [] as Array<GroupStatus>,
  group: null as null | GroupStatus,
  routeGroupId: '',
  groupMap: null as null | {
    main: QuorumLightNodeSDK.IGroup
    comment: QuorumLightNodeSDK.IGroup
    counter: QuorumLightNodeSDK.IGroup
    profile: QuorumLightNodeSDK.IGroup
  },
  get groupId() {
    return this.group?.id ?? 0;
  },
  get groupOwnerAddress() {
    const pubkey = nodeService.state.groupMap?.main?.ownerPubKey;
    return pubkey
      ? fp.pipe(
        either.tryCatch(() => QuorumLightNodeSDK.utils.pubkeyToAddress(pubkey), fp.identity),
        either.getOrElse(() => ''),
      )
      : '';
  },

  init: {
    page: 'init' as 'init' | 'join' | 'main',
    step: '',
    error: '',
  },

  config: {
    loaded: false,
    group: {} as Record<number, GroupConfig>,
    defaultGroup: {} as GroupConfig,
    admin: [] as Array<string>,
    groupId: '',
    get currentGroup() {
      return state.config.group[state.groupId] ?? state.config.defaultGroup ?? {
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
    cacheByPostId: new Map<string, Set<string>>(),
    get cache() {
      return [...this.cacheByPostId.values()].flatMap((v) => [...v.values()]);
    },
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
    return (this.groupMap?.main?.groupName || this.groupMap?.main.groupId) ?? '';
  },
  get logined() {
    return !!keyService.state.address;
  },
});

const trx = {
  create: async (object: any, seed: 'main' | 'comment' | 'counter' | 'profile', type: '_Object' | 'Person' = '_Object') => {
    const groupStatus = state.group;
    if (!groupStatus) { throw new Error('no groupstatus while creating trx'); }
    const seedUrl = {
      main: groupStatus.mainSeedUrl,
      comment: groupStatus.commentSeedUrl,
      counter: groupStatus.counterSeedUrl,
      profile: groupStatus.profileSeedUrl,
    }[seed];
    const groupId = QuorumLightNodeSDK.utils.restoreSeedFromUrl(seedUrl).group_id;
    const group = QuorumLightNodeSDK.cache.Group.get(groupId);
    if (!group) { throw new Error('no group while creating trx'); }

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
    try {
      const person: ProfileType = {
        name: params.name,
        image: params.avatar,
      };
      const res = await trx.create(person, 'profile', 'Person');
      if (res) {
        const profileItem: Profile = {
          groupId: state.groupId,
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

  getFallbackProfile: (params: { userAddress: string, groupId?: GroupStatus['id'] }): Profile => ({
    trxId: '',
    groupId: params.groupId ?? 0,
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
    hot?: 'week' | 'month' | 'year' | 'all'
  }) => {
    const posts = await PostApi.list(state.groupId, {
      limit: params.limit,
      offset: params.offset,
      viewer: params.viewer ?? keyService.state.address,
      userAddress: params.userAddress,
      search: params.search,
      hot: params.hot,
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

    const res = await trx.create(object, 'main');

    if (res) {
      const post: Post = {
        trxId: res.trx_id,
        title,
        content,
        userAddress: keyService.state.address,
        groupId: state.groupId,
        timestamp: Date.now(),
        commentCount: 0,
        nonAuthorCommentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        hot: 0,
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
    await trx.create(object, 'main');
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
    const res = await trx.create(object, 'main');
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
    const commentCount = post.commentCount + (state.comment.cacheByPostId.get(post.trxId)?.size ?? 0);

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
    const postSet = state.comment.cacheByPostId.get(postTrxId);
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
    const res = await trx.create(object, 'comment');
    if (res) {
      const comment: Comment = {
        content: params.content,
        postId: params.objectId,
        threadId: params.threadId,
        replyId: params.replyId,
        userAddress: keyService.state.address,
        groupId: state.groupId,
        trxId: res.trx_id,
        commentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        timestamp: Date.now(),
      };

      runInAction(() => {
        state.comment.map.set(comment.trxId, comment);
        if (!state.comment.cacheByPostId.has(params.objectId)) {
          state.comment.cacheByPostId.set(params.objectId, new Set());
        }
        const postSet = state.comment.cacheByPostId.get(params.objectId)!;
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
    state.comment.cacheByPostId.forEach((s) => {
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

    const cachedCommentCount = Array.from(state.comment.cacheByPostId.get(comment.postId)?.values() ?? []).filter((trxId) => {
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
    if (!state.group) { return; }
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
      const res = await trx.create(object, 'counter');

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
    if (!state.group) { return; }
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
      const res = await trx.create(object, 'counter');
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
  join: (groupStatus: GroupStatus, useShortName = true) => either.tryCatch(
    () => {
      QuorumLightNodeSDK.cache.Group.clear();
      const seedUrls = Array.from(new Set([
        groupStatus.mainSeedUrl,
        groupStatus.commentSeedUrl,
        groupStatus.counterSeedUrl,
        groupStatus.profileSeedUrl,
      ]));

      seedUrls.forEach((v) => {
        QuorumLightNodeSDK.cache.Group.add(v);
      });

      runInAction(() => {
        state.groupMap = {
          main: QuorumLightNodeSDK.utils.seedUrlToGroup(groupStatus.mainSeedUrl),
          comment: QuorumLightNodeSDK.utils.seedUrlToGroup(groupStatus.commentSeedUrl),
          counter: QuorumLightNodeSDK.utils.seedUrlToGroup(groupStatus.counterSeedUrl),
          profile: QuorumLightNodeSDK.utils.seedUrlToGroup(groupStatus.profileSeedUrl),
        };
        state.group = groupStatus;
        if (useShortName && groupStatus.shortName) {
          state.routeGroupId = groupStatus.shortName;
        } else {
          state.routeGroupId = groupStatus.id.toString();
        }
      });

      if (window.location.pathname !== `/${state.routeGroupId}`) {
        history.replaceState(null, '', `/${state.routeGroupId}`);
      }

      group.setDocumentTitle();
      if (keyService.state.address) {
        profile.get({ userAddress: keyService.state.address });
        notification.getUnreadCount();
      }
    },
    (e) => e as Error,
  ),
  loadGroups: fp.pipe(
    () => GroupApi.list(),
    taskEither.map(action((v) => {
      state.groups = v;
    })),
  ),
  setDocumentTitle: (title?: string) => {
    document.title = [
      'Port',
      title,
      `${state.groupMap?.main?.groupName}`,
    ].filter((v) => v).join(' - ');
  },
};

const config = {
  load: retrying(
    Monoid.concat(constantDelay(2000), limitRetries(5)),
    () => fp.pipe(
      taskEither.fromIO(() => state.config.loaded),
      taskEither.chainW((loaded) => {
        if (loaded) { return taskEither.of(null); }
        return fp.pipe(
          ConfigApi.getConfig,
          taskEither.map((v) => {
            runInAction(() => {
              state.config.defaultGroup = {
                ...v.defaultGroup,
                groupId: 0,
                nft: '',
              };
              state.config.group = v.group;
              state.config.admin = v.admin;
              state.config.loaded = true;
            });
            return null;
          }),
        );
      }),
    ),
    either.isLeft,
  ),
  get: (groupId?: number) => {
    const theGroupId = groupId || state.groupId;
    return state.config.group[theGroupId] ?? state.config.defaultGroup ?? {
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
    getPageStateByPageName<ReturnType<typeof createPostlistState>>('postlist').forEach((s) => {
      if (s.mode.type !== 'search' && !s.trxIds.includes(v.trxId)) {
        s.trxIds.unshift(v.trxId);
      }
    });
  }),
  postDelete: action((v) => {
    const trxId = v.trxId;
    state.post.map.delete(trxId);
    getPageStateByPageName<ReturnType<typeof createPostlistState>>('postlist').forEach((s) => {
      const index = s.trxIds.indexOf(trxId);
      if (index !== -1) {
        s.trxIds.splice(index, 1);
      }
    });
    const match = matchPath(routeUrlPatterns.postdetail, location.pathname);
    if (match && match.params.trxId === trxId) {
      window.location.href = constructRoutePath({ page: 'postlist', groupId: state.routeGroupId });
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
    const toPage = action((v: 'join' | 'main') => { state.init.page = v; });

    interface AutoLoginGroup {
      groupItem: GroupStatus
      useShortName: boolean
    }

    const getAutoLoginGroup = (): option.Option<AutoLoginGroup> => {
      if (window.location.pathname === '/') {
        return fp.pipe(
          option.fromNullable(loginStateService.state.autoLoginGroupId),
          option.chain((autoLoginGroupId) => fp.pipe(
            option.fromNullable(
              state.groups.find((v) => v.id === autoLoginGroupId),
            ),
            option.map((groupItem) => ({
              groupItem,
              useShortName: true,
            })),
          )),
        );
      }

      return fp.pipe(
        option.fromNullable(matchRoutePatterns(window.location.pathname)),
        option.chain((groupIdOrShortName) => {
          const groupId = parseInt(groupIdOrShortName, 10);
          const groupItem = state.groups.find((v) => [
            v.id === groupId,
            v.shortName === groupIdOrShortName,
            QuorumLightNodeSDK.utils.restoreSeedFromUrl(v.mainSeedUrl).group_id === groupIdOrShortName,
          ].some((v) => v));
          return fp.pipe(
            option.fromNullable(groupItem),
            option.map((groupItem) => ({
              groupItem,
              useShortName: groupIdOrShortName !== groupItem.id.toString(),
            })),
          );
        }),
        (v) => {
          if (option.isNone(v)) {
            window.location.href = '/';
          }
          return v;
        },
      );
    };

    const loginByAutoGroup = (v: option.Option<AutoLoginGroup>): taskEither.TaskEither<unknown, boolean> => {
      if (option.isNone(v)) { return taskEither.of(false); }
      const { groupItem, useShortName } = v.value;
      const login = (): taskEither.TaskEither<unknown, boolean> => {
        const groupConfig = config.get(groupItem.id);
        const loginStateItem = loginStateService.state.groups[groupItem.id];
        if (loginStateItem?.lastLogin === 'mixin' && groupConfig.mixin && loginStateItem?.mixin) {
          const jwt = loginStateItem.mixin.mixinJWT;
          return fp.pipe(
            () => keyService.validateMixin(jwt),
            taskEither.chain((v) => taskEither.fromIO(() => keyService.useMixin(v))),
            taskEither.map(() => true),
          );
        }

        if (loginStateItem?.lastLogin === 'keystore' && groupConfig.keystore && loginStateItem?.keystore) {
          const keystore = loginStateItem.keystore;
          return fp.pipe(
            taskEither.fromIO(() => keyService.useKeystore(keystore)),
            taskEither.map(() => true),
          );
        }

        if (groupConfig.anonymous) {
          return taskEither.of(true);
        }

        return taskEither.of(false);
      };

      return fp.pipe(
        login(),
        taskEither.chainW((logined) => {
          if (logined) {
            return fp.pipe(
              taskEither.fromEither(group.join(groupItem, useShortName)),
              taskEither.map(() => true),
            );
          }
          return taskEither.of(false);
        }),
      );
    };

    const run = fp.pipe(
      taskEither.fromIO(action(() => { state.init.step = 'config'; })),
      taskEither.chainW(() => taskEither.sequenceArray([
        fp.pipe(
          () => config.load(),
          taskEither.mapLeft(action(() => {
            state.init.step = 'error';
            state.init.error = 'config';
          })),
        ),
        fp.pipe(
          () => group.loadGroups(),
          taskEither.mapLeft(action(() => {
            state.init.step = 'error';
            state.init.error = 'group';
          })),
        ),
      ])),
      taskEither.chainW(() => taskEither.fromIO(getAutoLoginGroup)),
      taskEither.chainW(loginByAutoGroup),
      taskEither.map((logined) => {
        if (logined) {
          toPage('main');
        } else {
          toPage('join');
        }
      }),
    );
    await run();
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
