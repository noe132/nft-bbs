import { IProfile } from './profile';
import { TrxType, TrxStorage } from '../common';

export interface IPostTrxContent {
  type: TrxType
  title: string
  content: string
  updatedTrxId?: string
  deletedTrxId?: string
}

export interface IPost extends IPostTrxContent {
  userAddress: string
  groupId: string
  trxId: string
  storage: TrxStorage
  timestamp: number
  commentCount: number
  likeCount: number
  dislikeCount: number
  hotCount: number
  extra?: IPostExtra
}

export interface IPostExtra {
  userProfile?: IProfile
  liked?: boolean
  disliked?: boolean
}
