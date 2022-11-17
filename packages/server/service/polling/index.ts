import QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { GroupStatus } from '~/orm/entity';
import { PollingTask } from '~/utils';
import { pollingTask } from './pollingContent';

const state = {
  map: new Map<number, PollingTask>(),
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
      QuorumLightNodeSDK.cache.Group.add(u);
    });

    const task = new PollingTask(
      () => pollingTask(group.id),
      2000,
    );
    state.map.set(group.id, task);
  });

  Array.from(state.map.keys())
    .filter((id) => groups.every((group) => group.id !== id))
    .forEach((id) => {
      const task = state.map.get(id);
      if (task) { task.stop(); }
      state.map.delete(id);
    });
};

const deleteTask = async (group: GroupStatus) => {
  const task = state.map.get(group.id);
  if (!task) { return; }
  await task.stop();
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
    QuorumLightNodeSDK.cache.Group.add(u);
  });
  const task = new PollingTask(
    () => pollingTask(group.id),
    2000,
  );
  state.map.set(group.id, task);
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
