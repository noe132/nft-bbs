import { ImageType } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { ImageFile } from '~/orm';
import { send } from '~/service/socket';
import { parseQuorumTimestamp } from '~/utils';

export const handleImage = async (
  item: IContent,
  transactionManager: EntityManager,
  _queueSocket: typeof send,
) => {
  const data = item.Data as ImageType;
  const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
  const groupId = item.GroupId;
  const trxId = item.TrxId;
  const timestamp = parseQuorumTimestamp(item.TimeStamp);

  await Promise.all(data.image.map((v) => ImageFile.add({
    name: v.name || '',
    content: v.content,
    mineType: v.mediaType,
    groupId,
    trxId,
    userAddress,
    timestamp,
  }, transactionManager)));
};
