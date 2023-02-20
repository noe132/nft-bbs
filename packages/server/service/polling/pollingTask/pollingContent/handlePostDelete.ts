import { taskEither } from 'fp-ts';
import { PostDeleteType } from 'nft-bbs-types';
import * as rumsdk from 'rum-sdk-nodejs';
import { Post, ObjectHistory } from '~/orm';
import { parseQuorumTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handlePostDelete: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as PostDeleteType;
    const object = data.object;
    const userAddress = rumsdk.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseQuorumTimestamp(item.TimeStamp);

    const post = await Post.get({
      groupId,
      id: object.id,
    }, transactionManager);

    if (post && post.userAddress === userAddress) {
      await Promise.all([
        Post.delete({
          groupId,
          id: object.id,
        }, transactionManager),
        ObjectHistory.add({
          groupId,
          trxId,
          objectId: object.id,
          objectType: 'post',
          timestamp,
          type: 'delete',
          content: '',
        }, transactionManager),
      ]);
    }

    queueSocket({
      broadcast: true,
      event: 'postDelete',
      groupId,
      data: { id: object.id },
    });

    return true;
  },
  (e) => e as Error,
)();
