import { FastifyRegister } from 'fastify';
import { string, type } from 'io-ts';
import { chain, cache } from 'rum-sdk-nodejs';
import { BadRequest, ServiceUnavailable } from 'http-errors';
import { assertValidation } from '~/utils';

export const trxController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.post('/', async (req) => {
    const body = assertValidation(req.body, type({
      groupId: string,
      TrxItem: string,
    }));

    const group = cache.Group.get(body.groupId);
    if (!group) {
      throw new BadRequest(`group ${body.groupId} not found`);
    }

    try {
      const res = await chain.Trx.send(body.groupId, { TrxItem: body.TrxItem });
      return res;
    } catch (e) {
      throw new ServiceUnavailable('no api was reachable');
    }
  });
  done();
};
