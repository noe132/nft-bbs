import { FastifyRegister } from 'fastify';
import { type, string } from 'io-ts';
import { BadRequest } from 'http-errors';
import QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { either } from 'fp-ts';
import { assertValidation } from '~/utils';
import { GroupSeed, GroupStatus } from '~/orm/entity';
import { pollingService } from '~/service';

export const groupController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/', async () => {
    const groups = await GroupStatus.list();

    return groups.map((v) => {
      const group = QuorumLightNodeSDK.utils.seedUrlToGroup(v.seedUrl);
      return {
        groupId: group.groupId,
        groupName: group.groupName,
        seedUrl: v.seedUrl,
      };
    });
  });

  fastify.post('/join', async (req) => {
    const body = assertValidation(
      req.body,
      type({ seedUrl: string }),
    );
    const seedUrl = body.seedUrl;

    const seed = either.tryCatch(
      () => QuorumLightNodeSDK.utils.seedUrlToGroup(seedUrl),
      (v) => v as Error,
    );

    if (either.isLeft(seed)) {
      throw new BadRequest('invalid seed url');
    }
    if (!seed.right.chainAPIs.length) {
      throw new BadRequest('no chainAPIs in seedurl');
    }

    const groupId = seed.right.groupId;
    const existedGroupStatus = await GroupStatus.get(seed.right.groupId);
    if (existedGroupStatus?.seedUrl === seedUrl) {
      return {
        status: 0,
        msg: `group ${groupId} already joined`,
      };
    }
    const existedGroupSeed = await GroupSeed.has(seedUrl);
    if (existedGroupSeed) {
      await GroupSeed.add({
        groupId,
        seedUrl,
      });
    } else {
      return {
        status: 0,
        msg: `group ${groupId} already joined`,
      };
    }

    if (!existedGroupStatus) {
      await GroupStatus.add({
        groupId,
        seedUrl,
        startTrx: '',
      });

      pollingService.addGroup(groupId, seedUrl);

      return {
        status: 0,
        msg: `group ${groupId} joined`,
      };
    }

    const allGroupSeeds = await GroupSeed.get(groupId);
    const apiMap: Record<string, string> = {};
    allGroupSeeds.forEach((groupSeeds) => {
      const { chainAPIs } = QuorumLightNodeSDK.utils.seedUrlToGroup(groupSeeds.seedUrl);
      chainAPIs.forEach((api) => {
        const origin = new URL(api).origin;
        apiMap[origin] = api;
      });
    });
    const combinedApis = Object.values(apiMap).join('|');
    const seedUrlObj = new URL(existedGroupStatus.seedUrl);
    seedUrlObj.searchParams.set('u', combinedApis);
    const combinedSeedUrl = seedUrlObj.toString();

    await GroupStatus.update(groupId, {
      seedUrl: combinedSeedUrl,
    });
    pollingService.addGroup(groupId, combinedSeedUrl);

    return {
      status: 0,
      msg: `group ${groupId} joined, apis combined`,
    };
  });

  done();
};
