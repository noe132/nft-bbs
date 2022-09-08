import io from 'socket.io-client';
import type { SocketIOEventMap } from 'nft-bbs-server';

export type SocketEventListeners = {
  [K in keyof SocketIOEventMap]: (v: SocketIOEventMap[K]) => unknown
};

const socket = io(`ws${location.protocol.slice(4)}//${location.hostname}:${location.port}/`, {
  transports: ['websocket'],
});

socket.on('authenticateResult', (result: string) => {
  // eslint-disable-next-line no-console
  console.log(result);
});

const addListeners = (listeners: Partial<SocketEventListeners>) => {
  Object.entries(listeners).forEach(([k, v]) => {
    socket.on(k, v);
  });
  return () => {
    Object.entries(listeners).forEach(([k, v]) => {
      socket.off(k, v);
    });
  };
};

const authenticate = (address: string) => {
  socket.emit('authenticate', address);
};

const logout = () => {
  socket.emit('logout');
};


export const socketService = {
  addListeners,
  authenticate,
  logout,
};
