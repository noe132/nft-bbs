import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk';
import { PostModel, TrxStatus, TrxStorage } from '~/database';

export const handlePosts = async (items: IContent[] = []) => {
  if (items.length === 0) { return; }
  const existPosts = await PostModel.bulkGet(items.map((item) => item.TrxId));
  const existTrxIds = existPosts.map((item) => item.trxId);
  const itemsToAdd = items.filter((item) => !existTrxIds.includes(item.TrxId));
  await PostModel.bulkAdd(itemsToAdd.map((item) => {
    const trxContent = PostModel.getTrxContent(item);
    return {
      ...trxContent,
      userAddress: QuorumLightNodeSDK.utils.pubkeyToAddress(item.SenderPubkey),
      groupId: item.GroupId,
      trxId: item.TrxId,
      storage: TrxStorage.chain,
      status: TrxStatus.normal,
      latestId: '',
      summary: PostModel.DEFAULT_POST_SUMMARY,
      timestamp: parseInt(String(item.TimeStamp / 1000000), 10),
    };
  }));
  const postsToPut = existPosts.map((item) => ({
    ...item,
    storage: TrxStorage.chain,
  }));
  await PostModel.bulkPut(postsToPut);
};
