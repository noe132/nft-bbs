import { FastifyRegister } from 'fastify';
import { type, string, number } from 'io-ts';
import { NotFound } from 'http-errors';
import { Profile, TempProfile } from '~/orm';
import { assertValidation, assertVerifySign, parseIntAssert } from '~/utils';

export const profileController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId/userAddress/:userAddress', async (req): Promise<Profile> => {
    const params = assertValidation(req.params, type({
      groupId: string,
      userAddress: string,
    }));
    const groupId = parseIntAssert(params.groupId);
    const userAddress = params.userAddress;
    const profile = await Profile.get({ groupId, userAddress });
    if (profile) {
      return profile;
    }
    const tempProfile = await TempProfile.get({ groupId, userAddress });
    if (tempProfile) {
      return TempProfile.toProfile(tempProfile);
    }
    return Profile.generateFallbackProfile({ groupId, userAddress });
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

  fastify.post('/temp', async (req) => {
    const body = assertValidation(req.body, type({
      groupId: number,
      name: string,
      avatar: string,

      address: string,
      nonce: number,
      sign: string,
    }));

    assertVerifySign(body);

    const tempProfile = await TempProfile.put({
      avatar: body.avatar,
      groupId: body.groupId,
      name: body.name,
      userAddress: body.address,
    });
    return TempProfile.toProfile(tempProfile);
  });

  done();
};
