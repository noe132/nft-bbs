import { FastifyInstance } from 'fastify';
import { pollingContent, stopPolling } from './polling';
import { disposeSocket, initSocket } from './socket';

export * from './socket';

export const initService = (fastify: FastifyInstance) => {
  initSocket(fastify);
  pollingContent(2000);
};

export const disposeService = () => {
  disposeSocket();
  stopPolling();
};
