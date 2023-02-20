import assert from 'assert';
import { either, taskEither, function as fp } from 'fp-ts';
import * as rumsdk from 'rum-sdk-nodejs';

import { GroupStatus } from '~/orm/entity';
import { appConfigService } from '~/service/appconfig';
import { socketService } from '~/service/socket';

export const pollingAppConfigTask = async (groupStatusId: number) => {
  const groupStatus = await GroupStatus.get(groupStatusId);
  if (!groupStatus) { return; }

  await fp.pipe(
    taskEither.fromEither(
      either.tryCatch(
        () => rumsdk.utils.restoreSeedFromUrl(groupStatus.mainSeedUrl),
        (e) => e as Error,
      ),
    ),
    taskEither.chainW((seed) => {
      const groupId = seed.group_id;
      return fp.pipe(
        taskEither.tryCatch(
          () => rumsdk.chain.AppConfig.list({ groupId }),
          (e) => e as Error,
        ),
        taskEither.chainW((keyList) => {
          const tasks = keyList.map((key) => taskEither.tryCatch(
            () => rumsdk.chain.AppConfig.get({ groupId, key: key.Name }),
            (e) => e as Error,
          ));
          return taskEither.sequenceArray(tasks);
        }),
        taskEither.map((items) => {
          type AppConfigRecord = Record<string, rumsdk.IAppConfigItem>;
          const record = items.reduce<AppConfigRecord>((p, c) => {
            p[c.Name] = c;
            return p;
          }, {});
          const oldRecord = appConfigService.state.map[groupStatusId];
          const equal = fp.pipe(
            either.tryCatch(
              () => assert.deepStrictEqual(oldRecord, record),
              (e) => e as Error,
            ),
            either.matchW(() => false, () => true),
          );
          appConfigService.state.map[groupStatusId] = record;
          if (!equal) {
            socketService.send({
              groupId: groupStatusId,
              broadcast: true,
              event: 'appconfig',
              data: {
                groupId: groupStatusId,
                data: record,
              },
            });
          }
          return record;
        }),
      );
    }),
  )();
};
