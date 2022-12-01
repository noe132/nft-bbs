import { taskEither } from 'fp-ts';
import { ProfileType } from 'nft-bbs-types';
import * as QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { Profile } from '~/orm';
import { parseQuorumTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handleProfile: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as ProfileType;
    const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
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
    return true;
  },
  (e) => e as Error,
)();
