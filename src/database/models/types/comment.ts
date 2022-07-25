import { IProfile } from './profile';
import { TrxType, TrxStorage, TrxStatus } from '../common';

export interface ICommentTrxContent {
  type: TrxType.comment
  content: string
  objectId: string
  threadId: string
  replyId: string
}

export interface IComment extends ICommentTrxContent {
  userAddress: string
  groupId: string
  trxId: string
  storage: TrxStorage
  status: TrxStatus
  latestId: string
  timestamp: number
  summary: {
    commentCount: number
    likeCount: number
    dislikeCount: number
    hotCount: number
  }
  extra?: ICommentExtra
}

export interface ICommentExtra {
  userProfile?: IProfile
  liked?: boolean
  disliked?: boolean
  replyComment?: IComment
}
