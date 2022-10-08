import { either, taskEither } from 'fp-ts';
import QuorumLightNodeSDK, { IContent, IGroup } from 'quorum-light-node-sdk-nodejs';
import { AppDataSource } from '~/orm/data-source';
import { GroupStatus } from '~/orm/entity';
import { send } from '~/service/socket';

import { groupLoadedMap } from '../state';
import { handlePost } from './handlePost';
import { handleComment } from './handleComment';
import { handleCounter } from './handleCounter';
import { handleProfile } from './handleProfile';
import { handleGroupInfo } from './handleGroupInfo';
import { handleImage } from './handleImage';
import { sleep } from '~/utils';

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

export const pollingTask = async (group: IGroup) => {
  const groupStatus = await GroupStatus.get(group.groupId);
  const startTrx = groupStatus?.startTrx;
  try {
    const listOptions = {
      groupId: group.groupId,
      count: LIMIT,
      ...startTrx ? { startTrx } : {},
    };
    const contentsResult = await taskEither.tryCatch(
      () => QuorumLightNodeSDK.chain.Content.list(listOptions),
      (e) => e as Error,
    )();
    if (either.isLeft(contentsResult)) {
      pollingLog.error(contentsResult.left);
      return;
    }
    const contents = contentsResult.right;
    if (contents.length > 0) {
      await handleContents(group.groupId, contents);
    }
    if (contents.length === 0 || contents.length < LIMIT) {
      groupLoadedMap[group.groupId] = true;
      // wait for another 4 second if all contents were loaded
      await sleep(4000);
    }
  } catch (err) {
    log.error(err);
  }
};
