import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { Notification, Post, UniqueCounter } from '~/orm';
import { broadcast } from '~/service/socket';

export const handlePost = async (item: IContent) => {
  const trxContent = Post.parseTrxContent(item);
  if (!trxContent) {
    pollingLog.info(`post ${item.TrxId} failed to validate trxContent`, item.Data.content);
    return;
  }
  const post: Post = {
    ...trxContent,
    userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
    groupId: item.GroupId,
    trxId: item.TrxId,
    storage: 'chain',
    commentCount: 0,
    dislikeCount: 0,
    hotCount: 0,
    likeCount: 0,
    timestamp: parseInt(String(item.TimeStamp / 1000000), 10),
  };

  if (trxContent.updatedTrxId) {
    const updatedPost = await Post.get(trxContent.updatedTrxId);
    if (!updatedPost) { return; }
    if (post.userAddress !== updatedPost.userAddress) {
      pollingLog.warn(`post ${post.trxId} no permission update post`);
    }
    await Post.update(updatedPost.trxId, {
      ...updatedPost,
      content: post.content,
    });
    broadcast('postEdit', { post, updatedTrxId: trxContent.updatedTrxId });
    return;
  }

  if (trxContent.deletedTrxId) {
    const deletedPost = await Post.get(trxContent.deletedTrxId);
    if (!deletedPost) { return; }
    if (post.userAddress !== deletedPost.userAddress) {
      pollingLog.warn(`post ${post.trxId} no permission delete post`);
    }

    await Promise.all([
      Post.delete(deletedPost.trxId),
      Notification.deleteWith(deletedPost.trxId),
      UniqueCounter.deleteWith(deletedPost.trxId),
    ]);
    broadcast('postDelete', { post, deletedTrxId: trxContent.deletedTrxId });
    return;
  }

  await Post.add(post);
  broadcast('trx', { trxId: post.trxId, type: 'post' });
};
