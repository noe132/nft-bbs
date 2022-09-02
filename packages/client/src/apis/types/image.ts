
import { TrxType } from '../common';

export interface IImageTrxContent {
  type: TrxType
  mineType: string
  content: string
}

export interface IImage extends IImageTrxContent {
  trxId: string
}
