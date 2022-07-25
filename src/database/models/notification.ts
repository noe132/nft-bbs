import { getDatabase } from '../init';
import { INotification, NotificationStatus } from './types';

export const bulkAdd = async (notifications: INotification[]) => {
  const db = getDatabase();
  await db.notifications.bulkAdd(notifications);
};

export const bulkPut = async (notifications: INotification[]) => {
  const db = getDatabase();
  await db.notifications.bulkPut(notifications);
};

export const list = (p: {groupId: string}) => {
  const db = getDatabase();
  return db.notifications.where({ groupId: p.groupId }).reverse().sortBy('timestamp');
};

export const getUnreadCount = (p: {groupId: string}) => {
  const db = getDatabase();
  return db.notifications.where({ groupId: p.groupId, status: NotificationStatus.unread }).count();
};
