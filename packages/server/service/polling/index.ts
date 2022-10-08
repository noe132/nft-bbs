import QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { GroupStatus } from '~/orm/entity';
import { PollingTask } from '~/utils';
import { pollingTask } from './pollingContent';

const state = {
  map: new Map<string, PollingTask>(),
};

const initData = async () => {
  const groupStatus = await GroupStatus.list();
  QuorumLightNodeSDK.cache.Group.clear();
  groupStatus.forEach((v) => {
    QuorumLightNodeSDK.cache.Group.add(v.seedUrl);
  });
  updatePollingTasks();
};

const updatePollingTasks = () => {
  const groups = QuorumLightNodeSDK.cache.Group.list();
  groups.forEach((group) => {
    if (state.map.has(group.groupId)) {
      return;
    }
    const task = new PollingTask(async () => {
      await pollingTask(group);
    }, 2000);
    state.map.set(group.groupId, task);
  });

  Array.from(state.map.keys())
    .filter((groupId) => groups.some((group) => group.groupId === groupId))
    .forEach((groupId) => {
      const task = state.map.get(groupId);
      if (task) {
        task.stop();
      }
      state.map.delete(groupId);
    });
};

const addGroup = (seedUrl: string) => {
  QuorumLightNodeSDK.cache.Group.add(seedUrl);
  updatePollingTasks();
};

const init = () => {
  initData();

  return () => 1;
};

export const pollingService = {
  init,
  state,
  addGroup,
};
