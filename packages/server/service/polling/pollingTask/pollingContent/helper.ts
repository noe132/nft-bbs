import { either } from 'fp-ts';
import { IDecryptedContent } from 'rum-sdk-nodejs';
import { EntityManager } from 'typeorm';

import type { GroupStatus } from '~/orm';
import type { SendFn } from '~/service/socket';

export type GroupRoles = 'main' | 'comment' | 'counter' | 'profile';
export type TrxTypes = 'postDelete' | 'post' | 'comment' | 'like' | 'dislike' | 'image' | 'profile' | 'postAppend';
export type TrxHandler = (
  v: IDecryptedContent,
  groupStatus: GroupStatus,
  transactionManager: EntityManager,
  queueSocket: SendFn
) => Promise<either.Either<Error, boolean>>;
export type TaskItem = ReturnType<typeof getMergedTaskGroup>[number];

export const getMergedTaskGroup = (group: GroupStatus) => {
  const taskGroups: Array<{ seedUrl: string, roles: Array<GroupRoles> }> = [
    { seedUrl: group.mainSeedUrl, roles: ['main'] },
    { seedUrl: group.commentSeedUrl, roles: ['comment'] },
    { seedUrl: group.counterSeedUrl, roles: ['counter'] },
    { seedUrl: group.profileSeedUrl, roles: ['profile'] },
  ];

  // merge tasks
  for (let i = 0; i < taskGroups.length - 1; i += 1) {
    const item = taskGroups[i];
    const itemWithSameSeed = taskGroups.slice(i + 1).find((v) => v.seedUrl === item.seedUrl);
    if (itemWithSameSeed) {
      itemWithSameSeed.roles.forEach((v) => {
        item.roles.push(v);
      });
      const index = taskGroups.indexOf(itemWithSameSeed);
      taskGroups.splice(index, 1);
      i -= 1;
    }
  }

  return taskGroups;
};
