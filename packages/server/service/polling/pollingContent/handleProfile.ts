import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { Profile } from '~/orm';
import { broadcast } from '~/service/socket';

export const handleProfile = async (item: IContent, transactionManager: EntityManager) => {
  const trxContent = Profile.parseTrxContent(item);
  if (!trxContent) {
    pollingLog.info(`profile ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }
  const profile: Profile = {
    ...trxContent,
    trxId: item.TrxId,
    userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
    groupId: item.GroupId,
  };
  await Profile.add(profile, transactionManager);
  broadcast('trx', { trxId: profile.trxId, type: 'profile' });
};
