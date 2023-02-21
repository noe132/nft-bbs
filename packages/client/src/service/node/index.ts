import { matchPath } from 'react-router-dom';
import * as rumsdk from 'rum-sdk-browser';
import { action, observable, reaction, runInAction } from 'mobx';
import { either, function as fp, option, task, taskEither } from 'fp-ts';
import { constantDelay, limitRetries, Monoid } from 'retry-ts';
import { retrying } from 'retry-ts/Task';
import { v4 } from 'uuid';
import type {
  Post, Comment, Profile, Notification, Counter,
  GroupStatus, GroupConfig, IAppConfigItem,
} from 'nft-bbs-server';
import type {
  CommentType, CounterType, PostDeleteType, PostType,
  ProfileType, PostAppendType, ImageActivityType,
} from 'nft-bbs-types';

import {
  runLoading, routeUrlPatterns, getRouteGroupId,
  getPageStateByPageName, constructRoutePath,
} from '~/utils';
import {
  AppConfigApi,
  CommentApi, ConfigApi, GroupApi, NotificationApi,
  PostApi, ProfileApi, TrxApi,
} from '~/apis';
import { socketService, SocketEventListeners } from '~/service/socket';
import { keyService } from '~/service/key';

import { loginStateService } from '../loginState';

export const APPCONFIG_KEY_NAME = {
  DESC: 'group_desc',
  ANNOUNCEMENT: 'group_announcement',
  ICON: 'group_icon',
};

const state = observable({
  groups: [] as Array<GroupStatus>,
  group: null as null | GroupStatus,
  routeGroupId: '',
  groupMap: null as null | {
    main: rumsdk.IGroup
    comment: rumsdk.IGroup
    counter: rumsdk.IGroup
    profile: rumsdk.IGroup
  },
  get groupId() {
    return this.group?.id ?? 0;
  },
  get groupOwnerAddress() {
    const pubkey = nodeService.state.groupMap?.main?.ownerPubKey;
    return pubkey
      ? fp.pipe(
        either.tryCatch(() => rumsdk.utils.pubkeyToAddress(pubkey), fp.identity),
        either.getOrElse(() => ''),
      )
      : '';
  },

  init: {
    page: 'init' as 'init' | 'join' | 'main',
    step: '' as '' | 'config' | 'error',
    error: '' as '' | 'config' | 'group',
  },

  config: {
    loaded: false,
    group: {} as Record<number, GroupConfig>,
    defaultGroup: {} as GroupConfig,
    admin: [] as Array<string>,
    joinBySeedUrl: false,
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
    /** `Map<postTrxId, Set<commentId>>` */
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
    post: new Map<string, Array<Counter>>(),
    comment: new Map<string, Array<Counter>>(),
  },
  groupInfo: {
    avatar: '',
    desc: '',
  },
  appConfigMap: {} as Record<number, undefined | Record<IAppConfigItem['Name'], undefined | IAppConfigItem>>,
  get myProfile() {
    return profile.getComputedProfile(keyService.state.address);
  },
  get profileName() {
    return this.myProfile.name || keyService.state.address.slice(0, 10);
  },
  get groupName() {
    return (this.groupMap?.main?.groupName || this.groupMap?.main.groupId) ?? '';
  },
  get groupDesc() {
    return this.appConfigMap[state.groupId]?.[APPCONFIG_KEY_NAME.DESC]?.Value ?? null;
  },
  get groupAnnouncement() {
    return this.appConfigMap[state.groupId]?.[APPCONFIG_KEY_NAME.ANNOUNCEMENT]?.Value ?? null;
  },
  get groupIcon() {
    return this.appConfigMap[state.groupId]?.[APPCONFIG_KEY_NAME.ICON]?.Value ?? null;
  },
  get logined() {
    return !!keyService.state.address;
  },
});

const trx = {
  create: async (activity: any, seed: 'main' | 'comment' | 'counter' | 'profile') => {
    const groupStatus = state.group;
    if (!groupStatus) { throw new Error('no groupstatus while creating trx'); }
    const seedUrl = {
      main: groupStatus.mainSeedUrl,
      comment: groupStatus.commentSeedUrl,
      counter: groupStatus.counterSeedUrl,
      profile: groupStatus.profileSeedUrl,
    }[seed];
    const groupId = rumsdk.utils.restoreSeedFromUrl(seedUrl).group_id;
    const group = rumsdk.cache.Group.get(groupId);
    if (!group) { throw new Error('no group while creating trx'); }

    let res;
    if (window.location.protocol === 'https:') {
      const signedTrx = await rumsdk.utils.signTrx({
        groupId,
        data: activity,
        aesKey: group.cipherKey,
        version: '2.0.0',
        ...keyService.getTrxCreateParam(),
      });
      res = await TrxApi.create(groupId, signedTrx.TrxItem);
    } else {
      res = await rumsdk.chain.Trx.create({
        groupId,
        version: '2.0.0',
        data: activity,
        aesKey: group.cipherKey,
        ...keyService.getTrxCreateParam(),
      });
    }

    return res;
  },
};

