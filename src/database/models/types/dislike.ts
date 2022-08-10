
import { TrxType, TrxStorage } from '../common';

export interface IDiscounterTrxContent {
  type: TrxType.discounter
  value: number
  objectId: string
}

export interface IDiscounter extends IDiscounterTrxContent {
  userAddress: string
  groupId: string
  trxId: string
  storage: TrxStorage
}
