import { ProfileType } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { Profile } from '~/orm';
import { send } from '~/service/socket';
import {parseQuorumTimestamp } from '~/utils';

export const handleProfile = async (
  item: IContent,
  transactionManager: EntityManager,
  queueSocket: typeof send,
) => {
  const data = item.Data as ProfileType;
  const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
  const groupId = item.GroupId;
  const trxId = item.TrxId;
  const timestamp = parseQuorumTimestamp(item.TimeStamp);

  const profile = await Profile.add({
    groupId,
    trxId,
    userAddress,
    name: data.name,
    avatar: data.image
      ? `data:${data.image.mediaType};base64,${data.image.content}`
      : '',
    timestamp,
  }, transactionManager);

  queueSocket({
    broadcast: true,
    event: 'profile',
    groupId,
    data: profile,
  });
};
