import { useState, useEffect, useRef } from 'react';
import { observable } from 'mobx';

interface PageStateMapItem {
  state: unknown
  nonce: number
  listeners: Array<() => unknown>
}

const pageStateMap = new Map<string, PageStateMapItem>();

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
  const compositedKey = `${pageName}-${key}`;
  if (!pageStateMap.has(compositedKey)) {
    pageStateMap.set(compositedKey, {
      state: null,
      nonce: 0,
      listeners: [],
    });
  }
  const item = pageStateMap.get(compositedKey)!;
  if (!readonly && !item.state) {
    item.state = observable(init());
    if (item.listeners) {
      setTimeout(() => {
        item.listeners.forEach((v) => v());
      });
    }
  }
  const updateRef = useRef(() => {
    item.nonce += 1;
    setState(item.nonce);
  });
  const [_, setState] = useState(0);
  if (!item.listeners.includes(updateRef.current)) {
    item.listeners.push(updateRef.current);
  }

  useEffect(() => () => {
    const index = item.listeners.indexOf(updateRef.current);
    if (index !== -1) {
      item.listeners.splice(index, 1);
    }
  }, []);

  return item.state;
};

export const getPageStateByPageName = <T = unknown>(pageName: string) => {
  const items = Array.from(pageStateMap.entries())
    .filter(([k]) => k.startsWith(`${pageName}-`))
    .map(([_, v]) => v);

  return items as Array<T>;
};
