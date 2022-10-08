import { TrxStorage } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { Notification, Post, UniqueCounter } from '~/orm';
import { send } from '~/service/socket';
import { parseQuorumTimestamp } from '~/utils';

export const handlePost = async (item: IContent, transactionManager: EntityManager, queueSocket: typeof send) => {
  const trxContent = Post.parseTrxContent(item);
  const groupId = item.GroupId;
  if (!trxContent) {
    pollingLog.info(`post ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }
  const post: Post = {
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
    const updatedPost = await Post.get(
      { groupId, trxId: trxContent.updatedTrxId },
      transactionManager,
    );
    if (!updatedPost) { return; }
    if (post.userAddress !== updatedPost.userAddress) {
      pollingLog.warn(`post ${post.trxId} no permission update post`);
    }
    await Post.update(
      { trxId: updatedPost.trxId, groupId },
      { content: post.content },
      transactionManager,
    );
    queueSocket({
      broadcast: true,
      event: 'postEdit',
      groupId,
      data: { post, updatedTrxId: trxContent.updatedTrxId },
    });
    return;
  }

  if (trxContent.deletedTrxId) {
    const deletedPost = await Post.get(
      { groupId, trxId: trxContent.deletedTrxId },
      transactionManager,
    );
    if (!deletedPost) { return; }
    if (post.userAddress !== deletedPost.userAddress) {
      pollingLog.warn(`post ${post.trxId} no permission delete post`);
    }

    await Promise.all([
      Post.delete({ groupId, trxId: deletedPost.trxId }, transactionManager),
      Notification.deleteWith({ groupId, trxId: deletedPost.trxId }, transactionManager),
      UniqueCounter.deleteWith({ groupId, trxId: deletedPost.trxId }, transactionManager),
    ]);
    queueSocket({
      broadcast: true,
      event: 'postDelete',
      groupId,
      data: { post, deletedTrxId: trxContent.deletedTrxId },
    });
    return;
  }

  await Post.add(post, transactionManager);
  queueSocket({
    broadcast: true,
    event: 'trx',
    groupId,
    data: { trxId: post.trxId, type: 'post' },
  });
};
