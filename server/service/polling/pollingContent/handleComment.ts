import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { Post, Comment, Notification, UniqueCounter } from '~/orm';
import { broadcast, trySendSocket } from '~/service/socket';
import { LOADED_DATA_KEY, store } from '~/utils';

export const handleComment = async (item: IContent) => {
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
    storage: 'chain',
    commentCount: 0,
    dislikeCount: 0,
    hotCount: 0,
    likeCount: 0,
    timestamp: item.TimeStamp / 1000000,
  };

  if (trxContent.updatedTrxId) {
    const updatedComment = await Comment.get(trxContent.updatedTrxId);
    if (!updatedComment) { return; }
    if (comment.userAddress !== updatedComment.userAddress) {
      pollingLog.warn(`post ${comment.trxId} no permission update comment`);
    }
    updatedComment.content = comment.content;
    await Comment.save(updatedComment);
    return;
  }

  if (trxContent.deletedTrxId) {
    const deletedComment = await Comment.get(trxContent.deletedTrxId);
    if (!deletedComment) { return; }
    if (comment.userAddress !== deletedComment.userAddress) {
      pollingLog.warn(`post ${comment.trxId} no permission delete comment`);
    }

    await Promise.all([
      Comment.delete(deletedComment.trxId),
      Notification.deleteWith(deletedComment.trxId),
      UniqueCounter.deleteWith(deletedComment.trxId),
    ]);

    const post = await Post.get(deletedComment.objectId);
    if (post) {
      post.commentCount = await Comment.count({
        groupId: post.groupId,
        objectId: deletedComment.objectId,
      });
      await Post.update(post.trxId, post);
    }
    if (deletedComment.threadId) {
      const comment = await Comment.get(deletedComment.threadId);
      if (comment) {
        comment.commentCount = await Comment.count({
          groupId: comment.groupId,
          threadId: deletedComment.threadId,
        });
        await Comment.save(comment);
      }
    }
    return;
  }

  await Comment.add(comment);
  broadcast('trx', { trxId: comment.trxId, type: 'comment' });

  const commentAuthorAddress = comment.userAddress;
  const post = await Post.get(comment.objectId);
  const parentReplyComment = comment.replyId ? await Comment.get(comment.replyId) : null;
  const parentThreadComment = comment.threadId ? await Comment.get(comment.threadId) : null;

  if (post) {
    post.commentCount = await Comment.count({
      groupId: post.groupId,
      objectId: post.trxId,
    });
    await Post.save(post);
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
    await Comment.save(parentThreadComment);
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

  await Notification.bulkAdd(notifications);
  notifications.forEach((notification) => {
    if (store(LOADED_DATA_KEY)) {
      trySendSocket(notification.to, 'notification', notification);
    }
  });
};
