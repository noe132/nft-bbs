import { FastifyRegister } from 'fastify';
import { config } from '~/config';

export const configController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/', () => ({
    group: config.group,
    fixedSeed: config.fixedSeed,
  }));

  done();
};
