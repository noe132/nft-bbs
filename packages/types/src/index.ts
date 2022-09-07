import { intersection, number, partial, string, type, TypeOf } from 'io-ts';
import { enumType } from './enum';

export * from './enum';

export const nftbbsAppKeyName = 'group_nftbbs';

export enum TrxStorage {
  cache = 'cache',
  chain = 'chain',
}

export enum TrxStatus {
  replaced = 'replaced',
  normal = 'normal',
  deleted = 'deleted',
}

export enum TrxType {
  post = 'post',
  comment = 'comment',
  profile = 'profile',
  counter = 'counter',
  discounter = 'discounter',
  image = 'image',
  groupInfo = 'group_info',
}

export enum CounterName {
  postLike = 'postLike',
  postDislike = 'postDislike',
  commentLike = 'commentLike',
  commentDislike = 'commentDislike',
}

export const postTrxContent = intersection([
  type({
    type: enumType<TrxType.post>(TrxType, 'TrxType'),
    title: string,
    content: string,
  }),
  partial({
    updatedTrxId: string,
    deletedTrxId: string,
  }),
]);
export type IPostTrxContent = TypeOf<typeof postTrxContent>;

export const commentTrxContent = intersection([
  type({
    type: enumType<TrxType.comment>(TrxType, 'TrxType'),
    content: string,
    objectId: string,
    threadId: string,
    replyId: string,
  }),
  partial({
    updatedTrxId: string,
    deletedTrxId: string,
  }),
]);
export type ICommentTrxContent = TypeOf<typeof commentTrxContent>;

export const counterTrxContent = type({
  type: enumType<TrxType.counter>(TrxType, 'TrxType'),
  name: enumType<CounterName>(CounterName, 'CounterName'),
  value: number,
  objectId: string,
});
export type ICounterTrxContent = TypeOf<typeof counterTrxContent>;

export const groupInfoTrxContent = type({
  type: enumType<TrxType.groupInfo>(TrxType, 'TrxType'),
  avatar: string,
  desc: string,
});
export type IGroupInfoTrxContent = TypeOf<typeof groupInfoTrxContent>;

export const imageTrxContent = type({
  type: enumType<TrxType.image>(TrxType, 'TrxType'),
  mineType: string,
  content: string,
});
export type IImageTrxContent = TypeOf<typeof imageTrxContent>;

export const profileTrxContent = type({
  type: enumType<TrxType.profile>(TrxType, 'TrxType'),
  name: string,
  avatar: string,
  intro: string,
});
export type IProfileTrxContent = TypeOf<typeof profileTrxContent>;

export const uniqueCounter = type({
  type: enumType<TrxType.counter>(TrxType, 'TrxType'),
  name: enumType<CounterName>(CounterName, 'CounterName'),
  objectId: string,
  userAddress: string,
});
export type IUniqueCounter = TypeOf<typeof uniqueCounter>;
