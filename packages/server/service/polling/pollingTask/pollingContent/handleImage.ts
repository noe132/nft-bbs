import { taskEither } from 'fp-ts';
import { ImageActivityType } from 'nft-bbs-types';
import * as rumsdk from 'rum-sdk-nodejs';
import { ImageFile } from '~/orm';
import { parseQuorumTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handleImage: TrxHandler = (item, groupStatus, transactionManager, _queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as ImageActivityType;
    const object = data.object;
    const userAddress = rumsdk.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseQuorumTimestamp(item.TimeStamp);

    if (await ImageFile.has({ groupId, id: object.id }, transactionManager)) {
      // pollingLog.warn({
      //   message: `image ${object.id} already existed`,
      //   data: item.Data,
      // });
      return true;
    }

    await ImageFile.add({
      id: object.id,
      content: object.content,
      mineType: object.mediaType,
      groupId,
      trxId,
      userAddress,
      timestamp,
    }, transactionManager);

    return true;
  },
  (e) => e as Error,
)();
