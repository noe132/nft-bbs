import { PostType } from 'nft-bbs-types';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { EntityManager } from 'typeorm';
import { Post } from '~/orm';
import { send } from '~/service/socket';
import { parseQuorumTimestamp } from '~/utils';

export const handlePost = async (item: IContent, transactionManager: EntityManager, queueSocket: typeof send) => {
  const data = item.Data as PostType;
  const userAddress = QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey);
  const groupId = item.GroupId;
  const trxId = item.TrxId;
  const timestamp = parseQuorumTimestamp(item.TimeStamp);

  const post = await Post.add({
    trxId,
    groupId,
    title: data.name,
    content: data.content,
    userAddress,
    timestamp,
    commentCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    hot: 0,
  }, transactionManager);

  queueSocket({
    broadcast: true,
    event: 'post',
    groupId,
    data: { trxId },
  });
};
