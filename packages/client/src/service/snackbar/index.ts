import axios, { AxiosError } from 'axios';
import { action, observable } from 'mobx';
import { lang } from '~/utils';
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
const networkError = (err: string | AxiosError<any> | Error, p2?: SnackbarItemParam) => {
  let message: string;
  if (typeof err === 'string') {
    message = err;
  } else if (err instanceof axios.AxiosError) {
    // TODO: fix https://github.com/axios/axios/issues/5062
    message = err.response?.data?.message
      ?? err.response?.data?.error
      ?? err.message;
  } else {
    message = err.message;
  }
  const params = {
    ...p2,
    content: `${lang.common.networkError} (${message})`,
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
