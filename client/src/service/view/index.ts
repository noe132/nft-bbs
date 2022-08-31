import { action, observable, runInAction } from 'mobx';
import type { Post, Profile } from 'nft-bbs-server';

type Pages = ['postlist']
| [pageName: 'postdetail', post: Post, commentTrx?: string]
| [pageName: 'newpost', post?: Post]
| ['notification']
| ['userprofile', Profile];

const state = observable({
  stack: [{ page: ['postlist'], id: 1 }] as Array<{ page: Pages, id: number }>,
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

const pushPage = action((...args: Pages) => {
  if (['notification', 'newpost'].includes(args[0])) {
    const index = state.stack.findIndex((v) => v.page[0] === args[0]);
    if (index !== -1) {
      const page = state.stack.splice(index, 1);
      state.stack.push(page[0]);
      return;
    }
  }
  state.stack.push({ page: args, id: genId() });
});

const back = async () => {
  if (state.stack.length <= 1) { return; }
  for (const v of state.backPreventor) {
    const result = await v();
    if (!result) {
      return;
    }
  }
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

const backToTop = action(() => {
  state.stack.length = 1;
});

export const viewService = {
  state,

  pushPage,
  addBackPreventor,
  back,
  backToTop,
};
