import { observable } from 'mobx';

export const pageStateMap = new Map<string, Map<string, unknown>>();

/* eslint-disable @typescript-eslint/ban-types */
interface UsePageState {
  <T extends object>(pageName: string, key: string, init: () => T): T
  <T extends object>(pageName: string, key: string, readonly: 'readonly', init: () => T): T | undefined
}

export const usePageState: UsePageState = <T extends object>(
  pageName: string,
  key: string,
  readonly: 'readonly' | (() => T),
  init?: () => T,
) => {
  const isReadonly = readonly === 'readonly';
  const initFunc = init ?? readonly as () => T;
  if (!isReadonly && !pageStateMap.has(pageName)) {
    pageStateMap.set(pageName, new Map());
  }
  const pageMap = pageStateMap.get(pageName);
  if (!pageMap && isReadonly) { return undefined; }
  if (!isReadonly && !pageMap!.has(key)) {
    pageMap!.set(key, observable(initFunc()));
  }
  return pageMap?.get(key);
};
