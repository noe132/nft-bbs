import { FastifyRegister } from 'fastify';
import { boolean, number, string, type } from 'io-ts';
import { config } from '~/config';
import { GroupConfig } from '~/orm';
import { assertAdmin, assertValidation, assertVerifySign } from '~/utils';

export const configController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/', async () => {
    const items = await GroupConfig.list();
    const group = items.reduce<Record<number, GroupConfig>>(
      (p, c) => { p[c.groupId] = c; return p; },
      {},
    );
    return {
      defaultGroup: {
        keystore: !!config.defaultGroup?.keystore,
        mixin: !!config.defaultGroup?.mixin,
        anonymous: !!config.defaultGroup?.anonymous,
      },
      admin: config.admin ?? [],
      group,
    };
  });

  fastify.post('/list', (req) => {
    const body = assertValidation(req.body, type({
      address: string,
      nonce: number,
      sign: string,
    }));

    assertVerifySign(body);
    assertAdmin(body.address);

    return GroupConfig.list();
  });

  fastify.post('/set', async (req) => {
    const body = assertValidation(req.body, type({
      address: string,
      nonce: number,
      sign: string,

      groupId: number,
      keystore: boolean,
      mixin: boolean,
      anonymous: boolean,
      nft: string,
    }));

    assertVerifySign(body);
    assertAdmin(body.address);

    const item = await GroupConfig.set({
      groupId: body.groupId,
      keystore: body.keystore,
      mixin: body.mixin,
      anonymous: body.anonymous,
      nft: body.nft,
    });

    return item;
  });

  fastify.post('/delete', async (req) => {
    const body = assertValidation(req.body, type({
      address: string,
      nonce: number,
      sign: string,

      groupId: number,
    }));

    assertVerifySign(body);
    assertAdmin(body.address);

    await GroupConfig.delete(body.groupId);

    return { status: 0 };
  });

  done();
};
