import { action, observable, reaction, runInAction } from 'mobx';
import type { Post, Profile } from 'nft-bbs-server';

interface PageMap {
  postlist: undefined
  postdetail: {
    groupId: string
    trxId: string
    post: Post | null
    commentTrx?: string
  }
  newpost: Post | undefined
  notification: undefined
  userprofile: Profile
}

type PageType<T, U> = U extends undefined
  ? { name: T, value?: U }
  : { name: T, value: U };

type Pages = {
  [K in keyof PageMap]: PageType<K, PageMap[K]>
}[keyof PageMap];

const state = observable({
  stack: [{ page: { name: 'postlist' }, id: 1 }] as Array<{ page: Pages, id: number }>,
  id: 1,
  backPreventor: [] as Array<() => boolean | Promise<boolean>>,
  get page() {
    return this.stack.at(-1)!;
  },
}, { backPreventor: observable.shallow });

const genId = () => {
  state.id += 1;
  return state.id;
};

const pushPage = action((page: Pages) => {
  if (['notification', 'newpost'].includes(page.name)) {
    const index = state.stack.findIndex((v) => v.page.name === page.name);
    if (index !== -1) {
      const page = state.stack.splice(index, 1);
      state.stack.push(page[0]);
      return;
    }
  }
  state.stack.push({ page, id: genId() });
});

const canBack = async () => {
  for (const v of state.backPreventor) {
    const result = await v();
    if (!result) {
      return false;
    }
  }
  return true;
};

const back = async () => {
  if (state.stack.length <= 1) { return; }
  if (!await canBack()) { return; }
  runInAction(() => {
    state.stack.pop();
  });
};

const addBackPreventor = action((allowed: () => boolean | Promise<boolean>) => {
  state.backPreventor.unshift(allowed);
  return action(() => {
    const index = state.backPreventor.indexOf(allowed);
    if (index !== -1) {
      state.backPreventor.splice(index, 1);
    }
  });
});

const backToTop = async () => {
  if (!await canBack()) { return; }
  runInAction(() => {
    state.stack.length = 1;
  });
};

const init = () => {
  const dispose = reaction(
    () => state.page.page,
    () => {
      if (state.page.page.name === 'postdetail') {
        const groupId = state.page.page.value.groupId;
        const trxId = state.page.page.value.trxId;
        const pathname = `/post/${groupId}/${trxId}`;
        if (location.pathname !== pathname) {
          window.history.replaceState(null, '', pathname);
        }
      } else if (location.pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }
    },
  );

  return dispose;
};

export const viewService = {
  init,
  state,

  pushPage,
  addBackPreventor,
  back,
  backToTop,
};
