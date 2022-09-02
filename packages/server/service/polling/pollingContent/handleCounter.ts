import { CounterName } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { UniqueCounter, Post, Comment, Notification } from '~/orm';
import { trySendSocket } from '~/service/socket';
import { store, LOADED_DATA_KEY } from '~/utils/';

export const handleCounter = async (item: IContent, transactionManager: EntityManager) => {
  const trxContent = UniqueCounter.parseTrxContent(item);
  if (!trxContent) {
    pollingLog.info(`counter ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }

  const { objectId, value, name } = trxContent;
  const uniqueCounter: UniqueCounter = {
    trxId: item.TrxId,
    name,
    groupId: item.GroupId,
    objectId,
    userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
    timestamp: item.TimeStamp / 1000000,
  };
  const from = uniqueCounter.userAddress;

  trySendSocket(uniqueCounter.userAddress, 'trx', { trxId: item.TrxId, type: 'uniqueCounter' });
  if (value > 0) {
    // ignore duplicated counter
    const hasCounter = await UniqueCounter.has(
      { groupId: item.GroupId, name, objectId, userAddress: from },
      transactionManager,
    );
    if (hasCounter) {
      return;
    }
    await UniqueCounter.add(uniqueCounter, transactionManager);
  } else if (value < 0) {
    await UniqueCounter.destroy({ name, objectId }, transactionManager);
  }

  if ([CounterName.postLike, CounterName.postDislike].includes(name)) {
    const post = await Post.get({ groupId: item.GroupId, trxId: objectId }, transactionManager);
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
    await Post.update({ trxId: post.trxId, groupId: post.groupId }, post, transactionManager);
    if (value > 0 && from !== post.userAddress) {
      const notification = await Notification.add({
        groupId: item.GroupId,
        status: store(LOADED_DATA_KEY) ? 'unread' : 'read',
        type: 'like',
        objectId: post.trxId,
        objectType: 'post',
        actionObjectId: item.TrxId,
        actionObjectType: 'counter',
        to: post.userAddress,
        from,
        timestamp: item.TimeStamp / 1000000,
      }, transactionManager);
      if (store(LOADED_DATA_KEY)) {
        const item = await Notification.appendExtra(notification, transactionManager);
        trySendSocket(notification.to, 'notification', item);
      }
    }
  }

  if ([CounterName.commentLike, CounterName.commentDislike].includes(name)) {
    const comment = await Comment.get({ groupId: item.GroupId, trxId: objectId }, transactionManager);
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
      { trxId: comment.trxId, groupId: comment.groupId },
      comment,
      transactionManager,
    );
    if (value > 0 && from !== comment.userAddress) {
      const notification = await Notification.add({
        groupId: item.GroupId,
        status: store(LOADED_DATA_KEY) ? 'unread' : 'read',
        type: 'like',
        objectId: comment.trxId,
        objectType: 'comment',
        actionObjectId: item.TrxId,
        actionObjectType: 'counter',
        to: comment.userAddress,
        from,
        timestamp: item.TimeStamp / 1000000,
      }, transactionManager);
      if (store(LOADED_DATA_KEY)) {
        const item = await Notification.appendExtra(notification, transactionManager);
        trySendSocket(notification.to, 'notification', item);
      }
    }
  }
};
