import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk';
import { GroupInfoModel, IGroupInfo, TrxStorage } from '~/database';

export const handleGroupInfo = async (items: IContent[] = []) => {
  if (items.length === 0) { return; }
  const group = QuorumLightNodeSDK.cache.Group.list()[0];
  if (!group) { return; }

  const existed = await GroupInfoModel.bulkGet(items.map((item) => item.TrxId));
  const existedTrxIds = existed.map((item) => item.trxId);
  const newItems = items
    .filter((item) => !existedTrxIds.includes(item.TrxId))
    .map((item): IGroupInfo => {
      const trxContent = GroupInfoModel.getTrxContent(item);
      return {
        ...trxContent,
        groupId: group.groupId,
        storage: TrxStorage.chain,
        timestamp: parseInt(String(item.TimeStamp / 1000000), 10),
        trxId: item.TrxId,
        isOwner: item.SenderPubkey === group.ownerPubKey ? 1 : 0,
      };
    });
  const toPut = existed.map((v) => ({
    ...v,
    storage: TrxStorage.chain,
  }));

  await GroupInfoModel.bulkPut([...newItems, ...toPut]);
};
