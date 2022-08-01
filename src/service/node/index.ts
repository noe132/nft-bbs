import QuorumLightNodeSDK, { IContent, IGroup } from 'quorum-light-node-sdk';
import store from 'store2';
import { ethers } from 'ethers';
import { action, observable, runInAction } from 'mobx';
import {
  init as initDatabase,
  ProfileModel, CommentModel, PostModel, CounterModel, UniqueCounterModel, NotificationModel,
  ICounterTrxContent, ICommentTrxContent, IComment, IPost, IProfile, IProfileTrxContent, IPostTrxContent,
  TrxType, TrxStorage, TrxStatus, CounterName, NotificationObjectType, INotification, NotificationStatus, NotificationType,
} from '~/database';
import { bus, PollingTask, runLoading, sleep } from '~/utils';
import { pollingContentsTask } from './polling';

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
  loadedData: false,
  // myProfile: null as null | IProfile,

  pollingTask: null as null | PollingTask,

  group: null as null | IGroup,

  post: {
    mode: { type: 'latest' } as PostListLoadMode,
    trxIds: [] as Array<string>,
    map: new Map<string, IPost>(),
    loading: false,
    done: false,
    limit: 10 as const,
    offset: 0,
    taskId: 0,

    get posts() {
      return this.trxIds.map((trxId) => this.map.get(trxId)!);
    },
  },
  comment: {
    trxIds: [] as Array<string>,
    map: new Map<string, IComment>(),
    loading: false,
    taskId: 0,
  },
  profile: {
    map: new Map<string, IProfile>(),
  },
  notification: {
    loading: false,
    list: [] as Array<INotification>,
    unreadCount: 0,
  },
  get myProfile() {
    return this.profile.map.get(store('address'));
  },
  get profileName() {
    return this.myProfile ? this.myProfile.name : store('address').slice(0, 10);
  },
  get groupName() {
    return this.group?.groupName || '';
  },
});

const updateProfile = async () => {
  const group = QuorumLightNodeSDK.cache.Group.list()[0];
  const userAddress = store('address');
  const [profile] = await ProfileModel.bulkGet([{
    groupId: group.groupId,
    userAddress,
  }]);
  runInAction(() => {
    if (profile) {
      state.profile.map.set(userAddress, profile);
    }
  });
};

const updateUnreadCount = async () => {
  const group = QuorumLightNodeSDK.cache.Group.list()[0];
  const unreadCount = await NotificationModel.getUnreadCount({
    groupId: group.groupId,
  });
  runInAction(() => {
    state.notification.unreadCount = unreadCount;
  });
};

