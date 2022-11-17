import { FastifyRegister } from 'fastify';
import { type, string } from 'io-ts';
import { GroupInfo } from '~/orm';
import { assertValidation, parseIntAssert } from '~/utils';

export const groupInfoController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId', async (req) => {
    const params = assertValidation(req.params, type({ groupId: string }));
    const groupId = parseIntAssert(params.groupId);

    const data: GroupInfo = await GroupInfo.get(groupId) ?? {
      trxId: '',
      groupId,
      avatar: '',
      desc: '',
      timestamp: Date.now(),
    };
    return data;
  });

  done();
};
