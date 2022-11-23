import { either, taskEither, function as fp } from 'fp-ts';
import { Type } from 'io-ts';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { postType, commentType, likeType, dislikeType, imageType, profileType, postDeleteType } from 'nft-bbs-types';

import { AppDataSource } from '~/orm/data-source';
import { GroupStatus, PendingContent, TrxSet } from '~/orm/entity';
import { socketService, SendFn } from '~/service/socket';
import { sleep } from '~/utils';

import { handlePost } from './handlePost';
import { handleComment } from './handleComment';
import { handleCounter } from './handleCounter';
import { handleImage } from './handleImage';
import { handleProfile } from './handleProfile';
import { handlePostDelete } from './handlePostDelete';
import { getMergedTaskGroup, TaskItem, TrxHandler, TrxTypes } from './helper';

const LIMIT = 100;

const handlers: Array<{ type: Type<any>, handler: TrxHandler, trxType: TrxTypes }> = [
  { type: postDeleteType, handler: handlePostDelete, trxType: 'postDelete' },
  { type: postType, handler: handlePost, trxType: 'post' },
  { type: commentType, handler: handleComment, trxType: 'comment' },
  { type: likeType, handler: handleCounter, trxType: 'like' },
  { type: dislikeType, handler: handleCounter, trxType: 'dislike' },
  { type: imageType, handler: handleImage, trxType: 'image' },
  { type: profileType, handler: handleProfile, trxType: 'profile' },
];

interface HandleContentParams {
  taskItem?: TaskItem
  content: IContent
  pendingId?: number
  groupStatus: GroupStatus
  queueSocket: SendFn
}

const handleContent = async (params: HandleContentParams) => {
  const { content, taskItem, queueSocket, groupStatus, pendingId } = params;
  const handlerItem = handlers.find((item) => item.type.is(params.content.Data as any));
  if (!handlerItem) {
    pollingLog.error({
      message: 'invalid trx data ❌',
      data: params.content,
    });
    return either.right(null);
  }
  const isPendingContent = !taskItem;
  const trxType = handlerItem.trxType;
  const groupId = groupStatus.id;

  if (taskItem) {
    const roles = taskItem.roles;
    const main = roles.includes('main') && ['post', 'postDelete', 'image'].includes(trxType);
    const comment = roles.includes('comment') && ['comment'].includes(trxType);
    const counter = roles.includes('counter') && ['like', 'dislike'].includes(trxType);
    const profile = roles.includes('profile') && ['profile'].includes(trxType);
    const canHandle = main || comment || counter || profile;
    if (!canHandle) {
      return either.right(null);
    }
  }

  const getGroupStatusUpdateParams = () => {
    const roles = taskItem?.roles;
    if (!roles) { return null; }
    return {
      ...roles.includes('main') ? { mainStartTrx: content.TrxId } : {},
      ...roles.includes('comment') ? { commentStartTrx: content.TrxId } : {},
      ...roles.includes('counter') ? { counterStartTrx: content.TrxId } : {},
      ...roles.includes('profile') ? { profileStartTrx: content.TrxId } : {},
    };
  };
  const groupStatusUpdateParams = getGroupStatusUpdateParams();

  const result = await AppDataSource.transaction(async (transactionManager) => {
    const checkIsDupTrx = () => {
      if (isPendingContent) { return taskEither.of(false); }
      return taskEither.tryCatch(
        () => TrxSet.has(groupId, content.TrxId, transactionManager),
        (e) => e as Error,
      );
    };

    const handleContent = () => fp.pipe(
      () => handlerItem.handler(content, groupStatus, transactionManager, queueSocket),
      taskEither.chainW((handled) => taskEither.tryCatch(
        async () => {
          await Promise.all([
            !isPendingContent && TrxSet.add(
              { groupId, trxId: content.TrxId },
              transactionManager,
            ),
            !isPendingContent && !handled && PendingContent.add(
              {
                content: JSON.stringify(content),
                groupId,
              },
              transactionManager,
            ),
            isPendingContent && pendingId && handled && PendingContent.delete(
              pendingId,
              transactionManager,
            ),
          ]);
          return null;
        },
        (e) => e as Error,
      )),
    );

    const updateGroupstatus = () => {
      if (!isPendingContent && groupStatusUpdateParams) {
        return taskEither.tryCatch(
          async () => {
            await GroupStatus.update(
              groupId,
              groupStatusUpdateParams,
              transactionManager,
            );
            return null;
          },
          (e) => e as Error,
        );
      }
      return taskEither.of(null);
    };

    const rollback = taskEither.fromTask(
      async () => {
        await transactionManager.queryRunner!.rollbackTransaction();
        return null;
      },
    );

    const run = fp.pipe(
      checkIsDupTrx(),
      taskEither.chainW((dup) => {
        if (dup) { return taskEither.of(null); }
        return handleContent();
      }),
      taskEither.chainW(() => updateGroupstatus()),
      taskEither.orElse(() => rollback),
      taskEither.mapLeft((e) => {
        pollingLog.error(e);
        return e;
      }),
      taskEither.map((v) => {
        if (!isPendingContent) {
          pollingLog.info(`${content.GroupId} ${content.TrxId} ✅ ${trxType}`);
        }
        return v;
      }),
    );

    return run();
  });

  return result;
};

export const pollingTask = async (groupStatusId: number) => {
  const groupStatus = await GroupStatus.get(groupStatusId);
  if (!groupStatus) { return; }
  const taskGroups = getMergedTaskGroup(groupStatus);
  const queuedEvents: Array<Parameters<SendFn>[0]> = [];
  const queueSocket: SendFn = (item) => queuedEvents.push(item);
  let totalCount = 0;

  // handle pending trx
  await fp.pipe(
    taskEither.tryCatch(
      () => PendingContent.list(groupStatusId),
      (e) => e as Error,
    ),
    taskEither.chainW((items) => taskEither.fromTask(async () => {
      for (const item of items) {
        const result = await fp.pipe(
          () => handleContent({
            content: JSON.parse(item.content),
            pendingId: item.id,
            groupStatus,
            queueSocket,
          }),
        )();
        if (either.isLeft(result)) {
          break;
        }
      }
    })),
  )();

  // handle new trx
  for (const taskItem of taskGroups) {
    const startTrx = groupStatus[`${taskItem.roles[0]}StartTrx`];
    const groupId = QuorumLightNodeSDK.utils.restoreSeedFromUrl(taskItem.seedUrl).group_id;
    const listOptions = {
      groupId,
      count: LIMIT,
      ...startTrx ? { startTrx } : {},
    };
    await fp.pipe(
      taskEither.tryCatch(
        () => QuorumLightNodeSDK.chain.Content.list(listOptions),
        (e) => e as Error,
      ),
      taskEither.chainW((contents) => taskEither.fromTask(async () => {
        totalCount += contents.length;
        for (const content of contents) {
          const result = await handleContent({
            taskItem,
            content,
            groupStatus,
            queueSocket,
          });
          if (either.isLeft(result)) {
            break;
          }
        }
      })),
    )();
  }

  queuedEvents.forEach((v) => {
    socketService.send(v);
  });

  if (!totalCount) {
    if (!groupStatus.loaded) {
      await GroupStatus.update(groupStatus.id, {
        loaded: true,
      });
    }
    // wait for another 10 second if all contents were loaded
    await sleep(10000);
  }
};
