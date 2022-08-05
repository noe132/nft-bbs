import { IContent } from 'quorum-light-node-sdk';
import b64toBlob from 'b64-to-blob';
import { ImageModel, TrxStorage, TrxType } from '~/database';

export const handleImages = async (items: IContent[] = []) => {
  if (items.length === 0) { return; }

  const existImages = await ImageModel.bulkGet(items.map((item) => item.TrxId));
  const existTrxIds = existImages.map((item) => item.trxId);
  const itemsToAdd = items.filter((item) => !existTrxIds.includes(item.TrxId));
  await ImageModel.bulkAdd(itemsToAdd.map((item) => {
    const trxContent = ImageModel.getTrxContent(item);
    let content: Blob | null = null;
    try {
      content = b64toBlob(trxContent.content, trxContent.mineType);
    } catch (e) {
      // console.error(e);
    }
    return {
      trxId: item.TrxId,
      content,
      mineType: trxContent.mineType,
      type: TrxType.image,
      storage: TrxStorage.cache,
    };
  }));
  const imagesToPut = existImages.map((item) => ({
    ...item,
    storage: TrxStorage.chain,
  }));
  await ImageModel.bulkPut(imagesToPut);
};
