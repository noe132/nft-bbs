import { taskEither } from 'fp-ts';
import { PostAppendType } from 'rum-port-types';
import * as rumsdk from 'rum-sdk-nodejs';

import { Post, PostAppend } from '~/orm';
import { parseActivityTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handlePostAppend: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as PostAppendType;
    const object = data.object;
    const userAddress = rumsdk.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseActivityTimestamp(data.published, item.TimeStamp);

    const id = object.id;
    const content = object.content;
    const postId = object.inreplyto.id;
    const post = await Post.get({ groupId, id: postId }, transactionManager);
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

    if (await PostAppend.has({ groupId, id }, transactionManager)) {
      return true;
    }

    const postAppendItem = await PostAppend.add({
      id,
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
