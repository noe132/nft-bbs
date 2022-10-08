import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { Profile } from '~/orm';
import { send } from '~/service/socket';

export const handleProfile = async (
  item: IContent,
  transactionManager: EntityManager,
  queueSocket: typeof send,
) => {
  const trxContent = Profile.parseTrxContent(item);
  const groupId = item.GroupId;
  if (!trxContent) {
    pollingLog.info(`profile ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }
  const profile: Profile = {
    ...trxContent,
    trxId: item.TrxId,
    userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
    groupId,
  };
  await Profile.add(profile, transactionManager);
  queueSocket({
    broadcast: true,
    event: 'trx',
    groupId,
    data: { trxId: profile.trxId, type: 'profile' },
  });
};
