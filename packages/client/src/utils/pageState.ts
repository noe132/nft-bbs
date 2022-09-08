import { observable } from 'mobx';

export const pageStateMap = new Map<string, Map<string, unknown>>();

// eslint-disable-next-line @typescript-eslint/ban-types
export const usePageState = <T extends object>(pageName: string, key: string, init: () => T) => {
  if (!pageStateMap.has(pageName)) {
    pageStateMap.set(pageName, new Map());
  }
  const pageMap = pageStateMap.get(pageName)!;
  if (!pageMap.has(key)) {
    pageMap.set(key, observable(init()));
  }
  return pageMap.get(key)! as T;
};
