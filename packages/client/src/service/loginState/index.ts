import { observable, reaction } from 'mobx';
import { getLoginState, setLoginState } from './helper';

const iState = observable({
  saved: getLoginState(),
});

const init = () => {
  const dispose = reaction(
    () => JSON.stringify(iState.saved),
    () => setLoginState(iState.saved),
  );

  return dispose;
};

export const loginStateService = {
  init,
  get state() {
    return iState.saved;
  },
};
