import QuorumLightNodeSDK, { IGroup } from 'quorum-light-node-sdk';
import { action, observable, runInAction } from 'mobx';
import type {
  Post, Comment, Profile, Notification, CounterName,
  ICommentTrxContent, IProfileTrxContent, ICounterTrxContent,
  IPostTrxContent, IImageTrxContent, IGroupInfoTrxContent, UniqueCounter,
} from 'nft-bbs-server';
// import { init as initDatabase, TrxType } from '~/database';
import { runLoading, sleep } from '~/utils';
import { CommentApi, GroupApi, GroupInfoApi, NotificationApi, PostApi, ProfileApi } from '~/apis';
import { initSocket, SocketEventListeners } from '~/service/socket';
import { Keys, keyService } from '~/service/key';

export type HotestFilter = 'all' | 'year' | 'month' | 'week';
type PostListLoadMode = {
  type: 'search'
  search: string
} | {
  type: 'hotest'
  filter: HotestFilter
} | {
  type: 'latest'
};

const state = observable({
  inited: false,
  loadedData: true,

  group: null as null | IGroup,
  get groupOwnerAddress() {
    return nodeService.state.group?.ownerPubKey
      ? QuorumLightNodeSDK.utils.pubkeyToAddress(nodeService.state.group.ownerPubKey)
      : '';
  },

  post: {
    mode: { type: 'latest' } as PostListLoadMode,
    trxIds: [] as Array<string>,
    map: new Map<string, Post>(),
    loading: false,
    done: false,
    limit: 20 as const,
    offset: 0,
    taskId: 0,

    newPostCache: new Set<string>(),
    editCache: [] as Array<{
      trxId: string
      title: string
      content: string
      updatedTrxId: string
    }>,
    imageCache: new Map<string, string>(),

    get posts() {
      return this.trxIds.map((trxId) => this.map.get(trxId)!);
    },
  },
  comment: {
    map: new Map<string, Comment>(),
    taskId: 0,

    cache: new Map<string, Set<string>>(),
  },
  profile: {
    map: new Map<string, Profile>(),
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
  uniqueCounter: {
    // first in arr
    cache: [] as Array<UniqueCounter & { value: 1 | -1 }>,
  },
  groupInfo: {
    avatar: '',
    desc: '',
  },
  get myProfile() {
    return profile.getComputedProfile(keyService.state.keys.address);
  },
  get profileName() {
    return this.myProfile.name || keyService.state.keys.address.slice(0, 10);
  },
  get groupName() {
    return this.group?.groupName || '';
  },
  get logined() {
    return !!keyService.state.keys.address;
  },
});

const profile = {
  get: async (params: { userAddress: string } | { trxId: string }) => {
    const groupId = state.group?.groupId;
    if (!groupId) { throw new Error(); }
    let profile = 'userAddress' in params
      ? await ProfileApi.get(groupId, params.userAddress)
      : await ProfileApi.get(groupId, params.trxId);

    if ('userAddress' in params && !profile) {
      profile = {
        userAddress: params.userAddress,
        trxId: '',
        groupId: '',
        name: '',
        avatar: '',
        intro: '',
      };
    }

    runInAction(() => {
      if (profile) {
        state.profile.map.set(profile.userAddress, profile);
      }
    });

    return profile;
  },

  getUserInfo: async (userAddress: string) => {
    const groupId = state.group?.groupId;
    if (!groupId) { throw new Error(); }
    const [userProfile, postCount, firstComment, firstPost] = await Promise.all([
      profile.get({ userAddress }),
      PostApi.getCount(groupId, userAddress),
      comment.getFirstComment(userAddress),
      post.getFirstPost(userAddress),
    ]);
    if (userProfile) {
      const now = Date.now();
      const timestamp = Math.min(firstPost?.timestamp ?? now, firstComment?.timestamp ?? now);
      runInAction(() => {
        state.profile.map.set(userAddress, userProfile);
        state.profile.userPostCountMap.set(userAddress, postCount);
        state.profile.firstPostMap.set(userAddress, new Date(timestamp));
      });
    }
    return userProfile;
  },

  submit: async (params: { name: string, avatar: string, intro: string }) => {
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    try {
      const trxContent: IProfileTrxContent = {
        type: 'profile',
        name: params.name,
        avatar: params.avatar,
        intro: params.intro,
      };
      const res = await QuorumLightNodeSDK.chain.Trx.create({
        groupId: group.groupId,
        object: {
          content: JSON.stringify(trxContent),
          type: 'Note',
        },
        aesKey: group.cipherKey,
        privateKey: keyService.state.keys.privateKey,
      });
      const profile: Profile = {
        ...params,
        trxId: res.trx_id,
        groupId: group.groupId,
        userAddress: keyService.state.keys.address,
      };
      runInAction(() => {
        state.profile.map.set(keyService.state.keys.address, profile);
        state.profile.cache.set(keyService.state.keys.address, profile);
      });
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
    intro: '',
  }),

  getComputedProfile: (p: Profile | string) => {
    const userAddress = typeof p === 'string' ? p : p.userAddress;
    const item = typeof p === 'string' ? null : p;
    const cached = state.profile.cache.get(userAddress);
    const mapItem = state.profile.map.get(userAddress);
    return cached || mapItem || item || profile.getFallbackProfile({ userAddress });
  },

  set: (profile: Profile) => {
    if (profile.trxId) {
      state.profile.map.set(profile.trxId, profile);
    }
  },
};

const post = {
  getTaskId: action(() => {
    state.post.taskId += 1;
    return state.post.taskId;
  }),

  list: async (params?: { filter: HotestFilter } | { search: string }) => {
    const taskId = post.getTaskId();
    runInAction(() => {
      state.post.trxIds = [];
      if (params && 'filter' in params) {
        state.post.mode = {
          type: 'hotest',
          filter: params.filter,
        };
      } else if (params && 'search' in params) {
        state.post.mode = {
          type: 'search',
          search: params.search,
        };
      } else {
        state.post.mode = {
          type: 'latest',
        };
      }
      state.post.offset = 0;
      state.post.done = false;
      state.post.loading = true;
    });
    await sleep(1000);
    const data = await post.getList({
      viewer: keyService.state.keys.address,
      limit: state.post.limit,
      offset: state.post.offset,
    });
    if (state.post.taskId !== taskId) { return; }
    runInAction(() => {
      state.post.trxIds = data.map((v) => v.trxId);
      if (state.post.offset && state.post.newPostCache.size) {
        for (const cachedPostTrxId of state.post.newPostCache.values()) {
          state.post.trxIds.unshift(cachedPostTrxId);
        }
      }

      state.post.done = data.length < state.post.limit;
      state.post.offset += state.post.limit;
      state.post.loading = false;
    });
  },

  listNextPage: async () => {
    const taskId = post.getTaskId();
    runInAction(() => {
      state.post.loading = true;
    });
    await sleep(1000);
    const data = await post.getList({
      viewer: keyService.state.keys.address,
      limit: state.post.limit,
      offset: state.post.offset,
    });
    if (state.post.taskId !== taskId) { return; }
    runInAction(() => {
      data.forEach((v) => {
        state.post.trxIds.push(v.trxId);
        if (v.extra?.userProfile.trxId) {
          profile.set(v.extra.userProfile);
        }
      });
      state.post.offset += state.post.limit;
      state.post.done = data.length < state.post.limit;
      state.post.loading = false;
    });
  },

  getList: async (params: { viewer?: string, userAddress?: string, limit: number, offset: number }) => {
    const groupId = state.group?.groupId;
    if (!groupId) { return []; }
    const posts = await PostApi.list(groupId, {
      limit: params.limit,
      offset: params.offset,
      viewer: params.viewer ?? keyService.state.keys.address,
      userAddress: params.userAddress,
    });
    runInAction(() => {
      posts.forEach((v) => {
        state.post.map.set(v.trxId, v);
      });
    });
    return posts;
  },

  create: async (title: string, content: string) => {
    const trxContent: IPostTrxContent = {
      type: 'post',
      title,
      content,
    };
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    const groupId = group.groupId;
    const res = await QuorumLightNodeSDK.chain.Trx.create({
      groupId,
      object: {
        content: JSON.stringify(trxContent),
        type: 'Note',
      },
      aesKey: group.cipherKey,
      privateKey: keyService.state.keys.privateKey,
    });
    const post: Post = {
      trxId: res.trx_id,
      title,
      content,
      userAddress: keyService.state.keys.address,
      groupId,
      storage: 'cache',
      timestamp: Date.now(),
      commentCount: 0,
      likeCount: 0,
      dislikeCount: 0,
      hotCount: 0,
      extra: {
        disliked: false,
        liked: false,
        userProfile: { ...state.myProfile },
      },
    };
    runInAction(() => {
      state.post.newPostCache.add(post.trxId);
      state.post.trxIds.unshift(post.trxId);
      state.post.map.set(post.trxId, post);
    });
  },

  edit: async (post: Post, title: string, content: string) => {
    const trxContent: IPostTrxContent = {
      type: 'post',
      title,
      content,
      updatedTrxId: post.trxId,
    };
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    const groupId = group.groupId;
    const res = await QuorumLightNodeSDK.chain.Trx.create({
      groupId,
      object: {
        content: JSON.stringify(trxContent),
        type: 'Note',
      },
      aesKey: group.cipherKey,
      privateKey: keyService.state.keys.privateKey,
    });
    const editedPost = {
      trxId: res.trx_id,
      title,
      content,
      updatedTrxId: post.trxId,
    };
    runInAction(() => {
      state.post.editCache.unshift(editedPost);
    });
  },

  delete: async (post: Post) => {
    const trxContent: IPostTrxContent = {
      type: 'post',
      title: '',
      content: '',
      deletedTrxId: post.trxId,
    };
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    const groupId = group.groupId;
    await QuorumLightNodeSDK.chain.Trx.create({
      groupId,
      object: {
        content: JSON.stringify(trxContent),
        type: 'Note',
      },
      aesKey: group.cipherKey,
      privateKey: keyService.state.keys.privateKey,
    });
  },

  get: async (trxId: string, viewer?: string) => {
    const groupId = state.group?.groupId;
    if (!groupId) { return null; }
    const post = await PostApi.get({
      groupId,
      trxId,
      viewer: viewer ?? keyService.state.keys.address,
    });
    if (post) {
      if (post.extra?.userProfile.trxId) {
        profile.set(post.extra.userProfile);
      }
      runInAction(() => {
        state.post.map.set(post.trxId, post);
        state.post.newPostCache.delete(post.trxId);
      });
    }
    return post;
  },

  getFirstPost: async (userAddress: string) => {
    const groupId = state.group?.groupId;
    if (!groupId) { return null; }
    const post = await PostApi.getFirst({
      groupId,
      userAddress,
      viewer: keyService.state.keys.address,
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
    const group = state.group!;

    const content = await new Promise<string>((rs) => {
      const reader = new FileReader();
      reader.readAsDataURL(imgBlob);
      reader.addEventListener('loadend', () => {
        const base64data = reader.result;
        rs(base64data as string);
      });
    });
    const base64Data = content.replace(/^data:.+?;base64,/, '');

    const trxContent: IImageTrxContent = {
      type: 'image',
      mineType,
      content: base64Data,
    };
    const res = await QuorumLightNodeSDK.chain.Trx.create({
      groupId: group.groupId,
      object: {
        content: JSON.stringify(trxContent),
        type: 'Note',
      },
      aesKey: group.cipherKey,
      privateKey: keyService.state.keys.privateKey,
    });

    runInAction(() => {
      state.post.imageCache.set(res.trx_id, URL.createObjectURL(imgBlob));
    });

    return res;
  },

  getPostStat: (post: Post) => {
    const postTrxId = post.trxId;
    const likedSum = state.uniqueCounter.cache
      .filter((v) => v.objectId === postTrxId && v.name === 'postLike')
      .reduce((p, c) => p + c.value, 0);
    const dislikedSum = state.uniqueCounter.cache
      .filter((v) => v.objectId === postTrxId && v.name === 'postDislike')
      .reduce((p, c) => p + c.value, 0);
    const editCache = state.post.editCache.find((v) => v.updatedTrxId === post.trxId);

    const likeCount = post.likeCount + likedSum;
    const dislikeCount = post.dislikeCount + dislikedSum;
    const liked = (likedSum + (post.extra?.liked ? 1 : 0)) > 0;
    const disliked = (dislikedSum + (post.extra?.disliked ? 1 : 0)) > 0;
    const commentCount = post.commentCount + (state.comment.cache.get(post.trxId)?.size ?? 0);
    return {
      title: editCache?.title ?? post.title,
      content: editCache?.content ?? post.content,
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
    const groupId = state.group?.groupId;
    if (!groupId) { return []; }
    const comments = await CommentApi.list(groupId, {
      objectId: postTrxId,
      viewer: keyService.state.keys.address,
      offset: 0,
      limit: 500,
    });
    runInAction(() => {
      comments.forEach((v) => {
        if (v.extra?.userProfile.trxId) {
          profile.set(v.extra.userProfile);
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
    const trxContent: ICommentTrxContent = {
      type: 'comment',
      ...params,
    };
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    const res = await QuorumLightNodeSDK.chain.Trx.create({
      groupId: group.groupId,
      object: {
        content: JSON.stringify(trxContent),
        type: 'Note',
      },
      aesKey: group.cipherKey,
      privateKey: keyService.state.keys.privateKey,
    });
    const comment: Comment = {
      content: params.content,
      objectId: params.objectId,
      threadId: params.threadId,
      replyId: params.replyId,
      userAddress: keyService.state.keys.address,
      groupId: group.groupId,
      trxId: res.trx_id,
      storage: 'cache',
      hotCount: 0,
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
      // update thread comment summary
      // if (comment.threadId) {
      //   const thread = state.comment.map.get(comment.threadId);
      //   if (thread) {
      //     thread.commentCount += 1;
      //   }
      // }
      // update post summary
      // const post = state.post.map.get(params.objectId)!;
      // if (post) {
      //   post.commentCount += 1;
      // }
    });

    return comment;
  },
  get: async (trxId: string) => {
    const groupId = state.group?.groupId;
    if (!groupId) { return null; }
    const comment = await CommentApi.get(groupId, trxId);
    if (comment) {
      if (comment.extra?.userProfile.trxId) {
        profile.set(comment.extra.userProfile);
      }
      runInAction(() => {
        state.comment.map.set(comment.trxId, comment);
        state.comment.cache.forEach((s) => {
          s.delete(comment.trxId);
        });
      });
    }
    return comment;
  },
  getFirstComment: async (userAddress: string) => {
    const groupId = state.group?.groupId;
    if (!groupId) { return null; }
    const comment = await CommentApi.getFirst(groupId, userAddress, keyService.state.keys.address);
    return comment;
  },
};

const notification = {
  load: async (nextPage = false) => {
    if (state.notification.loading) { return; }
    const groupId = state.group?.groupId;
    if (!groupId) { return; }
    if (!nextPage) {
      runInAction(() => {
        state.notification.list = [];
        state.notification.offset = 0;
        state.notification.done = false;
      });
    }
    await runLoading(
      (l) => { state.notification.loading = l; },
      async () => {
        const notifications = await NotificationApi.list({
          groupId,
          userAddress: keyService.state.keys.address,
          limit: state.notification.limit,
          offset: state.notification.offset,
        });
        runInAction(() => {
          state.notification.offset += state.notification.limit;
          notifications.forEach((v) => {
            state.notification.list.push(v);
          });
          state.notification.unreadCount = 0;
          state.notification.done = notifications.length < state.notification.limit;
        });
      },
    );
  },
  getUnreadCount: async () => {
    const groupId = state.group?.groupId;
    if (!groupId) { return; }
    const count = await NotificationApi.getUnreadCount(groupId, keyService.state.keys.address);
    runInAction(() => {
      state.notification.unreadCount = count;
    });
  },
};

const counter = {
  update: async (params: {
    item: Post
    type: 'comment' | 'post'
    counterName: CounterName
  }) => {
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    const { item, counterName } = params;
    const trxId = item.trxId;
    try {
      const postStat = post.getPostStat(item);
      const countedKey = ['commentLike', 'postLike'].includes(counterName) ? 'liked' : 'disliked';
      const value = postStat[countedKey] ? -1 : 1;
      const trxContent: ICounterTrxContent = {
        type: 'counter',
        name: counterName,
        objectId: trxId,
        value,
      };
      const res = await QuorumLightNodeSDK.chain.Trx.create({
        groupId: group.groupId,
        object: {
          content: JSON.stringify(trxContent),
          type: 'Note',
        },
        aesKey: group.cipherKey,
        privateKey: keyService.state.keys.privateKey,
      });

      const uniqueCounter: UniqueCounter & { value: 1 | -1 } = {
        trxId: res.trx_id,
        groupId: group.groupId,
        name: counterName,
        objectId: item.trxId,
        userAddress: keyService.state.keys.address,
        timestamp: Date.now(),
        value,
      };

      runInAction(() => {
        state.uniqueCounter.cache.unshift(uniqueCounter);
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  },
};

const group = {
  editInfo: async (info: { avatar: string, desc: string }) => {
    const trxContent: IGroupInfoTrxContent = {
      type: 'groupInfo',
      ...info,
    };
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    await QuorumLightNodeSDK.chain.Trx.create({
      groupId: group.groupId,
      object: {
        content: JSON.stringify(trxContent),
        type: 'Note',
      },
      aesKey: group.cipherKey,
      privateKey: keyService.state.keys.privateKey,
    });
    runInAction(() => {
      state.groupInfo.avatar = info.avatar;
      state.groupInfo.desc = info.desc;
    });
  },
  updateInfo: async () => {
    const groupId = state.group?.groupId;
    if (!groupId) { return; }
    const item = await GroupInfoApi.get(groupId);
    runInAction(() => {
      state.groupInfo.avatar = item.avatar;
      state.groupInfo.desc = item.desc;
    });
  },
};

const socketEventHandler: SocketEventListeners = {
  notification: action((v) => {
    state.notification.unreadCount += 1;
    state.notification.list.unshift(v);
    state.notification.offset += 1;
  }),
  trx: (v) => {
    if (v.type === 'post') {
      post.get(v.trxId).then(action((post) => {
        if (post) {
          if (!state.post.trxIds.some((v) => v === post.trxId)) {
            state.post.trxIds.unshift(post.trxId);
          }
        }
      }));
    }
    if (v.type === 'comment') {
      comment.get(v.trxId);
    }
    if (v.type === 'groupInfo') {
      group.updateInfo();
    }
    if (v.type === 'profile') {
      profile.get({ trxId: v.trxId });
    }
    if (v.type === 'uniqueCounter') {
      const items = state.uniqueCounter.cache.filter((u) => u.trxId === v.trxId);
      items.forEach((item) => {
        const index = state.uniqueCounter.cache.indexOf(item);
        state.uniqueCounter.cache.splice(index);

        if (item.name.startsWith('post')) {
          post.get(item.objectId);
        }

        // if (item.name.startsWith('comment')) {
        // TODO: comment counter?
        // }
      });
    }
  },
  postEdit: action((v) => {
    const item = state.post.editCache.find((u) => u.trxId === v.post.trxId);
    if (item) {
      state.post.editCache.splice(state.post.editCache.indexOf(item), 1);
      post.get(item.updatedTrxId);
    }
  }),
  postDelete: action((v) => {
    const index = state.post.trxIds.indexOf(v.deletedTrxId);
    if (index) {
      state.post.trxIds.splice(index, 1);
      if (state.post.offset > 0) {
        state.post.offset -= 1;
      }
      state.post.map.delete(v.deletedTrxId);
    }
  }),
};

const joinGroup = async (seedUrl: string, keys?: Keys) => {
  QuorumLightNodeSDK.cache.Group.add(seedUrl);
  await GroupApi.join(seedUrl);

  if (keys) {
    keyService.use(keys);
  } else {
    keyService.clear();
  }

  runInAction(() => {
    state.group = QuorumLightNodeSDK.cache.Group.list()[0];
  });

  profile.get({ userAddress: keyService.state.keys.address });
  group.updateInfo();
  notification.getUnreadCount();

  initSocket(socketEventHandler);
};

const init = () => {
  runInAction(() => {
    state.inited = true;
  });
};

const destroy = () => {
  // if (state.pollingTask) {
  //   state.pollingTask.stop();
  // }
  // bus.off('loadedData', busListeners.loadedData);
  // bus.off('content', busListeners.content);
  // bus.off('notification', busListeners.notification);
};

export const nodeService = {
  state,
  init,
  destroy,

  post,
  comment,
  profile,
  notification,
  counter,
  group,
  joinGroup,
};

(window as any).nodeService = nodeService;
