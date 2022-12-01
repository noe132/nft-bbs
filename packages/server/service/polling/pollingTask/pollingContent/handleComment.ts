import { taskEither } from 'fp-ts';
import { CommentType } from 'nft-bbs-types';
import * as QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';

import { Post, Comment, Notification, ImageFile } from '~/orm';
import { parseQuorumTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handleComment: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as CommentType;
    const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseQuorumTimestamp(item.TimeStamp);

    const parentComment = await Comment.get({ groupId, trxId: data.inreplyto.trxid }, transactionManager);
    const postId = parentComment?.postId ?? data.inreplyto.trxid;
    const threadId = parentComment?.threadId || parentComment?.trxId || '';
    const replyId = parentComment?.threadId
      ? data.inreplyto.trxid
      : '';

    const post = await Post.get({ groupId, trxId: postId }, transactionManager);
    if (!post) {
      // pollingLog.warn({
      //   message: `no post ${postId} found for comment ${trxId}`,
      //   data: item.Data,
      // });
      return false;
    }

    const [comment, threadComment, replyComment] = await Promise.all([
      Comment.add({
        trxId,
        groupId,
        content: data.content,
        postId,
        threadId,
        replyId,
        userAddress,
        timestamp,
        commentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
      }, transactionManager),
      !threadId ? null : Comment.get({ groupId, trxId: threadId }, transactionManager),
      !replyId ? null : Comment.get({ groupId, trxId: replyId }, transactionManager),
      ...data.image
        ? data.image.map((img) => ImageFile.add({
          groupId,
          trxId,
          content: img.content,
          mineType: img.mediaType,
          name: img.name,
          timestamp,
          userAddress,
        }, transactionManager))
        : [],
    ]);

    queueSocket({
      groupId,
      broadcast: true,
      event: 'comment',
      data: { trxId },
    });

    post.commentCount += 1;
    if (comment.userAddress !== post.userAddress) {
      post.nonAuthorCommentCount += 1;
    }
    if (threadComment) {
      threadComment.commentCount += 1;
    }

    post.hot = Post.getHot(post);

    await Promise.all([
      Post.save(post, transactionManager),
      threadComment && Comment.save(threadComment, transactionManager),
    ]);

    const notifications: Array<Notification> = [];

    const replyToPost = postId === data.inreplyto.trxid;
    if (replyToPost && post.userAddress !== userAddress) {
      notifications.push({
        groupId,
        status: groupStatus.loaded ? 'unread' : 'read',
        type: 'comment',
        objectId: postId,
        objectType: 'post',
        actionObjectId: comment.trxId,
        actionObjectType: 'comment',
        to: post.userAddress,
        from: userAddress,
        timestamp,
      });
    }

    if (threadComment && threadComment.userAddress !== userAddress) {
      notifications.push({
        groupId,
        status: groupStatus.loaded ? 'unread' : 'read',
        type: 'comment',
        objectId: threadComment.trxId,
        objectType: 'comment',
        actionObjectId: comment.trxId,
        actionObjectType: 'comment',
        to: threadComment.userAddress,
        from: userAddress,
        timestamp,
      });
    }

    if (
      replyComment
      && replyComment.userAddress !== threadComment?.userAddress
      && replyComment.userAddress !== userAddress
    ) {
      notifications.push({
        groupId,
        status: groupStatus.loaded ? 'unread' : 'read',
        type: 'comment',
        objectId: replyComment.trxId,
        objectType: 'comment',
        actionObjectId: comment.trxId,
        actionObjectType: 'comment',
        to: replyComment.userAddress,
        from: userAddress,
        timestamp,
      });
    }

    await Notification.bulkAdd(notifications, transactionManager);
    for (const item of notifications) {
      const notification = await Notification.appendExtra(item, transactionManager);
      queueSocket({
        userAddress: notification.to,
        event: 'notification',
        groupId,
        data: notification,
      });
    }

    return true;
  },
  (e) => e as Error,
)();
