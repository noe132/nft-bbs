import { intersection, literal, number, partial, string, type, TypeOf, union } from 'io-ts';

export enum TrxStorage {
  cache = 'cache',
  chain = 'chain',
}

export enum TrxStatus {
  replaced = 'replaced',
  normal = 'normal',
  deleted = 'deleted',
}

export type TrxType = 'post'
| 'comment'
| 'profile'
| 'counter'
| 'discounter'
| 'image'
| 'group_info';

export const counterName = union([
  literal('postLike'),
  literal('postDislike'),
  literal('commentLike'),
  literal('commentDislike'),
]);
export type CounterName = TypeOf<typeof counterName>;

export const postTrxContent = intersection([
  type({
    type: literal('post'),
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
    type: literal('comment'),
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
  type: literal('counter'),
  // name: enumType<CounterName>(CounterName, 'CounterName'),
  name: union([
    literal('postLike'),
    literal('postDislike'),
    literal('commentLike'),
    literal('commentDislike'),
  ]),
  value: number,
  objectId: string,
});
export type ICounterTrxContent = TypeOf<typeof counterTrxContent>;

export const groupInfoTrxContent = type({
  type: literal('groupInfo'),
  avatar: string,
  desc: string,
});
export type IGroupInfoTrxContent = TypeOf<typeof groupInfoTrxContent>;

export const imageTrxContent = type({
  type: literal('image'),
  mineType: string,
  content: string,
});
export type IImageTrxContent = TypeOf<typeof imageTrxContent>;

export const profileTrxContent = type({
  type: literal('profile'),
  name: string,
  avatar: string,
  intro: string,
});
export type IProfileTrxContent = TypeOf<typeof profileTrxContent>;

export const uniqueCounter = type({
  type: counterName,
  objectId: string,
  userAddress: string,
});
export type IUniqueCounter = TypeOf<typeof uniqueCounter>;
