import { FastifyRegister } from 'fastify';
import { type, string } from 'io-ts';
import { GroupInfo } from '~/orm';
import { assertValidation } from '~/utils';

export const groupInfoController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId', async (req) => {
    const params = assertValidation(type({ groupId: string }).decode(req.params));
    const data: GroupInfo = await GroupInfo.get(params.groupId) ?? {
      trxId: '',
      groupId: '',
      avatar: '',
      desc: '',
      timestamp: Date.now(),
    };
    return data;
  });

  done();
};
