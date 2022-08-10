import { TrxStorage, TrxType } from '../common';

export interface IImageTrxContent {
  type: TrxType.image
  mineType: string
  content: string
}

export interface IImage extends Omit<IImageTrxContent, 'content'> {
  trxId: string
  storage: TrxStorage
  content: Blob | null
}
