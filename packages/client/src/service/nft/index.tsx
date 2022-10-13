import { either, taskEither, function as fp } from 'fp-ts';
import { action, observable, reaction, runInAction, when } from 'mobx';
import { MVMApi } from '~/apis';
import { keyService } from '~/service/key';
import { configService } from '~/service/config';

const state = observable({
  hasNFT: false,

  nftMap: new Map<string, MVMApi.NFTsResponse['data']>(),
  loadingMap: new Map<string, Promise<unknown>>(),

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
  if (state.nftMap.has(address)) { return; }
  if (state.loadingMap.has(address)) {
    return state.loadingMap.get(address);
  }
  const clear = () => {
    state.loadingMap.delete(address);
  };
  const run = fp.pipe(
    () => MVMApi.getNFTs(address),
    taskEither.map(action((res) => {
      state.nftMap.set(address, res.data);
    })),
    taskEither.matchW(clear, clear),
  );
  const p = run();
  state.loadingMap.set(address, p);
  return p;
};

// const loadNFT = async (address: string) => {
//   if (state.hasNFTMap.has(address)) { return; }
//   if (state.hasNFTLoadingMap.has(address)) {
//     return state.hasNFTLoadingMap.get(address);
//   }
//   const run = taskEither.tryCatch(
//     async () => {
//       const provider = new ethers.providers.JsonRpcProvider('https://eth-rpc.rumsystem.net/');
//       const contractAddress = '0x20ABe07F7bbEC816e309e906a823844e7aE37b8d';
//       const contractWithSigner = new ethers.Contract(contractAddress, NFT_CONTRACT, provider);
//       const tx: BigNumber = await contractWithSigner.balanceOf(address);
//       const has = !tx.eq(0);
//       state.hasNFTMap.set(address, has);
//       state.hasNFTLoadingMap.delete(address);
//     },
//     (e) => e as Error,
//   );
//   const p = run();
//   state.hasNFTLoadingMap.set(address, p);
//   return p;
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
        loadNFT(data.address);
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
