import { PostDeleteType } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { Post } from '~/orm';
import { send } from '~/service/socket';

export const handlePostDelete = async (item: IContent, transactionManager: EntityManager, queueSocket: typeof send) => {
  const data = item.Data as PostDeleteType;
  const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
  const groupId = item.GroupId;
  const trxId = item.TrxId;

  const post = await Post.get({
    groupId: item.GroupId,
    trxId: data.id,
  }, transactionManager);

  if (post && post.userAddress === userAddress) {
    await Post.delete({
      groupId: item.GroupId,
      trxId: data.id,
    }, transactionManager);
  }

  queueSocket({
    broadcast: true,
    event: 'postDelete',
    groupId,
    data: { trxId },
  });
};
