import { taskEither } from 'fp-ts';
import { PostType } from 'nft-bbs-types';
import * as rumsdk from 'rum-sdk-nodejs';
import { Post } from '~/orm';
import { AttachedImage } from '~/orm/entity/attachedImage';
import { parseQuorumTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handlePost: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as PostType;
    const object = data.object;
    const userAddress = rumsdk.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseQuorumTimestamp(item.TimeStamp);

    const images = !object.image ? [] : [object.image].flatMap((v) => v);

    if (await Post.has({ groupId, id: object.id }, transactionManager)) {
      // pollingLog.warn({
      //   message: `post ${postId} already existed`,
      //   data: item.Data,
      // });
      return true;
    }

    await Promise.all([
      Post.add({
        id: object.id,
        groupId,
        trxId,
        title: object.name ?? '',
        content: object.content,
        userAddress,
        timestamp,
        commentCount: 0,
        nonAuthorCommentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        hot: 0,
      }, transactionManager),
      ...images.map((v) => AttachedImage.add({
        groupId,
        objectId: object.id,
        content: v.content,
        mineType: v.mediaType,
      })),
    ]);

    queueSocket({
      broadcast: true,
      event: 'post',
      groupId,
      data: { id: object.id },
    });

    return true;
  },
  (e) => e as Error,
)();
