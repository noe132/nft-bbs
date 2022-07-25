import { IProfile } from './profile';
import { TrxType, TrxStorage, TrxStatus } from '../common';

export interface IPostTrxContent {
  type: TrxType.post
  title: string
  content: string
}

export interface IPost extends IPostTrxContent {
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
  extra?: IPostExtra
}

export interface IPostExtra {
  userProfile?: IProfile
  liked?: boolean
  disliked?: boolean
}
