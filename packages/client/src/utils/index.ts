import { runInAction } from 'mobx';
import store from 'store2';

export * from './ago';
export * from './compressImage';
export * from './constants';
export * from './markdown';
export * from './pageState';
export * from './setClipboard';
export * from './theme';
export * from './useScreenSize';

export const isMobile = () => window.innerWidth < 960;

export const sleep = (time?: number) => new Promise<void>((rs) => setTimeout(rs, time));

type SetLoading = (l: boolean) => unknown;
type UnknownFunction = (...p: Array<any>) => unknown;
// type LoadingHof = <T extends UnknownFunction>(
//   action: T,
// ) => (...args: Parameters<T>) => ReturnType<T>;
type LoadingHof = <T extends UnknownFunction>(action: T) => T;
type CreateLoadingWrapper = (setLoading: SetLoading) => LoadingHof;
/**
 * 返回一个 loadingHof.
 * 当有任意被 loadingHof 包裹的函数执行时调用 setLoading(true)
 * 仅当所有被 loadingHof 包裹的函数执完毕时调用 setLoading(false)
 */
export const createLoadingWrapper: CreateLoadingWrapper = (setLoading) => {
  const loadingSet = new Set();
  const loadingHof = (action: UnknownFunction) => (...args: Array<unknown>) => {
    const item = {};
    loadingSet.add(item);
    setLoading(!!loadingSet.size);
    const result = action(...args);
    Promise.resolve(result).finally(() => {
      loadingSet.delete(item);
      setLoading(!!loadingSet.size);
    });
    return result;
  };

  return loadingHof as LoadingHof;
};

type RunLoading = <T extends UnknownFunction>(s: SetLoading, fn: T) => Promise<ReturnType<T>>;
/**
 * 立即执行异步函数 fn。
 * 执行前调用 setLoading(true)，执行完毕调用 setLoading(false)
 */
export const runLoading: RunLoading = async (setLoading, fn) => {
  runInAction(() => setLoading(true));
  try {
    const result = await fn();
    return result as ReturnType<typeof fn>;
  } finally {
    runInAction(() => setLoading(false));
  }
};

/**
 * 返回原函数，但该函数在连续多次调用时，首次调用未resolve时，返回缓存的 promise
 */
export const cachePromiseHof = <T extends (...args: Array<any>) => unknown>(
  fn: T,
) => {
  let promise: null | Promise<unknown> = null;

  return ((...args) => {
    if (promise) {
      return promise;
    }
    promise = Promise.resolve(fn(...args));
    promise.finally(() => {
      promise = null;
    });
    return promise;
  }) as T;
};

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export const createPromise = <T extends unknown = void>() => {
  let rs!: (v: T) => unknown;
  let rj!: (v: any) => unknown;

  const p = new Promise<T>((resolve, reject) => {
    rs = resolve;
    rj = reject;
  });

  return { p, rs, rj };
};

export const chooseImgByPixelRatio = (params: { x1: string, x2?: string, x3?: string }) => {
  const ratio = window.devicePixelRatio;
  if (ratio >= 3 && params.x3) {
    return params.x3;
  }
  if (ratio >= 2 && params.x2) {
    return params.x2;
  }
  return params.x1;
};

export const notNullFilter = <T>(v: T | undefined | null): v is T => !!v;


export interface LoginState {
  seedUrl: string
  mixinJWT: string
  keystore: string
  password: string
  autoLogin: null | 'keystore' | 'mixin'
}
export const getLoginState = () => {
  const loginState: LoginState = store('login_state') || {
    seedUrl: '',
    mixinJWT: '',
    keystore: '',
    password: '',
    autoLogin: null as null | 'keystore' | 'mixin',
  };

  return loginState;
};

export const setLoginState = (v: Partial<LoginState>) => {
  store('login_state', {
    ...getLoginState(),
    ...v,
  });
};
