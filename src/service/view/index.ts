import { action, observable } from 'mobx';
import { IPost, IProfile } from '~/database';

type Pages = ['postlist']
| [pageName: 'postdetail', post: IPost, commentTrx?: string]
| ['newpost']
| ['notification']
| ['userprofile', IProfile];

const state = observable({
  stack: [{ page: ['postlist'], id: 1 }] as Array<{ page: Pages, id: number }>,
  id: 1,
  get page() {
    return this.stack.at(-1)!;
  },
});

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

const back = action(() => {
  if (state.stack.length > 1) {
    state.stack.pop();
  }
});

const backToTop = action(() => {
  state.stack.length = 1;
});

export const viewService = {
  state,

  pushPage,
  back,
  backToTop,
};
