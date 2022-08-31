import { IContent } from 'quorum-light-node-sdk-nodejs';
import { GroupInfo } from '~/orm/entity/groupInfo';
import { broadcast } from '~/service/socket';

export const handleGroupInfo = async (item: IContent, groupId: string) => {
  const trxContent = GroupInfo.parseTrxContent(item);
  if (!trxContent) {
    pollingLog.info(`groupInfo ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }

  await GroupInfo.add({
    ...trxContent,
    trxId: item.TrxId,
    groupId,
    timestamp: item.TimeStamp / 1000000,
  });
  broadcast('trx', { trxId: item.TrxId, type: 'groupInfo' });
};
