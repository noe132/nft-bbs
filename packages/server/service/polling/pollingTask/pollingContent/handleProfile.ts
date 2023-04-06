import { taskEither } from 'fp-ts';
import { ProfileType } from 'rum-port-types';
import * as rumsdk from 'rum-sdk-nodejs';
import { Profile } from '~/orm';
import { parseActivityTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handleProfile: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as ProfileType;
    const object = data.object;
    const userAddress = rumsdk.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseActivityTimestamp(data.published, item.TimeStamp);

    const userAddr = rumsdk.utils.pubkeyToAddress(item.SenderPubkey);

    if (userAddr !== object.describes.id) {
      // can only submit profile for publisher
      return true;
    }

    const images = !object.image ? [] : [object.image].flatMap((v) => v);
    const avatar = images.at(0);

    const profile = await Profile.add({
      groupId,
      trxId,
      userAddress,
      name: object.name,
      avatar: avatar
        ? `data:${avatar.mediaType};base64,${avatar.content}`
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
