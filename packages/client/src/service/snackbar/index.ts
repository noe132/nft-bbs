import { either } from 'fp-ts';
import { action, observable } from 'mobx';
import { ResponseError } from '~/request';
import type {
  SnackbarItemData,
  SnackbarItemParam,
  ShowFunction,
} from './types';
import { formatParams } from './utils';

export * from './types';

const state = observable({
  queue: observable([], { deep: false }) as Array<SnackbarItemData>,
});

const add = action((item: SnackbarItemData) => {
  if (item.urgent) {
    state.queue.unshift(item);
  } else {
    state.queue.push(item);
  }
});

/** 显示普通 snackbar */
const show: ShowFunction = (p1: SnackbarItemParam | string, p2?: number) => {
  const item = formatParams('plain', p1, p2);
  item.nonBlocking = item.nonBlocking ?? true;
  add(item);
};

/** 显示 error snackbar */
const error: ShowFunction = (p1: SnackbarItemParam | string, p2?: number) => {
  const item = formatParams('error', p1, p2);
  item.urgent = true;
  add(item);
};

/** 显示 error snackbar */
const networkError = (err: string | ResponseError | either.Left<ResponseError>, p2?: SnackbarItemParam) => {
  let message: string;
  if (typeof err === 'string') {
    message = err;
  } else {
    const error = '_tag' in err ? err.left : err;
    message = error.message;
  }
  const params = {
    ...p2,
    content: `网络请求错误 (${message})`,
  };
  const item = formatParams('error', params);
  item.urgent = true;
  add(item);
};

export const snackbarService = {
  state,

  show,
  error,
  networkError,
};
