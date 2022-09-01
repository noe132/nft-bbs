import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { UniqueCounter, Post, Comment, Notification } from '~/orm';
import { trySendSocket } from '~/service/socket';
import { store, LOADED_DATA_KEY } from '~/utils/';

export const handleCounter = async (item: IContent) => {
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
    if (await UniqueCounter.has({ groupId: item.GroupId, name, objectId, userAddress: from })) {
      return;
    }
    await UniqueCounter.add(uniqueCounter);
  } else if (value < 0) {
    await UniqueCounter.destroy({ name, objectId });
  }

  if (name.startsWith('post')) {
    const post = await Post.get(item.GroupId, objectId);
    if (!post) {
      return;
    }
    const count = await UniqueCounter.count({
      name,
      objectId: post.trxId,
    });
    if (name === 'postLike') {
      post.likeCount = count;
    } else if (name === 'postDislike') {
      post.dislikeCount = count;
    }
    await Post.update({ trxId: post.trxId, groupId: post.groupId }, post);
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
      });
      if (store(LOADED_DATA_KEY)) {
        trySendSocket(notification.to, 'notification', await Notification.appendExtra(notification));
      }
    }
  }

  if (name.startsWith('comment')) {
    const comment = await Comment.get(item.GroupId, objectId);
    if (!comment) {
      return;
    }
    const count = await UniqueCounter.count({
      name,
      objectId: comment.trxId,
    });
    if (name === 'commentLike') {
      comment.likeCount = count;
    } else if (name === 'commentDislike') {
      comment.dislikeCount = count;
    }
    await Comment.update({ trxId: comment.trxId, groupId: comment.groupId }, comment);
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
      });
      if (store(LOADED_DATA_KEY)) {
        trySendSocket(notification.to, 'notification', await Notification.appendExtra(notification));
      }
    }
  }
};
