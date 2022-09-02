
import { TrxType } from '../common';

export enum CounterName {
  postLike = 'postLike',
  postDislike = 'postDislike',
  commentLike = 'commentLike',
  commentDislike = 'commentDislike',
}

export interface ICounterTrxContent {
  type: TrxType
  name: CounterName
  value: number
  objectId: string
}

export interface ICounter {
  trxId: string
}
