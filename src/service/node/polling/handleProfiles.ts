import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk';
import { ProfileModel } from '~/database';

export const handleProfiles = async (items: IContent[] = []) => {
  if (items.length === 0) {
    return;
  }

  const profilesToPut = items.map((item) => ({
    ...ProfileModel.getTrxContent(item),
    userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
    groupId: item.GroupId,
  }));

  await ProfileModel.bulkPut(profilesToPut);
};
