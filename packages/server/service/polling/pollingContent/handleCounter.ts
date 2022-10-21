import { DislikeType, LikeType } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';

import { Post, Comment, Notification, Counter, StackedCounter } from '~/orm';
import { send } from '~/service/socket';
import { parseQuorumTimestamp } from '~/utils';

export const handleCounter = async (item: IContent, transactionManager: EntityManager, queueSocket: typeof send) => {
  const data = item.Data as any as LikeType | DislikeType;
  const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
  const groupId = item.GroupId;
  const trxId = item.TrxId;
  const timestamp = parseQuorumTimestamp(item.TimeStamp);

  const objectItem = await Comment.get({ groupId, trxId: data.id }, transactionManager)
    ?? await Post.get({ groupId, trxId: data.id }, transactionManager);

  if (!objectItem) {
    pollingLog.warn({
      message: `invalid counter ${trxId}`,
      data: item.Data,
    });
    return;
  }

  const objectType = objectItem instanceof Comment ? 'comment' : 'post';
  const objectClass = objectType === 'comment' ? Comment : Post;

  await Counter.add({
    groupId,
    trxId,
    type: data.type,
    objectId: objectItem.trxId,
    objectType,
    timestamp,
    userAddress,
  }, transactionManager);

  const notifications: Array<Notification> = [];

  queueSocket({
    broadcast: true,
    event: 'counter',
    groupId,
    data: {
      trxId,
      type: data.type,
      objectType,
      objectId: objectItem.trxId,
    },
  });

  if (objectType === 'post') {
    const stackedCounter = await StackedCounter.get({
      groupId,
      objectId: objectItem.trxId,
      objectType,
      type: data.type,
      userAddress,
    }, transactionManager);

    if (!stackedCounter) {
      const key = data.type === 'Like' ? 'likeCount' : 'dislikeCount';
      const [notification] = await Promise.all([
        // don't send notification if it's dislike
        data.type === 'Like' && objectItem.userAddress !== userAddress && Notification.add({
          groupId,
          status: 'unread',
          type: 'like',
          objectId: objectItem.trxId,
          objectType: 'post',
          actionObjectId: item.TrxId,
          actionObjectType: 'counter',
          to: objectItem.userAddress,
          from: userAddress,
          timestamp,
        }, transactionManager),
        StackedCounter.add({
          groupId,
          objectId: objectItem.trxId,
          objectType,
          type: data.type,
          userAddress,
        }, transactionManager),
        transactionManager.increment(
          objectClass,
          { groupId, trxId: objectItem.trxId },
          key,
          1,
        ),
      ]);
      if (notification) {
        notifications.push(notification);
      }
    }
  }

  if (objectType === 'comment') {
    const stackedCounter = await StackedCounter.get({
      groupId,
      objectId: objectItem.trxId,
      objectType,
      type: 'Like',
    }, transactionManager);

    if (!stackedCounter && data.type === 'Like') {
      const [notification] = await Promise.all([
        objectItem.userAddress !== userAddress && Notification.add({
          groupId,
          status: 'unread',
          type: 'like',
          objectId: objectItem.trxId,
          objectType: 'comment',
          actionObjectId: item.TrxId,
          actionObjectType: 'counter',
          to: objectItem.userAddress,
          from: userAddress,
          timestamp,
        }, transactionManager),
        await StackedCounter.add({
          groupId,
          objectId: objectItem.trxId,
          objectType,
          type: 'Like',
          userAddress,
        }, transactionManager),
        transactionManager.increment(
          objectClass,
          { groupId, trxId: objectItem.trxId },
          'likeCount',
          1,
        ),
      ]);
      if (notification) {
        notifications.push(notification);
      }
    }

    if (stackedCounter && data.type === 'Dislike') {
      Promise.all([
        // no notification for dislike comment (like cancelation)
        await StackedCounter.remove(stackedCounter, transactionManager),
        transactionManager.decrement(
          objectClass,
          { groupId, trxId: objectItem.trxId },
          'likeCount',
          1,
        ),
      ]);
    }

    notifications.forEach((v) => {
      queueSocket({
        groupId,
        userAddress: v.to,
        event: 'notification',
        data: v,
      });
    });
  }
};
