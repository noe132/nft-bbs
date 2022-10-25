import { NavigateFunction } from 'react-router-dom';

export const state = {
  navigate: null as null | NavigateFunction,
};

const navigate: NavigateFunction = (...args: readonly [any]) => {
  if (state.navigate) {
    state.navigate(...args);
  }
};

export const routerService = {
  state,
  navigate,
};
