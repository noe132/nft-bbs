import { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { ImageFile } from '~/orm';
import { send } from '~/service/socket';

export const handleImage = async (
  item: IContent,
  transactionManager: EntityManager,
  _queueSocket: typeof send,
) => {
  const trxContent = ImageFile.parseTrxContent(item);
  if (!trxContent) {
    pollingLog.info(`imageFile ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }

  await ImageFile.add({
    ...trxContent,
    groupId: item.GroupId,
    trxId: item.TrxId,
    timestamp: item.TimeStamp / 1000000,
  }, transactionManager);
};
