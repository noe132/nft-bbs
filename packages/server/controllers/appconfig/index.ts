import { FastifyRegister } from 'fastify';
import { type, string } from 'io-ts';
import { assertValidation, parseIntAssert } from '~/utils';
import { appConfigService } from '~/service/appconfig';

export const appconfigController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId', (req) => {
    const params = assertValidation(req.params, type({
      groupId: string,
    }));
    const groupId = parseIntAssert(params.groupId);
    return appConfigService.state.map[groupId] || {};
  });

  done();
};
