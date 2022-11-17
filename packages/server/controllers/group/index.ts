import { FastifyRegister } from 'fastify';
import { either, function as fp } from 'fp-ts';
import { number, string, type } from 'io-ts';
import { BadRequest } from 'http-errors';
import QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';

import { Comment, Counter, GroupStatus, ImageFile, Notification, Post, Profile, StackedCounter, TrxSet } from '~/orm/entity';
import { assertAdmin, assertValidation, assertVerifySign, runLoading } from '~/utils';
import { AppDataSource } from '~/orm/data-source';
import { pollingService } from '~/service';

const loadingMap = new Map<number, boolean>();

export const groupController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/', async () => {
    const groups = await GroupStatus.list();
    return groups;
  });

  fastify.post('/add', async (req) => {
    const body = assertValidation(req.body, type({
      shortName: string,
      mainSeedUrl: string,
      commentSeedUrl: string,
      counterSeedUrl: string,
      profileSeedUrl: string,
      address: string,
      nonce: number,
      sign: string,
    }));

    assertVerifySign(body);
    assertAdmin(body.address);

    if (!body.mainSeedUrl) {
      return new BadRequest('main seed url cannot be empty');
    }

    const result = either.sequenceArray([
      body.mainSeedUrl,
      body.commentSeedUrl,
      body.counterSeedUrl,
      body.profileSeedUrl,
    ].map((v) => validateSeed(v)));

    if (either.isLeft(result)) {
      throw new BadRequest(result.left.message);
    }

    await assertShortNameDuplication(body.shortName);

    const item = await GroupStatus.add({
      shortName: body.shortName,
      mainSeedUrl: body.mainSeedUrl,
      commentSeedUrl: body.commentSeedUrl,
      counterSeedUrl: body.counterSeedUrl,
      profileSeedUrl: body.profileSeedUrl,
      mainStartTrx: '',
      commentStartTrx: '',
      counterStartTrx: '',
      profileStartTrx: '',
      loaded: false,
    });

    await pollingService.updateTask(item);

    return item;
  });

  fastify.post('/delete', async (req) => {
    const body = assertValidation(req.body, type({
      address: string,
      nonce: number,
      sign: string,

      id: number,
    }));

    assertVerifySign(body);
    assertAdmin(body.address);

    const group = await GroupStatus.get(body.id);
    if (!group) {
      throw new BadRequest(`group ${body.id} not found`);
    }

    if (loadingMap.get(group.id)) {
      throw new BadRequest('job is already running');
    }

    await pollingService.deleteTask(group);
    await deleteGroupData(group, 'delete');

    return { status: 0 };
  });

  fastify.post('/update', async (req) => {
    const body = assertValidation(req.body, type({
      address: string,
      nonce: number,
      sign: string,

      id: number,
      shortName: string,
      mainSeedUrl: string,
      commentSeedUrl: string,
      counterSeedUrl: string,
      profileSeedUrl: string,
    }));

    assertVerifySign(body);
    assertAdmin(body.address);

    const group = await GroupStatus.get(body.id);
    if (!group) {
      throw new BadRequest(`group ${body.id} not found`);
    }

    if (loadingMap.get(group.id)) {
      throw new BadRequest('job is already running');
    }

    await assertShortNameDuplication(body.shortName, group.id);

    const result = either.sequenceArray([
      body.mainSeedUrl,
      body.commentSeedUrl,
      body.counterSeedUrl,
      body.profileSeedUrl,
    ].map((v) => validateSeed(v)));
    if (either.isLeft(result)) {
      throw new BadRequest(result.left.message);
    }
    group.shortName = body.shortName;
    group.mainSeedUrl = body.mainSeedUrl;
    group.commentSeedUrl = body.commentSeedUrl;
    group.counterSeedUrl = body.counterSeedUrl;
    group.profileSeedUrl = body.profileSeedUrl;
    group.mainStartTrx = '';
    group.commentStartTrx = '';
    group.counterStartTrx = '';
    group.profileStartTrx = '';
    group.loaded = false;

    await pollingService.deleteTask(group);
    await deleteGroupData(group, 'update');
    await pollingService.updateTask(group);

    return group;
  });

  done();
};

const assertShortNameDuplication = async (shortName: string, groupId?: GroupStatus['id']) => {
  if (!shortName) { return; }
  const query = AppDataSource.manager.createQueryBuilder()
    .select('g')
    .from(GroupStatus, 'g')
    .where('"shortName" = :shortName', { shortName });

  if (groupId) {
    query.andWhere('"id" != :groupId', { groupId });
  }

  const count = await query.getCount();

  if (count !== 0) {
    throw new BadRequest('shortName is already used by another group');
  }
};

const validateSeed = (seedUrl: string) => fp.pipe(
  either.tryCatch(
    () => QuorumLightNodeSDK.utils.seedUrlToGroup(seedUrl),
    () => new Error(`invalid seedurl ${seedUrl}`),
  ),
  either.chainW((v) => {
    if (!v.chainAPIs.length) {
      return either.left(new Error(`no chianAPI in seedurl ${seedUrl}`));
    }
    return either.right(v);
  }),
);

const deleteGroupData = async (group: GroupStatus, groupStausType: 'update' | 'delete') => {
  await runLoading(
    (l) => loadingMap.set(group.id, l),
    async () => {
      await AppDataSource.manager.transaction(async (manager) => {
        const groupId = group.id;
        await manager.save(GroupStatus, group);
        const entities = [Comment, Counter, ImageFile, Notification, Post, Profile, StackedCounter, TrxSet];
        const promiese = entities.map(async (v) => {
          await manager.createQueryBuilder()
            .delete()
            .from(v)
            .where('groupId = :groupId', { groupId })
            .execute();
        });
        if (groupStausType === 'update') {
          await manager.save(GroupStatus, group);
        }
        if (groupStausType === 'delete') {
          await manager.createQueryBuilder()
            .delete()
            .from(GroupStatus)
            .where('id = :groupId', { groupId })
            .execute();
        }
        await Promise.all(promiese);
      });
    },
  );
};

// const combineSeed = () => {
//   const allGroupSeeds = await GroupSeed.get(groupId);
//   const apiMap: Record<string, string> = {};
//   allGroupSeeds.forEach((groupSeeds) => {
//     const { chainAPIs } = QuorumLightNodeSDK.utils.seedUrlToGroup(groupSeeds.seedUrl);
//     chainAPIs.forEach((api) => {
//       const origin = new URL(api).origin;
//       apiMap[origin] = api;
//     });
//   });
//   const combinedApis = Object.values(apiMap).join('|');
//   const seedUrlObj = new URL(existedGroupStatus.seedUrl);
//   seedUrlObj.searchParams.set('u', combinedApis);
//   const combinedSeedUrl = seedUrlObj.toString();
// };
