import { FastifyRegister } from 'fastify';
import { type, string } from 'io-ts';
import { BadRequest } from 'http-errors';
import QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { either } from 'fp-ts';
import { assertValidation } from '~/utils';
import { GroupStatus } from '~/orm/entity';
import { pollingService } from '~/service';

export const groupController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.post('/join', async (req) => {
    const body = assertValidation(
      req.body,
      type({ seedUrl: string }),
    );
    const seedUrl = body.seedUrl;

    const seed = either.tryCatch(
      () => QuorumLightNodeSDK.utils.restoreSeedFromUrl(seedUrl),
      (v) => v as Error,
    );

    if (either.isLeft(seed) || !seed.right.urls.length) {
      throw new BadRequest('invalid seed url');
    }

    const groupId = seed.right.group_id;

    if (await GroupStatus.has(groupId)) {
      return {
        status: 0,
        msg: `group ${groupId} already joined`,
      };
    }

    await GroupStatus.add({
      groupId,
      seedUrl,
      startTrx: '',
    });

    pollingService.addGroup(seedUrl);

    return {
      status: 0,
      msg: `group ${groupId} joined`,
    };
  });

  done();
};
