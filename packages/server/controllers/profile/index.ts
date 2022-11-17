import { FastifyRegister } from 'fastify';
import { type, string } from 'io-ts';
import { NotFound } from 'http-errors';
import { Profile } from '~/orm';
import { assertValidation, parseIntAssert } from '~/utils';

export const profileController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId/userAddress/:userAddress', async (req) => {
    const params = assertValidation(req.params, type({
      groupId: string,
      userAddress: string,
    }));
    const groupId = parseIntAssert(params.groupId);
    const profile = await Profile.get({
      groupId,
      userAddress: params.userAddress,
    });
    if (!profile) {
      throw new NotFound();
    }
    return profile;
  });

  fastify.get('/:groupId/trxId/:trxId', async (req) => {
    const params = assertValidation(req.params, type({
      groupId: string,
      trxId: string,
    }));
    const groupId = parseIntAssert(params.groupId);
    const profile = await Profile.get({
      groupId,
      trxId: params.trxId,
    });
    if (!profile) {
      throw new NotFound();
    }
    return profile;
  });

  done();
};
