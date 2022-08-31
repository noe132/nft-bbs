import { FastifyRegister } from 'fastify';
import { type, string } from 'io-ts';
import { NotFound } from 'http-errors';
import { Profile } from '~/orm';
import { assertValidation } from '~/utils';

export const profileController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId/:userAddress', async (req) => {
    const params = assertValidation(type({
      groupId: string,
      userAddress: string,
    }).decode(req.params));
    const profile = await Profile.get({
      groupId: params.groupId,
      userAddress: params.userAddress,
    });
    if (!profile) {
      throw new NotFound();
    }
    return profile;
  });

  done();
};
