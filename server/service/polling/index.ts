import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { sleep, store, LOADED_DATA_KEY } from '~/utils';
import { AppDataSource } from '~/orm/data-source';
import { GroupStatus } from '~/orm/entity/groupStatus';

import { handlePost } from './pollingContent/handlePost';
import { handleComment } from './pollingContent/handleComment';
import { handleCounter } from './pollingContent/handleCounter';
import { handleProfile } from './pollingContent/handleProfile';
import { handleGroupInfo } from './pollingContent/handleGroupInfo';
import { handleImage } from './pollingContent/handleImage';

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

      await AppDataSource.transaction(async (transactionManager) => {
        switch (type) {
          case 'post': await handlePost(content, transactionManager); break;
          case 'comment': await handleComment(content, transactionManager); break;
          case 'counter': await handleCounter(content, transactionManager); break;
          case 'profile': await handleProfile(content, transactionManager); break;
          case 'groupInfo': await handleGroupInfo(content, transactionManager); break;
          case 'image': await handleImage(content, transactionManager); break;
          default: break;
        }
        await GroupStatus.update(groupId, content.TrxId, transactionManager);
      });
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
            ...group?.startTrx ? {
              startTrx: group?.startTrx ?? undefined,
            } : {},
          };
          const contents = await QuorumLightNodeSDK.chain.Content.list(listOptions);
          if (contents.length > 0) {
            hasContent = true;
            await handleContents(group.groupId, contents);
          }
          if (contents.length === 0 || contents.length < LIMIT) {
            store(LOADED_DATA_KEY, true);
          }
        } catch (err) {
          log.error(err);
        }
      }
      await sleep(duration * (hasContent ? 1 : 2));
    }
  })();
};

export const stopPolling = () => {
  stop = true;
};
