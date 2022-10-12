import { either, taskEither } from 'fp-ts';
import { observable, reaction, runInAction, when } from 'mobx';
import { BigNumber, ethers } from 'ethers';
import { MVMApi } from '~/apis';
import { keyService } from '~/service/key';
import { configService } from '~/service/config';
import { NFT_CONTRACT } from './contract';

const state = observable({
  hasNFT: false,
  hasNFTMap: new Map<string, boolean>(),
  hasNFTLoadingMap: new Map<string, Promise<unknown>>(),

  get hasPermission() {
    if (!configService.state.checkNFT) {
      return true;
    }
    return this.hasNFT;
  },
});

const checkNFTPermission = async (mixinUserId: string) => {
  const res = await MVMApi.mixinAuth(mixinUserId);
  const hasNFT = either.isRight(res);
  runInAction(() => {
    state.hasNFT = hasNFT;
  });
  return hasNFT;
};

const loadNFT = async (address: string) => {
  if (state.hasNFTMap.has(address)) { return; }
  if (state.hasNFTLoadingMap.has(address)) {
    return state.hasNFTLoadingMap.get(address);
  }
  const run = taskEither.tryCatch(
    async () => {
      const provider = new ethers.providers.JsonRpcProvider('https://eth-rpc.rumsystem.net/');
      const contractAddress = '0x20ABe07F7bbEC816e309e906a823844e7aE37b8d';
      const contractWithSigner = new ethers.Contract(contractAddress, NFT_CONTRACT, provider);
      const tx: BigNumber = await contractWithSigner.balanceOf(address);
      const has = !tx.eq(0);
      state.hasNFTMap.set(address, has);
      state.hasNFTLoadingMap.delete(address);
    },
    (e) => e as Error,
  );
  const p = run();
  state.hasNFTLoadingMap.set(address, p);
  return p;
};

// const getNFTsByAddress = async (_address: string) => {
//   const res = await MVMApi.getNFT(address);
//   const res = await MVMApi.getNFT('0xC8407A1F2B2467074c7FA8da72d473C6675375e6');
//   if (either.isRight(res)) {
//     state.nfts = res.right.data;
//   }
//   https://prs-bp2.press.one/api/nfts/transactions?account=0xC8407A1F2B2467074c7FA8da72d473C6675375e6&count=100

//   if (res.data.length === 0) {
//     return [];
//   }
//   return _.unionBy(res.data.reverse(), 'tokenId').filter((item) => item.to.toLowerCase() === address.toLowerCase()).reverse();
// };

// const clearNFT = action(() => {
//   state.nfts = [];
// });

// const getNfts = () => {
//   const provider = new providers.JsonRpcProvider('http://149.56.22.113:8545');
//   const ownerWallet = new Wallet('b867fe2b01929350d358b2f348b33cbace88cdcd537e5360a68b9f4e1edb764b', provider);
//   const contractAddress = '0x20ABe07F7bbEC816e309e906a823844e7aE37b8d';
//   const contractWithSigner = new Contract(contractAddress, NFT_CONTRACT, ownerWallet);
//   const ownerNFTs = await getNFTsByAddress(ownerWallet.address);
//   if (ownerNFTs.length > 0) {
//     const tx = await contractWithSigner.transferFrom(ownerWallet.address, store('address'), ownerNFTs[0].tokenId);
//     await tx.wait(2);
//     snackbarStore.show({
//       message: `成功领取到 TokenId 为 ${ownerNFTs[0].tokenId} 的 NFT`,
//       duration: 3000,
//     });
//     const myNFTs = await getNFTsByAddress(store('address') || '');
//     state.myNFTs = myNFTs;
//   }
// };

export const init = () => {
  const disposes: Array<() => unknown> = [];

  when(() => configService.state.inited).then(() => {
    const dispose = reaction(
      () => {
        if (keyService.state.keys?.type === 'mixin') {
          return {
            mixinUserId: keyService.state.keys.user.mixin.mixin_userid,
            address: keyService.state.keys.appUser.eth_address,
          };
        }
      },
      (data) => {
        if (!data) {
          runInAction(() => {
            state.hasNFT = false;
          });
          return;
        }
        checkNFTPermission(data.mixinUserId);
      },
    );
    disposes.push(dispose);
  });

  return () => disposes.forEach((v) => v());
};

export const nftService = {
  state,
  init,

  checkNFTPermission,
  loadNFT,
};
