import { taskEither } from 'fp-ts';
import { ImageType } from 'nft-bbs-types';
import QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { ImageFile } from '~/orm';
import { parseQuorumTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handleImage: TrxHandler = (item, groupStatus, transactionManager, _queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as ImageType;
    const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
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

    return true;
  },
  (e) => e as Error,
)();
