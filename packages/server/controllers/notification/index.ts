import { FastifyRegister } from 'fastify';
import { type, string, partial } from 'io-ts';
import { Notification } from '~/orm';
import { assertValidation, parseIntFromString } from '~/utils';

export const notificationController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId/:to', async (req) => {
    const params = assertValidation(type({
      groupId: string,
      to: string,
    }).decode(req.params));
    const query = assertValidation(partial({
      limit: string,
      offset: string,
    }).decode(req.query));

    let notifications = await Notification.list({
      groupId: params.groupId,
      to: params.to,
      order: 'desc',
      limit: Math.min(parseIntFromString(query.limit, 10), 50),
      offset: parseIntFromString(query.offset, 0),
    });

    if (notifications.length) {
      await Notification.markAsRead(notifications.map((n) => n.id!));
    }
    notifications = await Notification.appendExtra(notifications);

    return notifications;
  });

  fastify.get('/:groupId/:to/unread_count', async (req) => {
    const params = assertValidation(type({
      groupId: string,
      to: string,
    }).decode(req.params));
    const count = await Notification.count({
      groupId: params.groupId,
      to: params.to,
      status: 'unread',
    });
    return count;
  });

  done();
};
