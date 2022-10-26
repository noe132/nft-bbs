import axios from 'axios';
import { FastifyRegister } from 'fastify';
import { string, type } from 'io-ts';
import { cache } from 'quorum-light-node-sdk-nodejs';
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

    for (const api of group!.chainAPIs) {
      const apiURL = new URL(api);
      try {
        const res = await axios.post<{ trx_id: string }>(
          `${apiURL.origin}/api/v1/node/trx/${body.groupId}`,
          { TrxItem: body.TrxItem },
          {
            headers: {
              Authorization: `Bearer ${apiURL.searchParams.get('jwt') || ''}`,
            },
          },
        );
        return res.data;
      } catch (e) {
        continue;
      }
    }

    throw new ServiceUnavailable('no api was reachable');
  });
  done();
};
