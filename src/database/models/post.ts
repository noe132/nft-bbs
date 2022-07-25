
import { IContent } from 'quorum-light-node-sdk';
import { keyBy } from 'lodash-es';
import { getDatabase } from '../init';
import { IPost, CounterName, IPostTrxContent } from './types';
import * as UniqueCounterModel from './uniqueCounter';
import * as ProfileModel from './profile';
import { Collection } from 'dexie';

export const getTrxContent = (content: IContent) => JSON.parse(content.Data.content) as IPostTrxContent;

export const DEFAULT_POST_SUMMARY = {
  hotCount: 0,
  commentCount: 0,
  likeCount: 0,
  dislikeCount: 0,
};

export const create = async (post: IPost) => {
  const db = getDatabase();
  await db.posts.add(post);
};

export const bulkAdd = async (posts: IPost[]) => {
  const db = getDatabase();
  await db.posts.bulkAdd(posts);
};

export const bulkPut = async (posts: IPost[]) => {
  const db = getDatabase();
  await db.posts.bulkPut(posts);
};

export const bulkGet = async (trxIds: string[], options?: {
  currentUserAddress?: string
}) => {
  const db = getDatabase();
  const posts = await db.posts.where('trxId').anyOf(trxIds).toArray();
  return packPosts(posts, {
    currentUserAddress: options ? options.currentUserAddress : '',
  });
};

export const list = async (
  options: {
    searchText?: string
    publisherUserAddress?: string
    currentUserAddress?: string
  },
) => {
  const db = getDatabase();
  const { searchText, publisherUserAddress } = options;
  let collection: Collection<IPost, number>;
  collection = publisherUserAddress
    ? db.posts.where({ userAddress: publisherUserAddress })
    : db.posts.toCollection();
  collection = searchText
    ? collection.filter((p) => new RegExp(searchText || '', 'i').test(p.content))
    : collection;
  const posts = await collection.reverse().sortBy('timestamp');
  return packPosts(posts, {
    currentUserAddress: options.currentUserAddress,
  });
};

const packPosts = async (_posts: IPost[], options: {
  currentUserAddress?: string
}) => {
  let posts = _posts;
  if (options.currentUserAddress) {
    const likedMap = await getCounterMap({
      counterName: CounterName.postLike,
      userAddress: options.currentUserAddress,
      posts,
    });
    const dislikedMap = await getCounterMap({
      counterName: CounterName.postDislike,
      userAddress: options.currentUserAddress,
      posts,
    });
    posts = posts.map((post) => {
      post.extra = post.extra || {};
      post.extra.liked = !!likedMap[post.trxId];
      post.extra.disliked = !!dislikedMap[post.trxId];
      return post;
    });
  }

  const profiles = await ProfileModel.bulkGet(posts.map((post) => ({
    groupId: post.groupId,
    userAddress: post.userAddress,
  })));
  const profileMap = keyBy(profiles, 'userAddress');
  posts = posts.map((post) => {
    post.extra = post.extra || {};
    post.extra.userProfile = profileMap[post.userAddress];
    return post;
  });
  return posts;
};

const getCounterMap = async (p: {
  counterName: CounterName
  userAddress: string
  posts: IPost[]
}) => {
  const counters = await UniqueCounterModel.bulkGet(p.posts.map((post) => ({
    name: p.counterName,
    objectId: post.trxId,
    userAddress: p.userAddress,
  })));
  return keyBy(counters, (dislike) => dislike.objectId);
};
