import { taskEither } from 'fp-ts';
import { PostAppendType } from 'nft-bbs-types';
import * as QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';

import { Post } from '~/orm';
import { PostAppend } from '~/orm/entity/postAppend';
import { parseQuorumTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handlePostAppend: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as any as PostAppendType;
    const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseQuorumTimestamp(item.TimeStamp);

    const content = data.content;
    const postId = data.attributedTo[0].id;
    const post = await Post.get({ groupId, trxId: postId }, transactionManager);
    if (!post) {
      // pollingLog.warn({
      //   message: `no post ${postId} found for post append ${trxId}`,
      //   data: item.Data,
      // });
      return false;
    }

    if (post.userAddress !== userAddress) {
      // invalid append operation
      return true;
    }

    const postAppendItem = await PostAppend.add({
      trxId,
      content,
      groupId,
      postId,
      timestamp,
    }, transactionManager);

    queueSocket({
      groupId,
      broadcast: true,
      event: 'postAppend',
      data: postAppendItem,
    });

    return true;
  },
  (e) => e as Error,
)();
