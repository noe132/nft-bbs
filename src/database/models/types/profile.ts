
import { TrxType } from '../common';

export interface IProfileTrxContent {
  type: TrxType.profile
  name: string
  avatar: string
  intro: string
}

export interface IProfile extends IProfileTrxContent {
  userAddress: string
  groupId: string
}
