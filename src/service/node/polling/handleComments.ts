import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk';
import { groupBy } from 'lodash-es';
import {
  CommentModel, PostModel, NotificationModel,
  INotification, NotificationStatus, NotificationType, NotificationObjectType,
  TrxStatus, TrxStorage,
} from '~/database';
import { bus } from '~/utils';
import { keyService } from '~/service/key';


export const handleComments = async (items: IContent[] = []) => {
  if (items.length === 0) { return; }
  const existedComments = await CommentModel.bulkGet(items.map((item) => item.TrxId));
  const existedTrxIds = existedComments.map((item) => item.trxId);
  const newComments = items
    .filter((item) => !existedTrxIds.includes(item.TrxId))
    .map((item) => {
      const trxContent = CommentModel.getTrxContent(item);
      return {
        ...trxContent,
        userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
        groupId: item.GroupId,
        trxId: item.TrxId,
        storage: TrxStorage.chain,
        status: TrxStatus.normal,
        latestId: '',
        summary: CommentModel.DEFAULT_POST_SUMMARY,
        timestamp: parseInt(String(item.TimeStamp / 1000000), 10),
      };
    });

  await CommentModel.bulkAdd(newComments);
  const commentsToPut = existedComments.map((item) => ({
    ...item,
    storage: TrxStorage.chain,
  }));
  await CommentModel.bulkPut(commentsToPut);


  const posts = await PostModel.bulkGet(
    Array.from(new Set(newComments.map((v) => v.objectId))),
  );
  const parentComments = await CommentModel.bulkGet(
    Array.from(new Set(newComments.flatMap((v) => [v.threadId, v.replyId]))),
  );
  const postMap = new Map(posts.map((v) => [v.trxId, v]));
  const parentCommentMap = new Map(parentComments.map((v) => [v.trxId, v]));
  const notifications: INotification[] = [];

  // handle notifications
  {
    const myUserAddress = keyService.state.keys.address;
    for (const comment of newComments) {
      // ignore comment posted by user himself
      if (comment.userAddress === myUserAddress) { continue; }
      // ignore comment without objectId
      if (!comment.objectId) { continue; }
      // console.log(comment);
      const post = postMap.get(comment.objectId);
      const parentReplyComment = parentCommentMap.get(comment.replyId);
      const parentThreadComment = parentCommentMap.get(comment.threadId);
      if (!comment.replyId && !comment.threadId && post?.userAddress === myUserAddress) {
        // notification reply to post
        notifications.push({
          groupId: comment.groupId,
          status: NotificationStatus.unread,
          type: NotificationType.comment,
          objectId: comment.objectId,
          objectType: NotificationObjectType.post,
          actionTrxId: comment.trxId,
          fromUserAddress: comment.userAddress,
          timestamp: Date.now(),
        });
      } else if (parentReplyComment?.userAddress === myUserAddress || parentThreadComment?.userAddress === myUserAddress) {
        // notification reply to comment
        notifications.push({
          groupId: comment.groupId,
          status: NotificationStatus.unread,
          type: NotificationType.comment,
          objectId: comment.objectId,
          objectType: NotificationObjectType.comment,
          actionTrxId: comment.trxId,
          fromUserAddress: comment.userAddress,
          timestamp: Date.now(),
        });
      }
    }
  }

  // update post's comment counter
  {
    const groupedByObjectId = groupBy(newComments, (item) => item.objectId);
    const objectIds = Object.keys(groupedByObjectId);
    if (objectIds.length !== 0) {
      const posts = objectIds
        .map((v) => postMap.get(v))
        .filter(<T>(v: T | undefined): v is T => !!v);
      const postsToPut = posts.map((post) => {
        post.summary.commentCount += groupedByObjectId[post.trxId].length;
        return post;
      });
      await PostModel.bulkPut(postsToPut);
    }
  }

  // update comment's comment counter
  {
    const groupedByThreadId = groupBy(newComments, (item) => item.threadId);
    const threadIds = Object.keys(groupedByThreadId);
    if (threadIds.length !== 0) {
      const comments = threadIds
        .map((v) => parentCommentMap.get(v))
        .filter(<T>(v: T | undefined): v is T => !!v);
      const commentsToPut = comments.map((comment) => {
        comment.summary.commentCount += groupedByThreadId[comment.trxId].length;
        return comment;
      });
      await CommentModel.bulkPut(commentsToPut);
    }
  }

  await NotificationModel.bulkAdd(notifications);
  for (const notification of notifications) {
    bus.emit('notification', notification);
  }
};
