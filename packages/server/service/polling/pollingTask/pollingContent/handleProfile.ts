import { taskEither } from 'fp-ts';
import { ProfileType } from 'nft-bbs-types';
import * as rumsdk from 'rum-sdk-nodejs';
import { Profile } from '~/orm';
import { parseQuorumTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handleProfile: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as ProfileType;
    const object = data.object;
    const userAddress = rumsdk.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseQuorumTimestamp(item.TimeStamp);

    const profile = await Profile.add({
      groupId,
      trxId,
      userAddress,
      name: object.name,
      avatar: object.avatar
        ? `data:${object.avatar.mediaType};base64,${object.avatar.content}`
        : '',
      wallet: object.wallet ? JSON.stringify(object.wallet) : '',
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
