import { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { GroupInfo } from '~/orm/entity';
import { send } from '~/service/socket';
import { parseQuorumTimestamp } from '~/utils';

export const handleGroupInfo = async (
  item: IContent,
  transactionManager: EntityManager,
  queueSocket: typeof send,
) => {
  const trxContent = GroupInfo.parseTrxContent(item);
  const groupId = item.GroupId;
  if (!trxContent) {
    pollingLog.info(`groupInfo ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }

  await GroupInfo.add({
    ...trxContent,
    trxId: item.TrxId,
    groupId,
    timestamp: parseQuorumTimestamp(item.TimeStamp),
  }, transactionManager);
  queueSocket({
    broadcast: true,
    event: 'trx',
    groupId,
    data: { trxId: item.TrxId, type: 'groupInfo' },
  });
};
