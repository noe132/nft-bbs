import { taskEither } from 'fp-ts';
import { PostDeleteType } from 'nft-bbs-types';
import QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { Post } from '~/orm';
import { TrxHandler } from './helper';

export const handlePostDelete: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as PostDeleteType;
    const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;

    const post = await Post.get({
      groupId,
      trxId: data.id,
    }, transactionManager);

    if (post && post.userAddress === userAddress) {
      await Post.delete({
        groupId,
        trxId: data.id,
      }, transactionManager);
    }

    queueSocket({
      broadcast: true,
      event: 'postDelete',
      groupId,
      data: { trxId },
    });

    return true;
  },
  (e) => e as Error,
)();
