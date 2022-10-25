import { FastifyRegister } from 'fastify';

const mixinLogin = !!process.env.MIXIN_LOGIN;
const anonymousLogin = !!process.env.ANONYMOUS;
const keystoreLogin = !!process.env.KEYSTORE_LOGIN;
const checkNFT = !!process.env.CHECK_NFT;
const seedUrl = process.env.SEED_URL ?? '';

export const configController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/', () => ({
    mixinLogin,
    keystoreLogin,
    anonymousLogin,
    checkNFT,
    seedUrl,
  }));

  done();
};
