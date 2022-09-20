import { observable } from 'mobx';

export const pageStateMap = new Map<string, Map<string, unknown>>();

/* eslint-disable @typescript-eslint/ban-types */
interface UsePageState {
  <T extends object>(pageName: string, key: string, init: () => T): T
  <T extends object>(pageName: string, key: string, init: () => T, readonly: 'readonly'): T | undefined
}

export const usePageState: UsePageState = <T extends object>(
  pageName: string,
  key: string,
  init: () => T,
  readonly?: 'readonly',
) => {
  if (!readonly && !pageStateMap.has(pageName)) {
    pageStateMap.set(pageName, new Map());
  }
  const pageMap = pageStateMap.get(pageName);
  if (!pageMap && readonly) { return undefined; }
  if (!readonly && !pageMap!.has(key)) {
    pageMap!.set(key, observable(init()));
  }
  return pageMap?.get(key);
};
