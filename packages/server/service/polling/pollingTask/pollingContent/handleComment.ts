import { taskEither } from 'fp-ts';
import { CommentType } from 'rum-port-types';
import * as rumsdk from 'rum-sdk-nodejs';

import { Post, Comment, Notification } from '~/orm';
import { AttachedImage } from '~/orm/entity/attachedImage';
import { parseActivityTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handleComment: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as CommentType;
    const object = data.object;
    const userAddress = rumsdk.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const trxId = item.TrxId;
    const timestamp = parseActivityTimestamp(data.published, item.TimeStamp);
    const inreplytoId = object.inreplyto.id;

    if (await Comment.has({ groupId, id: object.id }, transactionManager)) {
      // pollingLog.warn({
      //   message: `comment ${postId} already existed`,
      //   data: item.Data,
      // });
      return true;
    }

    const parentComment = await Comment.get({ groupId, id: inreplytoId }, transactionManager);
    const postId = parentComment?.postId ?? inreplytoId;
    const threadId = parentComment?.threadId || parentComment?.id || '';
    const replyId = parentComment?.threadId ? inreplytoId : '';

    const post = await Post.get({ groupId, id: postId }, transactionManager);
    if (!post) {
      // pollingLog.warn({
      //   message: `no post ${postId} found for comment ${trxId}`,
      //   data: item.Data,
      // });
      return false;
    }

    const images = !object.image ? [] : [object.image].flatMap((v) => v);

    const [comment, threadComment, replyComment] = await Promise.all([
      Comment.add({
        groupId,
        id: object.id,
        trxId,
        content: object.content,
        postId,
        threadId,
        replyId,
        userAddress,
        timestamp,
        commentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
      }, transactionManager),
      !threadId ? null : Comment.get({ groupId, id: threadId }, transactionManager),
      !replyId ? null : Comment.get({ groupId, id: replyId }, transactionManager),
      ...images.map((img) => AttachedImage.add({
        groupId,
        objectId: object.id,
        content: img.content,
        mineType: img.mediaType,
      }, transactionManager)),
    ]);

    queueSocket({
      groupId,
      broadcast: true,
      event: 'comment',
      data: { id: object.id },
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

    const replyToPost = postId === inreplytoId;
    if (replyToPost && post.userAddress !== userAddress) {
      notifications.push({
        groupId,
        status: groupStatus.loaded ? 'unread' : 'read',
        type: 'comment',
        objectId: postId,
        objectType: 'post',
        actionObjectId: comment.id,
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
        objectId: threadComment.id,
        objectType: 'comment',
        actionObjectId: comment.id,
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
        objectId: replyComment.id,
        objectType: 'comment',
        actionObjectId: comment.id,
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
