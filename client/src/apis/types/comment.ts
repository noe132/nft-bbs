import { IProfile } from './profile';
import { TrxType, TrxStorage } from '../common';

export interface ICommentTrxContent {
  type: TrxType
  content: string
  objectId: string
  threadId: string
  replyId: string
  updatedTrxId?: string
  deletedTrxId?: string
}

export interface IComment extends ICommentTrxContent {
  userAddress: string
  groupId: string
  trxId: string
  storage: TrxStorage
  timestamp: number
  commentCount: number
  likeCount: number
  dislikeCount: number
  hotCount: number
  extra?: ICommentExtra
}

export interface ICommentExtra {
  userProfile?: IProfile
  liked?: boolean
  disliked?: boolean
  replyComment?: IComment
}
