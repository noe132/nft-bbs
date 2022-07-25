import { EventEmitter } from 'events';
import { IContent } from 'quorum-light-node-sdk';
import { INotification } from '~/database';

interface EventMap {
  content: IContent
  loadedData: undefined
  notification: INotification
}

type CheckVoid<T> = T extends undefined ? [] : [T];

class Bus extends EventEmitter {
  public on<K extends keyof EventMap>(type: K, listener: ((ev: EventMap[K]) => unknown)) {
    return super.on(type, listener);
  }

  public off<K extends keyof EventMap>(type: K, listener: ((ev: EventMap[K]) => unknown)) {
    return super.off(type, listener);
  }

  public emit<K extends keyof EventMap>(type: K, ...args: CheckVoid<EventMap[K]>) {
    return super.emit(type, ...args);
  }
}

export const bus = new Bus();
