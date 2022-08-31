import io from 'socket.io-client';
import type { SocketIOEventMap } from 'nft-bbs-server';
import { keyService } from '~/service/key';

export type SocketEventListeners = {
  [K in keyof SocketIOEventMap]: (v: SocketIOEventMap[K]) => unknown
};

export const initSocket = (listeners: SocketEventListeners) => {
  const socket = io(`ws${location.protocol.slice(4)}//${location.hostname}:8002/`);

  socket.emit('authenticate', keyService.state.keys.address);

  socket.on('authenticateResult', (result: string) => {
    // eslint-disable-next-line no-console
    console.log(result);
  });

  Object.entries(listeners).forEach(([k, v]) => {
    socket.on(k, v);
  });
};
