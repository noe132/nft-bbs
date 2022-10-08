import { matchPath } from 'react-router-dom';
import * as QuorumLightNodeSDK from 'quorum-light-node-sdk';
import { action, observable, reaction, runInAction } from 'mobx';
import { either } from 'fp-ts';
import type { Post, Comment, Profile, Notification, UniqueCounter } from 'nft-bbs-server';
import {
  CounterName, ICommentTrxContent, IProfileTrxContent, ICounterTrxContent,
  IPostTrxContent, IImageTrxContent, IGroupInfoTrxContent, TrxType, TrxStorage,
} from 'nft-bbs-types';
import { getLoginState, runLoading, setLoginState } from '~/utils';
import { CommentApi, GroupApi, GroupInfoApi, NotificationApi, PostApi, ProfileApi, VaultApi } from '~/apis';
import { socketService, SocketEventListeners } from '~/service/socket';
import { keyService } from '~/service/key';
import { nftService } from '~/service/nft';
import { pageStateMap } from '~/utils/pageState';
import type { createPostlistState } from '~/views/Main/PostList';

const state = observable({
  allowMixinLogin: false,
  showJoin: false,
  showMain: false,
  groupId: '',
  group: null as null | QuorumLightNodeSDK.IGroup,
  get groupOwnerAddress() {
    return nodeService.state.group?.ownerPubKey
      ? QuorumLightNodeSDK.utils.pubkeyToAddress(nodeService.state.group.ownerPubKey)
      : '';
  },
  get postPermissionTip() {
    if (!this.logined) { return '请先登录'; }
    if (!nftService.state.hasPermission) { return '无权限发布内容'; }
    return '';
  },

  post: {
    map: new Map<string, Post>(),
    newPostCache: new Set<string>(),
    editCache: [] as Array<{
      trxId: string
      title: string
      content: string
      updatedTrxId: string
    }>,
    imageCache: new Map<string, string>(),
  },
  comment: {
    map: new Map<string, Comment>(),
    taskId: 0,
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
  uniqueCounter: {
    // first in arr
    cache: [] as Array<UniqueCounter & { value: 1 | -1 }>,
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
        intro: '',
      };
    }

    runInAction(() => {
      if (profileItem) {
        profile.set(profileItem);
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
        profile.set(userProfile);
        state.profile.userPostCountMap.set(userAddress, postCount ?? 0);
        state.profile.firstPostMap.set(userAddress, new Date(timestamp));
      });
    }
    return userProfile;
  },

  submit: async (params: { name: string, avatar: string, intro: string }) => {
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    try {
      const trxContent: IProfileTrxContent = {
        type: TrxType.profile,
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
        ...keyService.getTrxCreateParam(),
      });
      const profileItem: Profile = {
        ...params,
        trxId: res.trx_id,
        groupId: group.groupId,
        userAddress: keyService.state.address,
      };
      runInAction(() => {
        profile.set(profileItem);
        state.profile.cache.set(keyService.state.address, profileItem);
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
    const mapItem = state.profile.mapByAddress.get(userAddress);
    return cached || mapItem || item || profile.getFallbackProfile({ userAddress });
  },

  set: action((profile: Profile) => {
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
            profile.set(v.extra.userProfile);
          }
        });
      });
    }
    return posts;
  },

  create: async (title: string, content: string) => {
    const trxContent: IPostTrxContent = {
      type: TrxType.post,
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
      ...keyService.getTrxCreateParam(),
    });
    const post: Post = {
      trxId: res.trx_id,
      title,
      content,
      userAddress: keyService.state.address,
      groupId,
      storage: TrxStorage.cache,
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
      state.post.map.set(post.trxId, post);
    });
  },

  edit: async (post: Post, title: string, content: string) => {
    const trxContent: IPostTrxContent = {
      type: TrxType.post,
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
      ...keyService.getTrxCreateParam(),
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
      type: TrxType.post,
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
      ...keyService.getTrxCreateParam(),
    });
  },

  get: async (trxId: string, viewer?: string) => {
    if (!trxId) { return null; }
    const post = await PostApi.get({
      groupId: state.groupId,
      trxId,
      viewer: viewer ?? keyService.state.address,
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
      type: TrxType.image,
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
      ...keyService.getTrxCreateParam(),
    });

    runInAction(() => {
      state.post.imageCache.set(res.trx_id, URL.createObjectURL(imgBlob));
    });

    return res;
  },

  getStat: (post: Post) => {
    const postTrxId = post.trxId;
    const likedSum = state.uniqueCounter.cache
      .filter((v) => v.objectId === postTrxId && v.name === CounterName.postLike)
      .reduce((p, c) => p + c.value, 0);
    const dislikedSum = state.uniqueCounter.cache
      .filter((v) => v.objectId === postTrxId && v.name === CounterName.postDislike)
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
          profile.set(v.extra.userProfile);
        }
        state.comment.map.set(v.trxId, v);
      });
    });
    const trxIds = comments.map((v) => v.trxId);
    // TODO: when paging, append cached only if (offset === 0) (first page)
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
      ...keyService.getTrxCreateParam(),
    });
    const comment: Comment = {
      content: params.content,
      objectId: params.objectId,
      threadId: params.threadId,
      replyId: params.replyId,
      userAddress: keyService.state.address,
      groupId: group.groupId,
      trxId: res.trx_id,
      storage: TrxStorage.cache,
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
    const comment = await CommentApi.get({
      groupId: state.groupId,
      trxId,
      viewer: keyService.state.address,
    });
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
    const comment = await CommentApi.getFirst(state.groupId, userAddress, keyService.state.address);
    return comment;
  },
  getStat: (comment: Comment) => {
    const commentTrxId = comment.trxId;
    const likedSum = state.uniqueCounter.cache
      .filter((v) => v.objectId === commentTrxId && v.name === CounterName.commentLike)
      .reduce((p, c) => p + c.value, 0);
    const dislikedSum = state.uniqueCounter.cache
      .filter((v) => v.objectId === commentTrxId && v.name === CounterName.commentDislike)
      .reduce((p, c) => p + c.value, 0);

    const likeCount = comment.likeCount + likedSum;
    const dislikeCount = comment.dislikeCount + dislikedSum;
    const liked = (likedSum + (comment.extra?.liked ? 1 : 0)) > 0;
    const disliked = (dislikedSum + (comment.extra?.disliked ? 1 : 0)) > 0;
    const cachedCommentCount = Array.from(state.comment.cache.get(comment.objectId)?.values() ?? []).filter((trxId) => {
      const c = state.comment.map.get(trxId);
      return c?.threadId === comment.trxId;
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
  update: async (params: (
    { type: 'post', item: Post, counterName: CounterName.postLike | CounterName.postDislike }
    | { type: 'comment', item: Comment, counterName: CounterName.commentLike | CounterName.commentDislike}
  )) => {
    const group = QuorumLightNodeSDK.cache.Group.list()[0];
    const { type, item, counterName } = params;
    const trxId = item.trxId;
    try {
      const stat = type === 'post'
        ? post.getStat(item)
        : comment.getStat(item);
      const countedKey = [
        CounterName.commentLike,
        CounterName.postLike,
      ].includes(counterName) ? 'liked' : 'disliked';
      const value = stat[countedKey] ? -1 : 1;
      const trxContent: ICounterTrxContent = {
        type: TrxType.counter,
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
        ...keyService.getTrxCreateParam(),
      });

      const uniqueCounter: UniqueCounter & { value: 1 | -1 } = {
        trxId: res.trx_id,
        groupId: group.groupId,
        name: counterName,
        objectId: item.trxId,
        userAddress: keyService.state.address,
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
      type: TrxType.groupInfo,
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
      ...keyService.getTrxCreateParam(),
    });
    runInAction(() => {
      state.groupInfo.avatar = info.avatar;
      state.groupInfo.desc = info.desc;
    });
  },
  updateInfo: async () => {
    const item = await GroupInfoApi.get(state.groupId);
    if (!item) { return; }
    runInAction(() => {
      state.groupInfo.avatar = item.avatar;
      state.groupInfo.desc = item.desc;
    });
  },
  join: (seedUrl: string) => {
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
    group.updateInfo();
  },
  savedLoginCheck: async (groupId?: string) => {
    const loginState = getLoginState();
    let logined = false;

    if (loginState && loginState.autoLogin === 'mixin' && loginState.mixinJWT) {
      const result = await VaultApi.getOrCreateAppUser(loginState.mixinJWT);
      if (either.isRight(result)) {
        const { jwt, user, appUser } = result.right;
        keyService.mixinLogin(jwt, user, appUser);
        logined = true;
      } else {
        setLoginState({
          mixinJWT: '',
          autoLogin: null,
        });
      }
    }

    if (loginState && loginState.autoLogin === 'keystore') {
      const loginResult = await keyService.login(loginState.keystore, loginState.password);
      if (either.isLeft(loginResult)) {
        setLoginState({
          keystore: '',
          password: '',
          autoLogin: null,
        });
        return;
      }
      logined = true;
    }

    if (loginState.seedUrl && logined) {
      try {
        const seedUrlGroup = QuorumLightNodeSDK.utils.restoreSeedFromUrl(loginState.seedUrl);
        if (!groupId || seedUrlGroup.group_id === groupId) {
          group.join(loginState.seedUrl);
        }
      } catch (e) {
        console.error(e);
        loginState.seedUrl = '';
        setLoginState(loginState);
      }
    }
  },
};

const socketEventHandler: Partial<SocketEventListeners> = {
  notification: action((v) => {
    state.notification.unreadCount += 1;
    state.notification.list.unshift(v);
    state.notification.offset += 1;
  }),
  trx: (v) => {
    if (v.type === 'post') {
      post.get(v.trxId).then(action((post) => {
        if (post) {
          Array.from(pageStateMap.get('postlist')?.values() ?? []).forEach((_s) => {
            const s = _s as ReturnType<typeof createPostlistState>;
            if (s.mode.type !== 'search' && !s.trxIds.includes(post.trxId)) {
              s.trxIds.unshift(post.trxId);
            }
          });
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
  },
  postEdit: action((v) => {
    const item = state.post.editCache.find((u) => u.trxId === v.post.trxId);
    if (item) {
      state.post.editCache.splice(state.post.editCache.indexOf(item), 1);
      post.get(item.updatedTrxId);
    }
  }),
  postDelete: action((v) => {
    state.post.map.delete(v.deletedTrxId);
  }),
  uniqueCounter: async ({ uniqueCounter }) => {
    if ([CounterName.postLike, CounterName.postDislike].includes(uniqueCounter.name)) {
      await post.get(uniqueCounter.objectId);
    }
    if ([CounterName.commentLike, CounterName.commentDislike].includes(uniqueCounter.name)) {
      await comment.get(uniqueCounter.objectId);
    }

    const items = state.uniqueCounter.cache.filter((u) => u.trxId === uniqueCounter.trxId);
    runInAction(() => {
      items.forEach((item) => {
        const index = state.uniqueCounter.cache.indexOf(item);
        state.uniqueCounter.cache.splice(index);
      });
    });
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
    const postdetailMatch = matchPath('/post/:groupId/:trxId', location.pathname);
    const userprofileMatch = matchPath('/userprofile/:groupId/:userAddress', location.pathname);
    const groupId = postdetailMatch?.params.groupId ?? userprofileMatch?.params.groupId ?? '';

    await group.savedLoginCheck(groupId);
    const detailPageCheck = () => {
      if (!postdetailMatch || !userprofileMatch) { return; }
      if (!state.groupId) {
        runInAction(() => {
          state.groupId = groupId;
        });
      }
      if (postdetailMatch && postdetailMatch.params.trxId) {
        return true;
      }
      if (userprofileMatch && userprofileMatch.params.userAddress) {
        return true;
      }
    };
    if (detailPageCheck() || state.group) {
      runInAction(() => {
        state.showJoin = false;
        state.showMain = true;
      });
    } else {
      runInAction(() => {
        state.showJoin = true;
        state.showMain = false;
      });
    }
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
};
