import { FastifyRegister } from 'fastify';

export const rootController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/', () => 'app is running');
  done();
};
