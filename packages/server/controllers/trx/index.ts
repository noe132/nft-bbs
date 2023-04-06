import { FastifyRegister } from 'fastify';
import { string, type } from 'io-ts';
import { chain, cache } from 'rum-sdk-nodejs';
import { BadRequest, ServiceUnavailable } from 'http-errors';
import { assertValidation } from '~/utils';
import { either, json, function as fp } from 'fp-ts';

const signedTrxType = type({
  trx_id: string,
  group_id: string,
  data: string,
  timestamp: string,
  version: string,
  sender_pubkey: string,
  sender_sign: string,
});

export const trxController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.post('/', async (req) => {
    const body = assertValidation(req.body, type({
      groupId: string,
      trxItem: string,
    }));

    const group = cache.Group.get(body.groupId);
    if (!group) {
      throw new BadRequest(`group ${body.groupId} not found`);
    }

    const trxItem = fp.pipe(
      json.parse(body.trxItem),
      either.chainW((v) => signedTrxType.decode(v)),
    );

    if (either.isLeft(trxItem)) {
      throw new BadRequest('invalid trx');
    }

    try {
      // TODO:
      const res = await chain.Trx.send(body.groupId, trxItem.right);
      return res;
    } catch (e) {
      throw new ServiceUnavailable('no api was reachable');
    }
  });
  done();
};
