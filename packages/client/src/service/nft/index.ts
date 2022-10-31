import { either, taskEither } from 'fp-ts';
import { action, observable, reaction, runInAction } from 'mobx';
import { MVMApi } from '~/apis';
import { keyService } from '~/service/key';
import { BigNumber, ethers } from 'ethers';
import { NFT_CONTRACT } from './contract';
import { nodeService } from '~/service/node';
import { notNullFilter } from '~/utils';

const state = observable({
  tokenIds: [] as Array<number>,
  tokenIdMap: new Map<string, Array<number>>(),

  get hasNFT() {
    return !!this.tokenIds.length;
  },
  get hasPermission() {
    const config = nodeService.config.get();
    if (!config.nft) {
      return true;
    }
    return this.hasNFT;
  },
  get postPermissionTip() {
    if (!nodeService.state.logined) { return '请先登录'; }
    if (!this.hasPermission) { return '无权限发布内容'; }
    return '';
  },
});

const checkNFTPermission = async (mixinUserId: string) => {
  const res = await MVMApi.mixinAuth(mixinUserId);
  const hasNFT = either.isRight(res);
  return hasNFT;
};

const getNFT = async (userAddress: string) => {
  const contractAddress = nodeService.config.get().nft;
  if (!contractAddress) { return []; }
  const provider = new ethers.providers.JsonRpcProvider('https://eth-rpc.rumsystem.net/');
  const contractWithSigner = new ethers.Contract(contractAddress, NFT_CONTRACT, provider);
  const tx: BigNumber = await contractWithSigner.balanceOf(userAddress);
  const balance = tx.toNumber();
  if (!balance) {
    runInAction(() => {
      state.tokenIds = [];
    });
    return [];
  }

  const taskResults = await Promise.all(
    Array(balance).fill(0).map((_, i) => taskEither.tryCatch(
      async () => {
        const tx: BigNumber = await contractWithSigner.tokenOfOwnerByIndex(userAddress, i);
        const tx2: BigNumber = await contractWithSigner.tokenByIndex(tx);
        const tokenId = tx2.toNumber();
        return tokenId;
      },
      (e) => e as Error,
    )()),
  );

  const tokenIds = taskResults
    .map((v) => (either.isLeft(v) ? null : v.right))
    .filter(notNullFilter);

  runInAction(() => {
    state.tokenIdMap.set(userAddress, [...tokenIds]);
  });

  return tokenIds;
};

export const init = () => {
  const disposes = [
    reaction(
      () => nodeService.state.groupId,
      action(() => state.tokenIdMap.clear()),
    ),
    reaction(
      () => [nodeService.state.groupId, nodeService.state.config.loaded, keyService.state.address],
      async (items) => {
        if (items.some((v) => !v)) {
          state.tokenIds = [];
        }
        const config = nodeService.state.config.currentGroup;
        if (config.nft) {
          const tokenIds = await getNFT(keyService.state.address);
          runInAction(() => {
            state.tokenIds = tokenIds;
          });
        }
      },
    ),
  ];

  return () => disposes.forEach((v) => v());
};

export const nftService = {
  state,
  init,

  checkNFTPermission,
  getNFT,
};
