import { FastifyRegister } from 'fastify';
import { config } from '~/config';

export const configController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/', () => ({
    group: config.group,
    admin: config.admin ?? [],
    fixedSeed: config.fixedSeed,
  }));

  done();
};
