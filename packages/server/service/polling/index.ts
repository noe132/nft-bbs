import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { sleep } from '~/utils';
import { AppDataSource } from '~/orm/data-source';
import { GroupStatus } from '~/orm/entity/groupStatus';

import { send } from '~/service/socket';
import { handlePost } from './pollingContent/handlePost';
import { handleComment } from './pollingContent/handleComment';
import { handleCounter } from './pollingContent/handleCounter';
import { handleProfile } from './pollingContent/handleProfile';
import { handleGroupInfo } from './pollingContent/handleGroupInfo';
import { handleImage } from './pollingContent/handleImage';
import { groupLoadedMap } from './state';

const LIMIT = 100;

const handleContents = async (groupId: string, contents: Array<IContent>) => {
  try {
    for (const content of contents) {
      let type = '';
      try {
        type = JSON.parse(content.Data.content).type;
        pollingLog.info(`${content.TrxId} ${type} ✅`);
      } catch (err: any) {
        pollingLog.error(content);
        pollingLog.error(err);
        pollingLog.error(`${content.TrxId} ❌ ${err.message}`);
      }

      const queuedEvents: Array<Parameters<typeof send>[0]> = [];
      const queueSocket = (item: Parameters<typeof send>[0]) => {
        queuedEvents.push(item);
      };

      await AppDataSource.transaction(async (transactionManager) => {
        switch (type) {
          case 'post': await handlePost(content, transactionManager, queueSocket); break;
          case 'comment': await handleComment(content, transactionManager, queueSocket); break;
          case 'counter': await handleCounter(content, transactionManager, queueSocket); break;
          case 'profile': await handleProfile(content, transactionManager, queueSocket); break;
          case 'groupInfo': await handleGroupInfo(content, transactionManager, queueSocket); break;
          case 'image': await handleImage(content, transactionManager, queueSocket); break;
          default: break;
        }
        await GroupStatus.update(groupId, content.TrxId, transactionManager);
      });

      if (groupLoadedMap[content.GroupId]) {
        queuedEvents.forEach((v) => {
          send(v);
        });
      }
    }
  } catch (err) {
    log.error(err);
  }
};

let stop = false;

export const pollingContent = async (duration: number) => {
  const groups = await GroupStatus.list();
  QuorumLightNodeSDK.cache.Group.clear();
  groups.forEach((v) => {
    QuorumLightNodeSDK.cache.Group.add(v.seedUrl);
  });

  (async () => {
    while (!stop) {
      let hasContent = false;
      const groups = await GroupStatus.list();
      for (const group of groups) {
        try {
          const listOptions = {
            groupId: group.groupId,
            count: LIMIT,
            ...group?.startTrx ? { startTrx: group.startTrx } : {},
          };
          const contents = await QuorumLightNodeSDK.chain.Content.list(listOptions);
          if (contents.length > 0) {
            hasContent = true;
            await handleContents(group.groupId, contents);
          }
          if (contents.length === 0 || contents.length < LIMIT) {
            groupLoadedMap[group.groupId] = true;
          }
        } catch (err) {
          log.error(err);
        }
      }
      await sleep(duration * (hasContent ? 1 : 3));
    }
  })();
};

export const stopPolling = () => {
  stop = true;
};
