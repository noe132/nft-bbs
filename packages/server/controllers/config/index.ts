import { FastifyRegister } from 'fastify';

const mixinLogin = process.env.NODE_ENV === 'development'
  ? true
  : !!process.env.MIXIN_LOGIN;

export const configController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/', () => ({
    mixinLogin,
  }));

  done();
};
