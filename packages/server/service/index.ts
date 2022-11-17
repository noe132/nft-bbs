import { FastifyInstance } from 'fastify';
import { pollingService } from './polling';
import { socketService } from './socket';

export * from './socket';
export * from './polling';

const disposes: Array<() => unknown> = [];

export const initService = (fastify: FastifyInstance) => {
  [
    socketService.init(fastify),
    pollingService.init(),
  ].forEach((v) => {
    disposes.push(v);
  });
};

export const disposeService = () => {
  disposes.forEach((v) => v());
};
