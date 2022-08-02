import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk';
import { groupBy, keyBy, sum } from 'lodash-es';

import {
  CounterModel, UniqueCounterModel, PostModel, CommentModel, NotificationModel,
  CounterName, ICounter, IUniqueCounter, INotification, NotificationStatus,
  NotificationType, NotificationObjectType,
} from '~/database';
import { bus } from '~/utils';
import { keyService } from '~/service/key';

export const handleCounters = async (items: IContent[] = []) => {
  if (items.length === 0) {
    return;
  }
  const groupedItems = groupBy(items, (item) => CounterModel.getTrxContent(item).name);
  for (const [name, items] of Object.entries(groupedItems)) {
    if (Object.values(CounterName).includes(name as CounterName)) {
      await handleItems(name as CounterName, items);
    }
  }
};

const handleItems = async (counterName: CounterName, items: IContent[]) => {
  const trxIds = items.map((item) => item.TrxId);
  const existCounters = await CounterModel.bulkGet(trxIds);
  const existCounterTrxIds = existCounters.map((counter) => counter.trxId);
  const newItems = items.filter((item) => !existCounterTrxIds.includes(item.TrxId));

  if (newItems.length === 0) {
    return;
  }

  {
    const countersToAdd: ICounter[] = [];
    for (const item of newItems) {
      countersToAdd.push({
        trxId: item.TrxId,
      });
    }
    await CounterModel.bulkAdd(countersToAdd);
  }

  {
    const groupedCounters = groupBy(newItems, (item) => {
      const trxContent = CounterModel.getTrxContent(item);
      return `${trxContent.objectId}_${QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey)}`;
    });
    const uniqueCountersToAdd: IUniqueCounter[] = [];
    const uniqueCountersToDelete: IUniqueCounter[] = [];
    for (const [groupedKey, counters] of Object.entries(groupedCounters)) {
      const sumRet = sum(counters.map((counter) => CounterModel.getTrxContent(counter).value));
      const [objectId, userAddress] = groupedKey.split('_');
      if (sumRet > 0) {
        uniqueCountersToAdd.push({
          name: counterName,
          objectId,
          userAddress,
        });
      } else if (sumRet < 0) {
        uniqueCountersToDelete.push({
          name: counterName,
          objectId,
          userAddress,
        });
      }
    }
    if (uniqueCountersToAdd.length > 0) {
      await UniqueCounterModel.bulkAdd(uniqueCountersToAdd);
    }
    if (uniqueCountersToDelete.length > 0) {
      await UniqueCounterModel.bulkDelete(uniqueCountersToDelete);
    }
  }

  const itemsForPost = newItems.filter((item) => [CounterName.postLike, CounterName.postDislike].includes(CounterModel.getTrxContent(item).name));
  const posts = await PostModel.bulkGet(itemsForPost.map((item) => CounterModel.getTrxContent(item).objectId));
  const itemsForComment = newItems.filter((item) => [CounterName.commentLike, CounterName.commentDislike].includes(CounterModel.getTrxContent(item).name));
  const comments = await CommentModel.bulkGet(itemsForComment.map((item) => CounterModel.getTrxContent(item).objectId));

  {
    const groupedCounters = groupBy(newItems, (item) => {
      const trxContent = CounterModel.getTrxContent(item);
      return trxContent.objectId;
    });
    const objectUpdatedInfo = {} as Record<string, number>;
    for (const [objectId, counters] of Object.entries(groupedCounters)) {
      const sumRet = sum(counters.map((counter) => CounterModel.getTrxContent(counter).value));
      objectUpdatedInfo[objectId] = sumRet;
    }
    if ([CounterName.postLike, CounterName.postDislike].includes(counterName)) {
      const postsToPut = posts.map((post) => {
        if (counterName === CounterName.postLike) {
          post.summary.likeCount += objectUpdatedInfo[post.trxId];
        } else if (counterName === CounterName.postDislike) {
          post.summary.dislikeCount += objectUpdatedInfo[post.trxId];
        }
        return post;
      });
      await PostModel.bulkPut(postsToPut);
    }
    if ([CounterName.commentLike, CounterName.commentDislike].includes(counterName)) {
      const commentsToPut = comments.map((comment) => {
        if (counterName === CounterName.commentLike) {
          comment.summary.likeCount += objectUpdatedInfo[comment.trxId];
        } else if (counterName === CounterName.commentDislike) {
          comment.summary.dislikeCount += objectUpdatedInfo[comment.trxId];
        }
        return comment;
      });
      await CommentModel.bulkPut(commentsToPut);
    }
  }

  const notifications: INotification[] = [];
  const myPosts = posts.filter((post) => post.userAddress === keyService.state.keys.address);
  const myPostMap = keyBy(myPosts, 'trxId');
  for (const item of itemsForPost) {
    const trxContent = CounterModel.getTrxContent(item);
    const fromUserAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
    if (myPostMap[trxContent.objectId] && fromUserAddress !== keyService.state.keys.address) {
      notifications.push({
        groupId: item.GroupId,
        status: NotificationStatus.unread,
        type: trxContent.name === CounterName.postLike ? NotificationType.like : NotificationType.dislike,
        objectId: trxContent.objectId,
        objectType: NotificationObjectType.post,
        actionTrxId: item.TrxId,
        fromUserAddress,
        timestamp: Date.now(),
      });
    }
  }
  const myComments = comments.filter((comment) => comment.userAddress === keyService.state.keys.address);
  const myCommentMap = keyBy(myComments, 'trxId');
  for (const item of itemsForComment) {
    const trxContent = CounterModel.getTrxContent(item);
    const fromUserAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
    if (myCommentMap[trxContent.objectId] && fromUserAddress !== keyService.state.keys.address) {
      notifications.push({
        groupId: item.GroupId,
        status: NotificationStatus.unread,
        type: trxContent.name === CounterName.commentLike ? NotificationType.like : NotificationType.dislike,
        objectId: trxContent.objectId,
        objectType: NotificationObjectType.comment,
        actionTrxId: item.TrxId,
        fromUserAddress,
        timestamp: Date.now(),
      });
    }
  }

  await NotificationModel.bulkAdd(notifications);
  for (const notification of notifications) {
    bus.emit('notification', notification);
  }
};
