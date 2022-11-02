import { CommentType } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';

import { Post, Comment, Notification, ImageFile } from '~/orm';
import { send } from '~/service/socket';
import { parseQuorumTimestamp } from '~/utils';


export const handleComment = async (item: IContent, transactionManager: EntityManager, queueSocket: typeof send) => {
  const data = item.Data as CommentType;
  const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
  const groupId = item.GroupId;
  const trxId = item.TrxId;
  const timestamp = parseQuorumTimestamp(item.TimeStamp);

  const parentComment = await Comment.get({ groupId, trxId: data.inreplyto.trxid }, transactionManager);
  const postId = parentComment?.postId ?? data.inreplyto.trxid;
  const threadId = parentComment?.threadId || parentComment?.trxId || '';
  const replyId = parentComment?.threadId
    ? data.inreplyto.trxid
    : '';

  const [comment, post, threadComment, replyComment] = await Promise.all([
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
    Post.get({ groupId, trxId: postId }, transactionManager),
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

  if (!post) {
    pollingLog.warn({
      message: `no post ${postId} found for comment ${trxId}`,
      data: item.Data,
    });
    return;
  }

  post.commentCount += 1;
  if (threadComment) {
    threadComment.commentCount += 1;
  }

  await Promise.all([
    Post.save(post, transactionManager),
    threadComment && Comment.save(threadComment, transactionManager),
  ]);

  const notifications: Array<Notification> = [];

  const replyToPost = postId === data.inreplyto.trxid;
  if (replyToPost && post.userAddress !== userAddress) {
    notifications.push({
      groupId,
      status: 'unread',
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
      status: 'unread',
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
      status: 'unread',
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
};
