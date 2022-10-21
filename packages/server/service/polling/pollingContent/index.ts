import { either, taskEither } from 'fp-ts';
import { Type } from 'io-ts';
import { EntityManager } from 'typeorm';
import QuorumLightNodeSDK, { IContent, IGroup } from 'quorum-light-node-sdk-nodejs';
import { postType, commentType, likeType, dislikeType, imageType, profileType, postDeleteType } from 'nft-bbs-types';

import { AppDataSource } from '~/orm/data-source';
import { GroupStatus, TrxSet } from '~/orm/entity';
import { send } from '~/service/socket';

import { groupLoadedMap } from '../state';
import { handlePost } from './handlePost';
import { handleComment } from './handleComment';
import { handleCounter } from './handleCounter';
import { handleImage } from './handleImage';
import { handleProfile } from './handleProfile';
import { handlePostDelete } from './handlePostDelete';
import { sleep } from '~/utils';

const LIMIT = 100;

const handlers: Array<[Type<any>, (v: any, transactionManager: EntityManager, queueSocket: typeof send) => unknown, string]> = [
  [postDeleteType, handlePostDelete, 'postDelete'],
  [postType, handlePost, 'post'],
  [commentType, handleComment, 'comment'],
  [likeType, handleCounter, 'like'],
  [dislikeType, handleCounter, 'dislike'],
  [imageType, handleImage, 'image'],
  [profileType, handleProfile, 'profile'],
];

const handleContents = async (groupId: string, contents: Array<IContent>) => {
  const queuedEvents: Array<Parameters<typeof send>[0]> = [];
  const queueSocket = (item: Parameters<typeof send>[0]) => {
    queuedEvents.push(item);
  };

  await taskEither.tryCatch(
    async () => {
      for (const content of contents) {
        const item = handlers.find(([type]) => type.is(content.Data as any));
        if (!item) {
          pollingLog.error({
            message: 'invalid trx data ❌',
            data: content,
          });
        }

        if (item) {
          await AppDataSource.transaction(async (transactionManager) => {
            if (!await TrxSet.has(content.TrxId, transactionManager)) {
              await item[1](content, transactionManager, queueSocket);
              await GroupStatus.update(groupId, { startTrx: content.TrxId }, transactionManager);
              await TrxSet.add({ trxId: content.TrxId }, transactionManager);
            }
          });

          pollingLog.info(`${content.GroupId} ${content.TrxId} ✅ ${item[2]}`);
        }

        if (groupLoadedMap[content.GroupId]) {
          queuedEvents.forEach((v) => {
            send(v);
          });
        }
      }
    },
    (e) => {
      pollingLog.error(e);
      return e as Error;
    },
  )();
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
