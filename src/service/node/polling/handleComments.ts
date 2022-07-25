import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk';
import { groupBy, keyBy } from 'lodash-es';
import store from 'store2';
import {
  CommentModel, PostModel, NotificationModel,
  INotification, NotificationStatus, NotificationType, NotificationObjectType,
  TrxStatus, TrxStorage,
} from '~/database';
import { bus } from '~/utils';


export const handleComments = async (items: IContent[] = []) => {
  if (items.length === 0) {
    return;
  }
  const existComments = await CommentModel.bulkGet(items.map((item) => item.TrxId));
  const existTrxIds = existComments.map((item) => item.trxId);
  const itemsToAdd = items.filter((item) => !existTrxIds.includes(item.TrxId));
  await CommentModel.bulkAdd(itemsToAdd.map((item) => {
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
  }));
  const commentsToPut = existComments.map((item) => ({
    ...item,
    storage: TrxStorage.chain,
  }));
  await CommentModel.bulkPut(commentsToPut);

  const notifications: INotification[] = [];

  const groupedByObjectId = groupBy(itemsToAdd, (item) => CommentModel.getTrxContent(item).objectId);
  const objectIds = Object.keys(groupedByObjectId);
  if (objectIds.length > 0) {
    const posts = await PostModel.bulkGet(objectIds);
    const postsToPut = posts.map((post) => {
      post.summary.commentCount += groupedByObjectId[post.trxId].length;
      return post;
    });
    await PostModel.bulkPut(postsToPut);
    const commentsForPost = itemsToAdd.filter((item) => CommentModel.getTrxContent(item).objectId);
    const myPosts = posts.filter((post) => post.userAddress === store('address'));
    const myPostMap = keyBy(myPosts, 'trxId');
    for (const item of commentsForPost) {
      const trxContent = CommentModel.getTrxContent(item);
      const fromUserAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
      if (myPostMap[trxContent.objectId] && fromUserAddress !== store('address')) {
        notifications.push({
          groupId: item.GroupId,
          status: NotificationStatus.unread,
          type: NotificationType.comment,
          objectId: trxContent.objectId,
          objectType: NotificationObjectType.post,
          fromUserAddress,
          timestamp: Date.now(),
        });
      }
    }
  }

  const groupedByThreadId = groupBy(itemsToAdd, (item) => CommentModel.getTrxContent(item).threadId);
  const threadIds = Object.keys(groupedByThreadId);
  if (threadIds.length > 0) {
    const comments = await CommentModel.bulkGet(threadIds);
    const commentsToPut = comments.map((comment) => {
      comment.summary.commentCount += groupedByThreadId[comment.trxId].length;
      return comment;
    });
    await CommentModel.bulkPut(commentsToPut);
    const commentsForPost = itemsToAdd.filter((item) => CommentModel.getTrxContent(item).threadId);
    const myPosts = comments.filter((comment) => comment.userAddress === store('address'));
    const myPostMap = keyBy(myPosts, 'trxId');
    for (const item of commentsForPost) {
      const trxContent = CommentModel.getTrxContent(item);
      const fromUserAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
      if (myPostMap[trxContent.objectId] && fromUserAddress !== store('address')) {
        notifications.push({
          groupId: item.GroupId,
          status: NotificationStatus.unread,
          type: NotificationType.comment,
          objectId: trxContent.objectId,
          objectType: NotificationObjectType.comment,
          fromUserAddress,
          timestamp: Date.now(),
        });
      }
    }
  }

  await NotificationModel.bulkAdd(notifications);
  for (const notification of notifications) {
    bus.emit('notification', notification);
  }
};
