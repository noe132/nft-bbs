import * as rumsdk from 'rum-sdk-nodejs';
import { GroupStatus } from '~/orm/entity';
import { PollingTask } from '~/utils';
import { pollingAppConfigTask, pollingContentTask } from './pollingTask';

export const INTERVAL = {
  APPCONFIG: 60000,
  CONTENT: 2000,
};

const state = {
  map: new Map<number, Array<PollingTask>>(),
};

const updatePollingTasks = async () => {
  const groups = await GroupStatus.list();

  groups.forEach((group) => {
    if (state.map.has(group.id)) { return; }
    const seedUrls = [
      group.mainSeedUrl,
      group.commentSeedUrl,
      group.counterSeedUrl,
      group.profileSeedUrl,
    ];
    seedUrls.filter((v) => v).forEach((u) => {
      rumsdk.cache.Group.add(u);
    });

    state.map.set(group.id, [
      new PollingTask(
        () => pollingAppConfigTask(group.id),
        INTERVAL.APPCONFIG,
      ),
      new PollingTask(
        () => pollingContentTask(group.id),
        INTERVAL.CONTENT,
      ),
    ]);
  });

  Array.from(state.map.keys())
    .filter((id) => groups.every((group) => group.id !== id))
    .forEach((id) => {
      const tasks = state.map.get(id);
      if (tasks) {
        tasks.map((v) => v.stop());
      }
      state.map.delete(id);
    });
};

const deleteTask = async (group: GroupStatus) => {
  const tasks = state.map.get(group.id);
  if (!tasks) { return; }
  await Promise.all(
    tasks.map((v) => v.stop()),
  );
  state.map.delete(group.id);
};

const updateTask = async (group: GroupStatus) => {
  await deleteTask(group);
  const seedUrls = [
    group.mainSeedUrl,
    group.commentSeedUrl,
    group.counterSeedUrl,
    group.profileSeedUrl,
  ];
  seedUrls.filter((v) => v).forEach((u) => {
    const seedGroup = rumsdk.utils.seedUrlToGroup(u);
    rumsdk.cache.Group.remove(seedGroup.groupId);
    rumsdk.cache.Group.add(u);
  });
  state.map.set(group.id, [
    new PollingTask(
      () => pollingAppConfigTask(group.id),
      INTERVAL.APPCONFIG,
    ),
    new PollingTask(
      () => pollingContentTask(group.id),
      INTERVAL.CONTENT,
    ),
  ]);
};

const init = () => {
  updatePollingTasks();
  return () => 1;
};

export const pollingService = {
  init,
  state,
  updatePollingTasks,
  deleteTask,
  updateTask,
};
