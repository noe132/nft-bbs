import { TrxStorage } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { Post, Comment, Notification, UniqueCounter } from '~/orm';
import { send } from '~/service/socket';
import { parseQuorumTimestamp } from '~/utils';

export const handleComment = async (
  item: IContent,
  transactionManager: EntityManager,
  queueSocket: typeof send,
) => {
  const groupId = item.GroupId;
  const trxContent = Comment.parseTrxContent(item);
  if (!trxContent) {
    pollingLog.info(`$1 ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }
  const comment: Comment = {
    ...trxContent,
    userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
    groupId,
    trxId: item.TrxId,
    storage: TrxStorage.chain,
    commentCount: 0,
    dislikeCount: 0,
    hotCount: 0,
    likeCount: 0,
    timestamp: parseQuorumTimestamp(item.TimeStamp),
  };

  if (trxContent.updatedTrxId) {
    const updatedComment = await Comment.get(
      { groupId, trxId: trxContent.updatedTrxId },
      transactionManager,
    );
    if (!updatedComment) { return; }
    if (comment.userAddress !== updatedComment.userAddress) {
      pollingLog.warn(`post ${comment.trxId} no permission update comment`);
    }
    updatedComment.content = comment.content;
    await Comment.save(updatedComment, transactionManager);
    return;
  }

  if (trxContent.deletedTrxId) {
    const deletedComment = await Comment.get(
      { groupId, trxId: trxContent.deletedTrxId },
      transactionManager,
    );
    if (!deletedComment) { return; }
    if (comment.userAddress !== deletedComment.userAddress) {
      pollingLog.warn(`post ${comment.trxId} no permission delete comment`);
    }

    await Promise.all([
      Comment.delete({ groupId, trxId: deletedComment.trxId }, transactionManager),
      Notification.deleteWith({ groupId, trxId: deletedComment.trxId }, transactionManager),
      UniqueCounter.deleteWith({ groupId, trxId: deletedComment.trxId }, transactionManager),
    ]);

    const post = await Post.get(
      { groupId, trxId: deletedComment.objectId },
      transactionManager,
    );
    if (post) {
      post.commentCount = await Comment.count({
        groupId,
        objectId: deletedComment.objectId,
      }, transactionManager);
      await Post.update(
        { trxId: post.trxId, groupId },
        post,
        transactionManager,
      );
    }
    if (deletedComment.threadId) {
      const comment = await Comment.get(
        { groupId, trxId: deletedComment.threadId },
        transactionManager,
      );
      if (comment) {
        comment.commentCount = await Comment.count({
          groupId,
          threadId: deletedComment.threadId,
        }, transactionManager);
        await Comment.save(comment, transactionManager);
      }
    }
    return;
  }

  await Comment.add(comment, transactionManager);
  queueSocket({
    broadcast: true,
    event: 'trx',
    groupId,
    data: { trxId: comment.trxId, type: 'comment' },
  });

  const commentAuthorAddress = comment.userAddress;
  const post = await Post.get(
    { groupId, trxId: comment.objectId },
    transactionManager,
  );
  const parentReplyComment = comment.replyId
    ? await Comment.get({ groupId, trxId: comment.replyId }, transactionManager)
    : null;
  const parentThreadComment = comment.threadId
    ? await Comment.get({ groupId, trxId: comment.threadId }, transactionManager)
    : null;

  if (post) {
    post.commentCount = await Comment.count({
      groupId,
      objectId: post.trxId,
    }, transactionManager);
    await Post.save(post, transactionManager);
  }

  const notifications: Array<Notification> = [];

  // notification reply to post
  const replyToPost = !comment.replyId
    && !comment.threadId
    && post
    && post.userAddress !== commentAuthorAddress;
  if (replyToPost) {
    notifications.push({
      groupId,
      status: 'unread',
      type: 'comment',
      objectId: post.trxId,
      objectType: 'post',
      actionObjectId: comment.trxId,
      actionObjectType: 'comment',
      to: post.userAddress,
      from: commentAuthorAddress,
      timestamp: parseQuorumTimestamp(item.TimeStamp),
    });
  }

  // notification reply to replyId comment
  const replyToReplyId = parentReplyComment
    && parentReplyComment.userAddress !== commentAuthorAddress;
  if (replyToReplyId) {
    notifications.push({
      groupId,
      status: 'unread',
      type: 'comment',
      objectId: parentReplyComment.trxId,
      objectType: 'comment',
      actionObjectId: comment.trxId,
      actionObjectType: 'comment',
      to: parentReplyComment.userAddress,
      from: commentAuthorAddress,
      timestamp: parseQuorumTimestamp(item.TimeStamp),
    });
  }

  // notification to threadId comment
  const replyToThread = parentThreadComment
   && parentThreadComment.userAddress !== commentAuthorAddress
   && parentThreadComment.userAddress !== parentReplyComment?.userAddress;
  if (replyToThread) {
    parentThreadComment.commentCount += 1;
    await Comment.save(parentThreadComment, transactionManager);
    notifications.push({
      groupId,
      status: 'unread',
      type: 'comment',
      objectId: parentThreadComment.trxId,
      objectType: 'comment',
      actionObjectId: comment.trxId,
      actionObjectType: 'comment',
      to: parentThreadComment.userAddress,
      from: commentAuthorAddress,
      timestamp: parseQuorumTimestamp(item.TimeStamp),
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
