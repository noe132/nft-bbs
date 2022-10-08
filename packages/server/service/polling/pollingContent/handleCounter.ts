import { CounterName } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { UniqueCounter, Post, Comment, Notification } from '~/orm';
import { send } from '~/service/socket';
import { parseQuorumTimestamp } from '~/utils';

export const handleCounter = async (
  item: IContent,
  transactionManager: EntityManager,
  queueSocket: typeof send,
) => {
  const trxContent = UniqueCounter.parseTrxContent(item);
  const groupId = item.GroupId;
  if (!trxContent) {
    pollingLog.info(`counter ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }

  const { objectId, value, name } = trxContent;
  const uniqueCounter: UniqueCounter = {
    trxId: item.TrxId,
    name,
    groupId,
    objectId,
    userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
    timestamp: parseQuorumTimestamp(item.TimeStamp),
  };
  const from = uniqueCounter.userAddress;

  queueSocket({
    broadcast: true,
    event: 'uniqueCounter',
    groupId,
    data: { uniqueCounter },
  });

  if (value > 0) {
    // ignore duplicated counter
    const hasCounter = await UniqueCounter.has(
      { groupId, name, objectId, userAddress: from },
      transactionManager,
    );
    if (hasCounter) { return; }
    await UniqueCounter.add(uniqueCounter, transactionManager);
  } else if (value < 0) {
    await UniqueCounter.destroy({ name, objectId }, transactionManager);
  }

  if ([CounterName.postLike, CounterName.postDislike].includes(name)) {
    const post = await Post.get({ groupId, trxId: objectId }, transactionManager);
    if (!post) {
      return;
    }
    const count = await UniqueCounter.count({
      name,
      objectId: post.trxId,
    }, transactionManager);
    if (name === 'postLike') {
      post.likeCount = count;
    } else if (name === 'postDislike') {
      post.dislikeCount = count;
    }
    await Post.update({ trxId: post.trxId, groupId }, post, transactionManager);
    if (value > 0 && from !== post.userAddress) {
      const notification = await Notification.add({
        groupId,
        status: 'unread',
        type: 'like',
        objectId: post.trxId,
        objectType: 'post',
        actionObjectId: item.TrxId,
        actionObjectType: 'counter',
        to: post.userAddress,
        from,
        timestamp: parseQuorumTimestamp(item.TimeStamp),
      }, transactionManager);
      const notificationItem = await Notification.appendExtra(notification, transactionManager);
      queueSocket({
        userAddress: notification.to,
        event: 'notification',
        groupId,
        data: notificationItem,
      });
    }
  }

  if ([CounterName.commentLike, CounterName.commentDislike].includes(name)) {
    const comment = await Comment.get({ groupId, trxId: objectId }, transactionManager);
    if (!comment) {
      return;
    }
    const count = await UniqueCounter.count({
      name,
      objectId: comment.trxId,
    }, transactionManager);
    if (name === CounterName.commentLike) {
      comment.likeCount = count;
    } else if (name === CounterName.commentDislike) {
      comment.dislikeCount = count;
    }
    await Comment.update(
      { trxId: comment.trxId, groupId },
      comment,
      transactionManager,
    );
    if (value > 0 && from !== comment.userAddress) {
      const notification = await Notification.add({
        groupId,
        status: 'unread',
        type: 'like',
        objectId: comment.trxId,
        objectType: 'comment',
        actionObjectId: item.TrxId,
        actionObjectType: 'counter',
        to: comment.userAddress,
        from,
        timestamp: parseQuorumTimestamp(item.TimeStamp),
      }, transactionManager);
      const notificationItem = await Notification.appendExtra(notification, transactionManager);
      queueSocket({
        userAddress: notification.to,
        event: 'notification',
        groupId,
        data: notificationItem,
      });
    }
  }
};
