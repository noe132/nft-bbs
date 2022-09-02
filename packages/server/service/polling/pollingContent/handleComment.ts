import { TrxStorage } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { Post, Comment, Notification, UniqueCounter } from '~/orm';
import { broadcast, trySendSocket } from '~/service/socket';
import { LOADED_DATA_KEY, store } from '~/utils';

export const handleComment = async (item: IContent, transactionManager: EntityManager) => {
  const trxContent = Comment.parseTrxContent(item);
  if (!trxContent) {
    pollingLog.info(`$1 ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }
  const comment: Comment = {
    ...trxContent,
    userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
    groupId: item.GroupId,
    trxId: item.TrxId,
    storage: TrxStorage.chain,
    commentCount: 0,
    dislikeCount: 0,
    hotCount: 0,
    likeCount: 0,
    timestamp: item.TimeStamp / 1000000,
  };

  if (trxContent.updatedTrxId) {
    const updatedComment = await Comment.get(
      { groupId: item.GroupId, trxId: trxContent.updatedTrxId },
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
      { groupId: item.GroupId, trxId: trxContent.deletedTrxId },
      transactionManager,
    );
    if (!deletedComment) { return; }
    if (comment.userAddress !== deletedComment.userAddress) {
      pollingLog.warn(`post ${comment.trxId} no permission delete comment`);
    }

    await Promise.all([
      Comment.delete({ groupId: deletedComment.groupId, trxId: deletedComment.trxId }, transactionManager),
      Notification.deleteWith({ groupId: deletedComment.groupId, trxId: deletedComment.trxId }, transactionManager),
      UniqueCounter.deleteWith({ groupId: deletedComment.groupId, trxId: deletedComment.trxId }, transactionManager),
    ]);

    const post = await Post.get(
      { groupId: deletedComment.groupId, trxId: deletedComment.objectId },
      transactionManager,
    );
    if (post) {
      post.commentCount = await Comment.count({
        groupId: post.groupId,
        objectId: deletedComment.objectId,
      }, transactionManager);
      await Post.update(
        { trxId: post.trxId, groupId: post.groupId },
        post,
        transactionManager,
      );
    }
    if (deletedComment.threadId) {
      const comment = await Comment.get(
        { groupId: deletedComment.groupId, trxId: deletedComment.threadId },
        transactionManager,
      );
      if (comment) {
        comment.commentCount = await Comment.count({
          groupId: comment.groupId,
          threadId: deletedComment.threadId,
        }, transactionManager);
        await Comment.save(comment, transactionManager);
      }
    }
    return;
  }

  await Comment.add(comment, transactionManager);
  broadcast('trx', { trxId: comment.trxId, type: 'comment' });

  const commentAuthorAddress = comment.userAddress;
  const post = await Post.get(
    { groupId: comment.groupId, trxId: comment.objectId },
    transactionManager,
  );
  const parentReplyComment = comment.replyId
    ? await Comment.get({ groupId: comment.groupId, trxId: comment.replyId }, transactionManager)
    : null;
  const parentThreadComment = comment.threadId
    ? await Comment.get({ groupId: comment.groupId, trxId: comment.threadId }, transactionManager)
    : null;

  if (post) {
    post.commentCount = await Comment.count({
      groupId: post.groupId,
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
      groupId: item.GroupId,
      status: store(LOADED_DATA_KEY) ? 'unread' : 'read',
      type: 'comment',
      objectId: post.trxId,
      objectType: 'post',
      actionObjectId: comment.trxId,
      actionObjectType: 'comment',
      to: post.userAddress,
      from: commentAuthorAddress,
      timestamp: item.TimeStamp / 1000000,
    });
  }

  // notification reply to replyId comment
  const replyToReplyId = parentReplyComment
    && parentReplyComment.userAddress !== commentAuthorAddress;
  if (replyToReplyId) {
    notifications.push({
      groupId: item.GroupId,
      status: store(LOADED_DATA_KEY) ? 'unread' : 'read',
      type: 'comment',
      objectId: parentReplyComment.trxId,
      objectType: 'comment',
      actionObjectId: comment.trxId,
      actionObjectType: 'comment',
      to: parentReplyComment.userAddress,
      from: commentAuthorAddress,
      timestamp: item.TimeStamp / 1000000,
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
      groupId: item.GroupId,
      status: store(LOADED_DATA_KEY) ? 'unread' : 'read',
      type: 'comment',
      objectId: parentThreadComment.trxId,
      objectType: 'comment',
      actionObjectId: comment.trxId,
      actionObjectType: 'comment',
      to: parentThreadComment.userAddress,
      from: commentAuthorAddress,
      timestamp: item.TimeStamp / 1000000,
    });
  }

  await Notification.bulkAdd(notifications, transactionManager);
  if (store(LOADED_DATA_KEY)) {
    for (const item of notifications) {
      const notification = await Notification.appendExtra(item, transactionManager);
      trySendSocket(notification.to, 'notification', notification);
    }
  }
};