const profile = {
  get: async (params: { userAddress: string, createTemp?: boolean }) => {
    let profileItem = await ProfileApi.getByUserAddress(state.groupId, params.userAddress);

    if ('userAddress' in params && !profileItem) {
      profileItem = {
        userAddress: params.userAddress,
        trxId: '',
        groupId: state.groupId,
        name: '',
        avatar: '',
        wallet: '',
        timestamp: Date.now(),
      };
    }

    if ((!profileItem || !profileItem.name) && keyService.state.keys?.type === 'mixin' && params.createTemp) {
      const result = await ProfileApi.setTempProfile({
        groupId: state.groupId,
        name: keyService.state.keys.user.display_name,
        avatar: keyService.state.keys.user.avatar_url,
        ...await keyService.getSignParams(),
      });
      if (either.isRight(result)) {
        profileItem = result.right;
      }
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
        type: 'Create',
        object: {
          type: 'Profile',
          name: params.name,
          describes: {
            type: 'Person',
            id: keyService.state.address,
          },
          ...params.avatar ? {
            image: [{
              type: 'Image',
              content: params.avatar.content,
              mediaType: params.avatar.mediaType,
            }],
          } : {},
        },
      };
      const res = await trx.create(person, 'profile');
      if (res) {
        const profileItem: Profile = {
          groupId: state.groupId,
          trxId: res.trx_id,
          userAddress: keyService.state.address,
          avatar: params.avatar
            ? `data:${params.avatar.mediaType};base64,${params.avatar.content}`
            : '',
          name: params.name,
          wallet: '',
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
    wallet: '',
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
          state.post.map.set(v.id, v);
          if (v.extra?.userProfile) {
            profile.save(v.extra.userProfile);
          }
        });
      });
    }
    return posts;
  },

  create: async (title: string, content: string) => {
    const activity: PostType = {
      type: 'Create',
      object: {
        type: 'Note',
        id: v4(),
        name: title,
        content,
      },
    };

    const res = await trx.create(activity, 'main');

    if (res) {
      const post: Post = {
        trxId: res.trx_id,
        id: activity.object.id,
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
          appends: [],
        },
      };
      runInAction(() => {
        state.post.newPostCache.add(post.id);
        state.post.map.set(post.id, post);
      });
    }
  },

  append: async (content: string, postId: string) => {
    const object: PostAppendType = {
      type: 'Create',
      object: {
        type: 'NoteAppend',
        id: v4(),
        content,
        inreplyto: {
          type: 'Note',
          id: postId,
        },
      },
    };

    const res = await trx.create(object, 'main');
    const post = state.post.map.get(postId);

    if (res && post?.extra?.appends) {
      post.extra.appends.push({
        id: object.object.id,
        content,
        groupId: state.groupId,
        postId,
        timestamp: Date.now(),
        trxId: res.trx_id,
      });
    }
  },

  delete: async (post: Post) => {
    const object: PostDeleteType = {
      type: 'Delete',
      object: {
        type: 'Note',
        id: post.id,
      },
    };
    await trx.create(object, 'main');
  },

  get: async (id: string, viewer?: string) => {
    if (!id) { return null; }
    const item = await PostApi.get({
      groupId: state.groupId,
      id,
      viewer: viewer ?? keyService.state.address,
    });
    if (!item) { return null; }
    return post.save(item);
  },

  save: action((post: Post) => {
    if (post.extra?.userProfile.trxId) {
      profile.save(post.extra.userProfile);
    }
    state.post.map.set(post.id, post);
    state.post.newPostCache.delete(post.id);
    return state.post.map.get(post.id)!;
  }),

  getFirstPost: async (userAddress: string) => {
    const post = await PostApi.getFirst({
      groupId: state.groupId,
      userAddress,
      viewer: keyService.state.address,
    });
    if (post) {
      runInAction(() => {
        state.post.map.set(post.id, post);
        state.post.newPostCache.delete(post.id);
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

    const acvitity: ImageActivityType = {
      type: 'Create',
      object: {
        type: 'Image',
        id: v4(),
        content: base64Data,
        mediaType: mineType,
      },
    };
    const res = await trx.create(acvitity, 'main');
    if (!res) {
      return null;
    }
    runInAction(() => {
      state.post.imageCache.set(acvitity.object.id, URL.createObjectURL(imgBlob));
    });

    return acvitity;
  },

  getStat: (post: Post) => {
    const [liked, likeCount] = (state.counter.post.get(post.id) ?? []).reduce<[boolean, number]>(([liked, count], c) => {
      if (liked && c.type === 'undolike') { return [false, count - 1]; }
      if (!liked && c.type === 'like') { return [true, count + 1]; }
      return [liked, count];
    }, [!!post.extra?.liked, post.likeCount]);
    const [disliked, dislikeCount] = (state.counter.post.get(post.id) ?? []).reduce<[boolean, number]>(([disliked, count], c) => {
      if (disliked && c.type === 'undodislike') { return [false, count - 1]; }
      if (!disliked && c.type === 'dislike') { return [true, count + 1]; }
      return [disliked, count];
    }, [!!post.extra?.disliked, post.dislikeCount]);

    const commentCount = post.commentCount + (state.comment.cacheByPostId.get(post.id)?.size ?? 0);

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
  list: async (postId: string) => {
    const comments = await CommentApi.list(state.groupId, {
      objectId: postId,
      viewer: keyService.state.address,
      offset: 0,
      limit: 500,
    });
    if (!comments) {
      return null;
    }
    runInAction(() => {
      comments.forEach((comment) => {
        if (comment.extra?.userProfile.trxId) {
          profile.save(comment.extra.userProfile);
        }
        state.comment.map.set(comment.id, comment);
      });
    });
    const commentIds = comments.map((comment) => comment.id);
    const postSet = state.comment.cacheByPostId.get(postId);
    if (postSet) {
      for (const cachedId of postSet) {
        commentIds.push(cachedId);
      }
    }
    return commentIds;
  },
  submit: async (params: { objectId: string, threadId: string, replyId: string, content: string }) => {
    const activity: CommentType = {
      type: 'Create',
      object: {
        type: 'Note',
        content: params.content,
        id: v4(),
        inreplyto: {
          type: 'Note',
          id: params.replyId || params.threadId || params.objectId,
        },
      },
    };
    const res = await trx.create(activity, 'comment');
    if (res) {
      const comment: Comment = {
        id: activity.object.id,
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
        state.comment.map.set(comment.id, comment);
        if (!state.comment.cacheByPostId.has(params.objectId)) {
          state.comment.cacheByPostId.set(params.objectId, new Set());
        }
        const postSet = state.comment.cacheByPostId.get(params.objectId)!;
        postSet.add(comment.id);
      });
      return comment;
    }

    return null;
  },
  get: async (id: string) => {
    const item = await CommentApi.get({
      groupId: state.groupId,
      id,
      viewer: keyService.state.address,
    });
    if (!item) { return null; }
    return comment.save(item);
  },
  save: action((item: Comment) => {
    if (item.extra?.userProfile.trxId) {
      profile.save(item.extra.userProfile);
    }
    state.comment.map.set(item.id, item);
    state.comment.cacheByPostId.forEach((s) => {
      s.delete(item.id);
    });
    return state.comment.map.get(item.id)!;
  }),
  getFirstComment: async (userAddress: string) => {
    const comment = await CommentApi.getFirst(state.groupId, userAddress, keyService.state.address);
    return comment;
  },
  getStat: (comment: Comment) => {
    const [liked, likeCount] = (state.counter.comment.get(comment.id) ?? []).reduce<[boolean, number]>(
      ([liked, count], c) => {
        if (liked && c.type === 'undolike') { return [false, count - 1]; }
        if (!liked && c.type === 'like') { return [true, count + 1]; }
        return [liked, count];
      },
      [!!comment.extra?.liked, comment.likeCount],
    );
    const [disliked, dislikeCount] = (state.counter.comment.get(comment.id) ?? []).reduce<[boolean, number]>(
      ([disliked, count], c) => {
        if (disliked && c.type === 'undodislike') { return [false, count - 1]; }
        if (!disliked && c.type === 'dislike') { return [true, count + 1]; }
        return [disliked, count];
      },
      [!!comment.extra?.disliked, comment.dislikeCount],
    );

    const cachedCommentCount = Array.from(state.comment.cacheByPostId.get(comment.postId)?.values() ?? []).filter((id) => {
      const c = state.comment.map.get(id);
      return c?.threadId === comment.id;
    }).length;
    const commentCount = comment.commentCount + cachedCommentCount;

    return {
      likeCount,
      dislikeCount,
      liked,
      disliked,
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
  update: async (item: Post | Comment, type: Counter['type']) => {
    if (!state.group) { return; }
    const isPost = 'title' in item;
    const stat = isPost ? post.getStat(item) : comment.getStat(item);
    const invalidAction = [
      stat.liked && type === 'like',
      !stat.liked && type === 'undolike',
      stat.disliked && type === 'dislike',
      !stat.disliked && type === 'undodislike',
    ].some((v) => v);
    if (invalidAction) { return; }
    const isUndo = type === 'undolike' || type === 'undodislike';
    const likeType = type === 'like' || type === 'undolike'
      ? 'Like'
      : 'Dislike';
    try {
      const acvitity: CounterType = isUndo
        ? {
          type: 'Undo',
          object: {
            type: likeType,
            object: {
              type: 'Note',
              id: item.id,
            },
          },
        }
        : {
          type: likeType,
          object: {
            type: 'Note',
            id: item.id,
          },
        };
      const res = await trx.create(acvitity, 'counter');

      if (res) {
        runInAction(() => {
          const counter: Counter = {
            groupId: state.groupId,
            objectId: item.id,
            objectType: isPost ? 'post' : 'comment',
            timestamp: Date.now(),
            trxId: res.trx_id,
            type,
            userAddress: keyService.state.address,
          };
          if (isPost) {
            if (!state.counter.post.has(item.id)) {
              state.counter.post.set(item.id, []);
            }
            const arr = state.counter.post.get(item.id)!;
            arr.push(counter);
          } else {
            if (!state.counter.comment.has(item.id)) {
              state.counter.comment.set(item.id, []);
            }
            const arr = state.counter.comment.get(item.id)!;
            arr.push(counter);
          }
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
      runInAction(() => {
        if (!loginStateService.state.privateGroups) {
          loginStateService.state.privateGroups = [];
        }
        const appendPrivateGroup = !loginStateService.state.privateGroups.includes(groupStatus.id)
          && state.groups.every((v) => v.id !== groupStatus.id);
        if (appendPrivateGroup) {
          loginStateService.state.privateGroups.push(groupStatus.id);
        }
      });

      rumsdk.cache.Group.clear();
      const seedUrls = Array.from(new Set([
        groupStatus.mainSeedUrl,
        groupStatus.commentSeedUrl,
        groupStatus.counterSeedUrl,
        groupStatus.profileSeedUrl,
      ]));

      seedUrls.forEach((v) => {
        rumsdk.cache.Group.add(v);
      });

      runInAction(() => {
        state.groupMap = {
          main: rumsdk.utils.seedUrlToGroup(groupStatus.mainSeedUrl),
          comment: rumsdk.utils.seedUrlToGroup(groupStatus.commentSeedUrl),
          counter: rumsdk.utils.seedUrlToGroup(groupStatus.counterSeedUrl),
          profile: rumsdk.utils.seedUrlToGroup(groupStatus.profileSeedUrl),
        };
        state.group = groupStatus;
        if (useShortName && groupStatus.shortName) {
          state.routeGroupId = groupStatus.shortName;
        } else {
          state.routeGroupId = groupStatus.id.toString();
        }
      });

      const groupId = getRouteGroupId(window.location.pathname);

      if (!groupId && groupId !== groupStatus.id.toString() && groupId !== groupStatus.shortName) {
        history.replaceState(null, '', `/${groupStatus.shortName || groupStatus.id}`);
      }

      group.setDocumentTitle();
      if (keyService.state.address) {
        profile.get({ userAddress: keyService.state.address, createTemp: true });
        notification.getUnreadCount();
      }
    },
    (e) => e as Error,
  ),
  joinBySeedUrl: async (seedUrl: string) => {
    const group = await GroupApi.joinBySeedurl(seedUrl);
    if (!group) { return null; }
    const existedGroup = state.groups.find((v) => v.id === group.id);
    if (existedGroup) { return existedGroup; }
    runInAction(() => {
      state.groups.push(group);
    });
    return group;
  },
  loadGroups: () => {
    const shortName = getRouteGroupId(window.location.pathname);
    const id = Number(shortName) ?? 0;
    const load = fp.pipe(
      () => GroupApi.list({
        privateGroupIds: [
          ...loginStateService.state.privateGroups || [],
          ...id ? [id] : [],
        ],
        privateGroupShortNames: shortName ? [shortName] : undefined,
        hideNetworkError: true,
      }),
      taskEither.map(action((v) => {
        state.groups = v;
        return v;
      })),
      taskEither.chainW((groups) => {
        const tasks = groups
          .map((v) => v.id)
          .map((v) => () => appconfig.load(v));
        return taskEither.fromTask(task.sequenceArray(tasks));
      }),
    );

    return retrying(
      Monoid.concat(constantDelay(2000), limitRetries(7)),
      () => fp.pipe(
        taskEither.fromIO(() => state.config.loaded),
        taskEither.chainW((loaded) => {
          if (loaded) { return taskEither.of(null); }
          return load;
        }),
      ),
      either.isLeft,
    )();
  },
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
    Monoid.concat(constantDelay(2000), limitRetries(7)),
    () => fp.pipe(
      taskEither.fromIO(() => state.config.loaded),
      taskEither.chainW((loaded) => {
        if (loaded) { return taskEither.of(null); }
        return fp.pipe(
          () => ConfigApi.getConfig(true),
          taskEither.map((v) => {
            runInAction(() => {
              state.config.defaultGroup = {
                ...v.defaultGroup,
                groupId: 0,
                nft: '',
              };
              state.config.group = v.group;
              state.config.admin = v.admin;
              state.config.joinBySeedUrl = v.joinBySeedUrl;
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

const appconfig = {
  load: async (groupId: GroupStatus['id']) => {
    const record = await AppConfigApi.get(groupId);
    if (record) {
      runInAction(() => {
        state.appConfigMap[groupId] = record;
      });
    }
  },
};

const socketEventHandler: Partial<SocketEventListeners> = {
  notification: action((v) => {
    state.notification.unreadCount += 1;
    state.notification.list.unshift(v);
    state.notification.offset += 1;
  }),
  post: action((v) => {
    post.get(v.id);
    getPageStateByPageName('postlist').forEach((s) => {
      if (s && s.mode.type !== 'search' && !s.postIds.includes(v.id)) {
        s.postIds.unshift(v.id);
      }
    });
  }),
  postDelete: action((v) => {
    const postId = v.id;
    state.post.map.delete(postId);
    getPageStateByPageName('postlist').forEach((s) => {
      if (s) {
        const index = s.postIds.indexOf(postId);
        if (index !== -1) {
          s.postIds.splice(index, 1);
        }
      }
    });
    const match = matchPath(routeUrlPatterns.postdetail, location.pathname);
    if (match && match.params.trxId === postId) {
      window.location.href = constructRoutePath({ page: 'postlist', groupId: state.routeGroupId });
    }
  }),
  comment: (v) => comment.get(v.id),
  counter: (v) => {
    if (v.objectType === 'post') {
      post.get(v.objectId).finally(action(() => {
        const arr = state.counter.post.get(v.objectId);
        if (arr) {
          const index = arr.findIndex((u) => u.trxId === v.trxId);
          if (index !== -1) {
            arr.splice(index, 1);
          }
        }
      }));
    }
    if (v.objectType === 'comment') {
      comment.get(v.objectId).finally(action(() => {
        const arr = state.counter.comment.get(v.objectId);
        if (arr) {
          const index = arr.findIndex((u) => u.trxId === v.trxId);
          if (index !== -1) {
            arr.splice(index, 1);
          }
        }
      }));
    }
  },
  profile: (v) => profile.save(v),
  appconfig: action((v) => {
    state.appConfigMap[v.groupId] = v.data;
  }),
  postAppend: (v) => {
    const post = state.post.map.get(v.postId);
    if (post?.extra?.appends.every((u) => u.id !== v.id)) {
      post.extra.appends.push(v);
    }
  },
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
        option.fromNullable(getRouteGroupId(window.location.pathname)),
        option.chain((groupIdOrShortName) => {
          const groupId = parseInt(groupIdOrShortName, 10);
          const groupItem = state.groups.find((v) => [
            v.id === groupId,
            v.shortName === groupIdOrShortName,
            rumsdk.utils.restoreSeedFromUrl(v.mainSeedUrl).group_id === groupIdOrShortName,
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
            taskEither.matchE(
              () => taskEither.of(false),
              (v) => fp.pipe(
                taskEither.fromIO(() => keyService.useMixin(v)),
                taskEither.map(() => true),
              ),
            ),
          );
        }

        if (loginStateItem?.lastLogin === 'metamask' && groupConfig.mixin && loginStateItem?.metamask) {
          const jwt = loginStateItem.metamask.mixinJWT;
          return fp.pipe(
            () => keyService.validateMixin(jwt),
            taskEither.matchE(
              () => taskEither.of(false),
              (v) => fp.pipe(
                taskEither.fromIO(() => keyService.useMixin(v)),
                taskEither.map(() => true),
              ),
            ),
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
  appconfig,
  socketEventHandler,
};
