import { FastifyRegister } from 'fastify';

const mixinLogin = !!process.env.MIXIN_LOGIN;
const checkNFT = !!process.env.CHECK_NFT;

export const configController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/', () => ({
    mixinLogin,
    checkNFT,
  }));

  done();
};
