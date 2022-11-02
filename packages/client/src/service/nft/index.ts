import { either } from 'fp-ts';
import { action, observable, reaction, runInAction } from 'mobx';
import { MVMApi } from '~/apis';
import { keyService } from '~/service/key';
import { BigNumber, ethers } from 'ethers';
import { NFT_CONTRACT } from './contract';
import { nodeService } from '~/service/node';
import { runLoading } from '~/utils';
import { snackbarService } from '../snackbar';

interface TokenIdMapItem {
  balance: number
  ids: Array<number>
  loading: boolean
  promise: Promise<Array<number>>
}

const state = observable({
  tokenIdMap: new Map<string, TokenIdMapItem>(),
  get tokenIds() {
    return this.tokenIdMap.get(keyService.state.address)?.ids ?? [];
  },
  get hasNFT() {
    return !!this.tokenIdMap.get(keyService.state.address)?.balance;
  },
  get hasPermission() {
    if (!nodeService.state.logined) { return false; }
    const config = nodeService.config.get();
    if (!config.nft) {
      return true;
    }
    return this.hasNFT;
  },
});

const rpcProvider = new ethers.providers.JsonRpcBatchProvider('https://eth-rpc.rumsystem.net/', {
  name: 'rum-eth',
  chainId: 19890609,
});
rpcProvider.detectNetwork = ethers.providers.StaticJsonRpcProvider.prototype.detectNetwork;

const mixinAuth = async (mixinUserId: string) => {
  const res = await MVMApi.mixinAuth(mixinUserId);
  const hasNFT = either.isRight(res);
  return hasNFT;
};

const getNFT = (userAddress: string) => {
  const contractAddress = nodeService.config.get().nft;
  if (!contractAddress) { return []; }
  if (!state.tokenIdMap.has(userAddress)) {
    runInAction(() => {
      state.tokenIdMap.set(userAddress, {
        balance: 0,
        ids: [],
        loading: false,
        promise: Promise.resolve([]),
      });
    });
  }
  const item = state.tokenIdMap.get(userAddress)!;
  if (item.loading) { return item.promise; }

  const promise = runLoading(
    (l) => { item.loading = l; },
    async () => {
      const contractWithSigner = new ethers.Contract(contractAddress, NFT_CONTRACT, rpcProvider);
      const tx: BigNumber = await contractWithSigner.balanceOf(userAddress);
      const balance = tx.toNumber();
      if (!balance) {
        runInAction(() => {
          const item = state.tokenIdMap.get(userAddress);
          if (item) {
            item.ids = [];
          }
        });
        return [];
      }
      runInAction(() => {
        item.balance = balance;
      });

      const tokenIndexs = await Promise.all(
        Array(balance)
          .fill(0)
          .map((_, i) => contractWithSigner.tokenOfOwnerByIndex(userAddress, i) as Promise<BigNumber>),
      );
      const tokenIds = await Promise.all(
        tokenIndexs.map(async (v) => {
          const tx: BigNumber = await contractWithSigner.tokenByIndex(v.toNumber());
          return tx.toNumber();
        }),
      );

      runInAction(() => {
        item.ids = [...tokenIds];
      });

      return tokenIds;
    },
  );

  runInAction(() => {
    item.promise = promise;
  });

  return promise;
};

const permissionTip = (type: 'post' | 'comment' | 'counter' | 'profile') => {
  const map = {
    post: '您不持有具备发帖权限的 NFT',
    comment: '您不持有具备评论权限的 NFT',
    counter: '您没有评论互动权限',
    profile: '您没有提交个人资料的权限',
  };
  if (!nodeService.state.logined) {
    return '请先登录';
  }
  if (!state.hasPermission) {
    return map[type];
  }
  return '';
};

const hasPermissionAndTip = (type: 'post' | 'comment' | 'counter' | 'profile') => {
  const tip = permissionTip(type);
  if (tip) {
    snackbarService.show(tip);
  }
  return !tip;
};

export const init = () => {
  const disposes = [
    reaction(
      () => nodeService.state.groupId,
      action(() => state.tokenIdMap.clear()),
    ),
    reaction(
      () => [nodeService.state.groupId, nodeService.state.config.loaded, keyService.state.address],
      (items) => {
        if (items.some((v) => !v)) {
          state.tokenIdMap.delete(keyService.state.address);
        }
        const config = nodeService.state.config.currentGroup;
        if (config.nft) {
          getNFT(keyService.state.address);
        }
      },
    ),
  ];

  return () => disposes.forEach((v) => v());
};

export const nftService = {
  state,
  init,

  mixinAuth,
  permissionTip,
  hasPermissionAndTip,
  getNFT,
};
