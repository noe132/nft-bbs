import { taskEither } from 'fp-ts';
import { CounterType } from 'rum-port-types';
import * as rumsdk from 'rum-sdk-nodejs';
import { Post, Comment, Notification, Counter, CounterSummary } from '~/orm';
import { parseActivityTimestamp } from '~/utils';
import { TrxHandler } from './helper';

export const handleCounter: TrxHandler = (item, groupStatus, transactionManager, queueSocket) => taskEither.tryCatch(
  async () => {
    const data = item.Data as CounterType;
    const userAddress = rumsdk.utils.pubkeyToAddress(item.SenderPubkey);
    const groupId = groupStatus.id;
    const timestamp = parseActivityTimestamp(data.published, item.TimeStamp);
    const parse = () => {
      if (data.type === 'Undo') {
        return {
          isUndo: true,
          objectId: data.object.object.id,
          type: data.object.type === 'Like' ? 'undolike' : 'undodislike',
          likeType: data.object.type === 'Like' ? 'like' : 'dislike',
        } as const;
      }
      return {
        isUndo: false,
        objectId: data.object.id,
        type: data.type === 'Like' ? 'like' : 'dislike',
        likeType: data.type === 'Like' ? 'like' : 'dislike',
      } as const;
    };
    const { isUndo, objectId, type, likeType } = parse();
    const key = likeType === 'like' ? 'likeCount' : 'dislikeCount';
    const isLike = likeType === 'like';

    const objectItem = await Comment.get({ groupId, id: objectId }, transactionManager)
    ?? await Post.get({ groupId, id: objectId }, transactionManager);

    if (!objectItem) {
      // pollingLog.warn({
      //   message: `invalid counter ${trxId}`,
      //   data: item.Data,
      // });
      return false;
    }

    const objectType = objectItem instanceof Comment ? 'comment' : 'post';
    const objectClass = objectType === 'comment' ? Comment : Post;

    const lastCounter = await Counter.getLastCounter({
      groupId,
      objectId,
      objectType,
      userAddress,
    });

    if (lastCounter?.type === type) {
      // duplicated counter in sequence
      return true;
    }

    const isLikeByOthers = objectItem.userAddress !== userAddress;
    const [notification, counter] = await Promise.all([
      // don't send notification if it's dislike
      isLike && isLikeByOthers && Notification.add({
        groupId,
        status: groupStatus.loaded ? 'unread' : 'read',
        type: 'like',
        objectId: objectItem.id,
        objectType,
        actionObjectId: item.TrxId,
        actionObjectType: 'counter',
        to: objectItem.userAddress,
        from: userAddress,
        timestamp,
      }, transactionManager),
      Counter.add({
        groupId,
        trxId: item.TrxId,
        type,
        objectId: objectItem.id,
        objectType,
        timestamp,
        userAddress,
      }, transactionManager),
      CounterSummary.set({
        groupId,
        objectId,
        objectType,
        userAddress,
        type: likeType,
        value: isUndo ? -1 : 1,
      }),
      transactionManager.increment(
        objectClass,
        { groupId, id: objectItem.id },
        key,
        isUndo ? -1 : 1,
      ),
    ]);

    queueSocket({
      broadcast: true,
      event: 'counter',
      groupId,
      data: counter,
    });

    if (notification) {
      const packedNotification = await Notification.appendExtra(notification, transactionManager);
      queueSocket({
        userAddress: packedNotification.to,
        event: 'notification',
        groupId,
        data: packedNotification,
      });
    }

    return true;
  },
  (e) => e as Error,
)();
