import { action, observable } from 'mobx';
import { IPost, IProfile } from '~/database';

type Pages = ['postlist']
| ['postdetail', IPost]
| ['newpost']
| ['notification']
| ['userprofile', IProfile];

const state = observable({
  stack: [['postlist']] as Array<Pages>,
  get page() {
    return this.stack.at(-1)!;
  },
});

const pushPage = action((...args: Pages) => {
  state.stack.push(args);
});

const back = action(() => {
  if (state.stack.length > 1) {
    state.stack.pop();
  }
});

export const viewService = {
  state,

  pushPage,
  back,
};
