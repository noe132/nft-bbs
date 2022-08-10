import { TrxStorage, TrxType } from '../common';

export interface IGroupInfoTrxContent {
  type: TrxType.groupInfo
  avatar: string
  desc: string
}

export interface IGroupInfo extends IGroupInfoTrxContent {
  trxId: string
  storage: TrxStorage
  groupId: string
  timestamp: number
}
