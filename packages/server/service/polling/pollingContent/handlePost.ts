import { taskEither } from 'fp-ts';
import { PostType } from 'nft-bbs-types';
import QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { Post } from '~/orm';
import { parseQuorumTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handlePost: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as PostType;
    const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseQuorumTimestamp(item.TimeStamp);

    await Post.add({
      trxId,
      groupId,
      title: data.name,
      content: data.content,
      userAddress,
      timestamp,
      commentCount: 0,
      likeCount: 0,
      dislikeCount: 0,
      hot: 0,
    }, transactionManager);

    queueSocket({
      broadcast: true,
      event: 'post',
      groupId,
      data: { trxId },
    });

    return true;
  },
  (e) => e as Error,
)();
