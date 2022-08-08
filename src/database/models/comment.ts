import { IContent } from 'quorum-light-node-sdk';
import { keyBy } from 'lodash-es';
import { IComment, CounterName, ICommentTrxContent } from './types';
import { getDatabase } from '../init';
import * as UniqueCounterModel from './uniqueCounter';
import * as ProfileModel from './profile';
import { TrxType } from './common';

export const getTrxContent = (content: IContent) => JSON.parse(content.Data.content) as ICommentTrxContent;

export const DEFAULT_POST_SUMMARY = {
  hotCount: 0,
  commentCount: 0,
  likeCount: 0,
  dislikeCount: 0,
};

export const create = async (comment: IComment) => {
  const db = getDatabase();
  await db.comments.add(comment);
};

export const bulkAdd = async (comments: IComment[]) => {
  // console.trace('add');
  // console.log(comments);
  const db = getDatabase();
  await db.comments.bulkAdd(comments);
};

export const bulkPut = async (comments: IComment[]) => {
  const db = getDatabase();
  await db.comments.bulkPut(comments);
};

export const bulkGet = async (trxIds: string[], options?: {
  currentUserAddress?: string
}) => {
  const db = getDatabase();
  const comments = await db.comments.where('trxId').anyOf(trxIds).toArray();
  if (options) {
    return packComments(comments, {
      currentUserAddress: options.currentUserAddress,
    });
  }
  return comments;
};

export const getUserFirstComment = async (userAddress: string) => {
  const db = getDatabase();
  const comments = await db.comments.where({ userAddress }).sortBy('timestamp');
  if (!comments.length) { return null; }
  const packedPosts = await packComments([comments[0]], { currentUserAddress: '' });
  return packedPosts[0];
};

export const list = async (
  options: {
    objectId: string
    currentUserAddress?: string
  },
) => {
  const db = getDatabase();
  const comments = await db.comments.where({
    objectId: options.objectId,
  }).sortBy('timestamp');
  return packComments(comments, {
    currentUserAddress: options.currentUserAddress,
  });
};

const packComments = async (_comments: IComment[], options: {
  currentUserAddress?: string
}) => {
  let comments = _comments;
  if (options.currentUserAddress) {
    const likedMap = await getCounterMap({
      counterName: CounterName.commentLike,
      userAddress: options.currentUserAddress,
      comments,
    });
    const dislikedMap = await getCounterMap({
      counterName: CounterName.commentDislike,
      userAddress: options.currentUserAddress,
      comments,
    });
    comments = comments.map((comment) => {
      comment.extra = comment.extra || {};
      comment.extra.liked = !!likedMap[comment.trxId];
      comment.extra.disliked = !!dislikedMap[comment.trxId];
      return comment;
    });
  }

  const map = keyBy(comments, 'trxId');
  comments = comments.map((comment) => {
    if (comment.replyId) {
      comment.extra = comment.extra || {};
      comment.extra.replyComment = map[comment.replyId];
    }
    return comment;
  });

  const profiles = await ProfileModel.bulkGet(comments.map((comment) => ({
    groupId: comment.groupId,
    userAddress: comment.userAddress,
  })));
  const profileMap = keyBy(profiles, 'userAddress');
  comments = comments.map((comment) => {
    comment.extra = comment.extra || {};
    comment.extra.userProfile = profileMap[comment.userAddress] ?? {
      type: TrxType.profile,
      userAddress: comment.userAddress,
      name: '',
      avatar: '',
      intro: '',
      groupId: '',
    };
    return comment;
  });
  return comments;
};

const getCounterMap = async (p: {
  counterName: CounterName
  userAddress: string
  comments: IComment[]
}) => {
  const counters = await UniqueCounterModel.bulkGet(p.comments.map((comment) => ({
    name: p.counterName,
    objectId: comment.trxId,
    userAddress: p.userAddress,
  })));
  return keyBy(counters, (dislike) => dislike.objectId);
};