const submitProfile = async (params: { name: string, avatar: string }) => {
  const group = QuorumLightNodeSDK.cache.Group.list()[0];
  try {
    const trxContent: IProfileTrxContent = {
      type: TrxType.profile,
      name: params.name,
      avatar: params.avatar,
      intro: '',
    };
    const res = await QuorumLightNodeSDK.chain.Trx.create({
      groupId: group.groupId,
      object: {
        content: JSON.stringify(trxContent),
        type: 'Note',
      },
      aesKey: group.cipherKey,
      privateKey: store('privateKey'),
    });
    // eslint-disable-next-line no-console
    console.log(res);
    const profile = {
      ...trxContent,
      groupId: group.groupId,
      userAddress: store('address'),
    };
    await ProfileModel.bulkPut([profile]);
    await updateProfile();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

const updateCounter = async (params: {
  item: IComment | IPost
  type: 'comment' | 'post'
  counterName: CounterName
}) => {
  const group = QuorumLightNodeSDK.cache.Group.list()[0];
  const { item, counterName, type } = params;
  const trxId = item.trxId;
  try {
    const countedKey = [CounterName.commentLike, CounterName.postLike].includes(counterName) ? 'liked' : 'disliked';
    const countKey = [CounterName.commentLike, CounterName.postLike].includes(counterName) ? 'likeCount' : 'dislikeCount';
    const trxContent: ICounterTrxContent = {
      type: TrxType.counter,
      name: counterName,
      objectId: trxId,
      value: item.extra![countedKey] ? -1 : 1,
    };
    const res = await QuorumLightNodeSDK.chain.Trx.create({
      groupId: group.groupId,
      object: {
        content: JSON.stringify(trxContent),
        type: 'Note',
      },
      aesKey: group.cipherKey,
      privateKey: store('privateKey'),
    });
    // eslint-disable-next-line no-console
    console.log(res);
    await CounterModel.create({
      trxId: res.trx_id,
    });
    const uniqueCounter = {
      name: counterName,
      objectId: item.trxId,
      userAddress: store('address'),
    };
    await (item.extra![countedKey] ? UniqueCounterModel.bulkDelete([uniqueCounter]) : UniqueCounterModel.bulkAdd([uniqueCounter]));

    runInAction(() => {
      item.summary = {
        ...item.summary,
        [countKey]: item.summary[countKey] + (item.extra![countedKey] ? -1 : 1),
      };
    });

    const clone = JSON.parse(JSON.stringify(item));
    delete clone.extra;
    if (type === 'post') {
      await PostModel.bulkPut([clone as IPost]);
    }
    if (type === 'comment') {
      await CommentModel.bulkPut([clone as IComment]);
    }

    runInAction(() => {
      item.extra![countedKey] = !item.extra![countedKey];
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

const post = {
  getTaskId: action(() => {
    state.post.taskId += 1;
    return state.post.taskId;
  }),

  load: async (params?: { filter: HotestFilter } | { search: string }) => {
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
    const data = await post.getPosts();
    if (state.post.taskId !== taskId) { return; }
    runInAction(() => {
      state.post.trxIds = data.map((v) => v.trxId);
      state.post.done = data.length < state.post.limit;
      state.post.loading = false;
    });
  },

  loadNextPage: async () => {
    const taskId = post.getTaskId();
    runInAction(() => {
      state.post.loading = true;
    });
    await sleep(1000);
    const data = await post.getPosts();
    if (state.post.taskId !== taskId) { return; }
    runInAction(() => {
      data.forEach((v) => {
        state.post.trxIds.push(v.trxId);
      });
      state.post.offset += state.post.limit;
      state.post.done = !data.length;
      state.post.loading = false;
    });
  },

  getPosts: async (publisherUserAddress?: string) => {
    const posts = await PostModel.list({
      searchText: '',
      publisherUserAddress,
      currentUserAddress: store('address'),
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
      type: TrxType.post,
      title,
      content,
    };
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    const res = await QuorumLightNodeSDK.chain.Trx.create({
      groupId: group.groupId,
      object: {
        content: JSON.stringify(trxContent),
        type: 'Note',
      },
      aesKey: group.cipherKey,
      privateKey: store('privateKey'),
    });
    // eslint-disable-next-line no-console
    console.log(res);
    const post = {
      ...trxContent,
      userAddress: store('address'),
      groupId: group.groupId,
      trxId: res.trx_id,
      storage: TrxStorage.cache,
      status: TrxStatus.normal,
      latestId: '',
      summary: PostModel.DEFAULT_POST_SUMMARY,
      timestamp: Date.now(),
    };
    await PostModel.create(post);
    // TODO:
    const dbPost = (await PostModel.bulkGet([post.trxId], {
      currentUserAddress: store('address'),
    }))[0];
    runInAction(() => {
      state.post.trxIds.unshift(dbPost.trxId);
      state.post.map.set(dbPost.trxId, dbPost);
    });
  },
};

const comment = {
  getTaskId: action(() => {
    state.comment.taskId += 1;
    return state.comment.taskId;
  }),
  load: async (postTrxId: string) => {
    if (state.comment.loading) { return; }
    runInAction(() => { state.comment.trxIds = []; });
    const taskId = comment.getTaskId();
    await runLoading(
      (l) => { state.comment.loading = l; },
      async () => {
        const comments = await CommentModel.list({
          objectId: postTrxId,
          currentUserAddress: store('address'),
        });
        if (state.comment.taskId !== taskId) { return; }
        runInAction(() => {
          state.comment.trxIds = comments.map((v) => v.trxId);
          comments.forEach((v) => state.comment.map.set(v.trxId, v));
        });
      },
    );
  },
  submit: async (params: { objectId: string, threadId: string, replyId: string, content: string }) => {
    const trxContent: ICommentTrxContent = {
      type: TrxType.comment,
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
      privateKey: store('privateKey'),
    });
    // eslint-disable-next-line no-console
    console.log(res);
    const comment = {
      ...trxContent,
      userAddress: store('address'),
      groupId: group.groupId,
      trxId: res.trx_id,
      storage: TrxStorage.cache,
      status: TrxStatus.normal,
      latestId: '',
      summary: CommentModel.DEFAULT_POST_SUMMARY,
      timestamp: Date.now(),
    };
    await CommentModel.create(comment);
    const dbComment = (await CommentModel.bulkGet([comment.trxId], {
      currentUserAddress: store('address'),
    }))[0];

    runInAction(() => {
      state.comment.trxIds.push(dbComment.trxId);
      state.comment.map.set(dbComment.trxId, dbComment);
    });

    // update thread comment summary
    if (dbComment.threadId) {
      const thread = state.comment.map.get(dbComment.threadId);
      if (thread) {
        runInAction(() => {
          thread.summary.commentCount += 1;
        });
        const clone: IComment = JSON.parse(JSON.stringify(thread));
        delete clone.extra;
        await CommentModel.bulkPut([clone]);
      }
    }

    // update post summary
    const post = state.post.map.get(params.objectId)!;
    runInAction(() => {
      post.summary.commentCount += 1;
    });
    const postClone: IPost = JSON.parse(JSON.stringify(post));
    delete postClone.extra;
    await PostModel.bulkPut([postClone]);
    return dbComment;
  },
  loadOne: async (trxId: string) => {
    const list = await CommentModel.bulkGet([trxId]);
    const comment = list.at(0);
    if (comment) {
      runInAction(() => {
        state.comment.map.set(comment.trxId, comment);
      });
    }
    return comment;
  },
};

const notification = {
  load: async () => {
    if (state.notification.loading) { return; }
    runInAction(() => {
      state.notification.list = [];
    });
    await runLoading(
      (l) => { state.notification.loading = l; },
      async () => {
        const items = await NotificationModel.list({
          groupId: state.group!.groupId,
        });
        const itemsFromPost = items.filter((item) => item.objectType === NotificationObjectType.post);
        const fromPosts = await PostModel.bulkGet(itemsFromPost.map((item) => item.objectId));
        const itemsFromComment = items.filter((item) => item.objectType === NotificationObjectType.comment);
        const fromComments = await CommentModel.bulkGet(itemsFromComment.map((item) => item.objectId));
        const profiles = await ProfileModel.bulkGet(items.map((item) => ({
          groupId: item.groupId,
          userAddress: item.fromUserAddress,
        })));
        runInAction(() => {
          fromPosts.forEach((v) => {
            state.post.map.set(v.trxId, v);
          });
          fromComments.forEach((v) => {
            state.comment.map.set(v.trxId, v);
          });
          profiles.forEach((v) => {
            state.profile.map.set(v.userAddress, v);
          });
          state.notification.list = items;
        });
        const notificationToPut = items.map((item) => ({
          ...item,
          status: NotificationStatus.read,
        }));
        await NotificationModel.bulkPut(notificationToPut);
        runInAction(() => {
          state.notification.unreadCount = 0;
        });
      },
    );
  },
};

const joinGroup = async (seedUrl: string) => {
  QuorumLightNodeSDK.cache.Group.add(seedUrl);

  if (!store('privateKey')) {
    const wallet = ethers.Wallet.createRandom();
    const password = '123';
    const keystore = await wallet.encrypt(password, {
      scrypt: {
        N: 64,
      },
    });
    store('keystore', keystore.replaceAll('\\', ''));
    store('password', password);
    store('address', wallet.address);
    store('privateKey', wallet.privateKey);
  }

  await updateProfile();
  await updateUnreadCount();

  runInAction(() => {
    state.group = QuorumLightNodeSDK.cache.Group.list()[0];
  });

  state.pollingTask = new PollingTask(pollingContentsTask, 3000, true);
};

const busListeners = {
  loadedData: action(() => {
    state.loadedData = true;
  }),
  content: action((content: IContent) => {
    let jsonResult: ICommentTrxContent | IPostTrxContent | IProfileTrxContent | undefined;
    try {
      jsonResult = JSON.parse(content.Data.content);
    } catch (e) {}
    if (!jsonResult) { return; }

    if (jsonResult.type === TrxType.comment) {
      // TODO: append comment in state.postComment?
      const comment = state.comment.map.get(content.TrxId);
      if (comment) {
        comment.storage = TrxStorage.chain;
      }
    }

    if (jsonResult.type === TrxType.post) {
      // TODO: append post in state.post?
      const post = state.post.map.get(content.TrxId);
      if (post) {
        post.storage = TrxStorage.chain;
      }
    }

    if (jsonResult.type === TrxType.profile) {
      const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(content.SenderPubkey);
      const myAddress = store('address');
      if (userAddress === myAddress) {
        const profile = {
          ...ProfileModel.getTrxContent(content),
          userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(content.SenderPubkey),
          groupId: content.GroupId,
        };
        state.profile.map.set(myAddress, profile);
      }
    }
  }),
  notification: action((notification: INotification) => {
    // ignore dislike
    if (notification.type !== NotificationType.dislike) {
      state.notification.unreadCount += 1;
    }
  }),
};

const init = async () => {
  await initDatabase();
  bus.on('loadedData', busListeners.loadedData);
  bus.on('content', busListeners.content);
  bus.on('notification', busListeners.notification);

  runInAction(() => {
    state.inited = true;
  });
};

const destroy = () => {
  if (state.pollingTask) {
    state.pollingTask.stop();
  }
  bus.off('loadedData', busListeners.loadedData);
  bus.off('content', busListeners.content);
  bus.off('notification', busListeners.notification);
};

export const nodeService = {
  state,
  init,
  destroy,

  joinGroup,
  post,
  comment,
  notification,

  updateCounter,
  submitProfile,
};
