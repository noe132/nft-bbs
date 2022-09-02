import type { IComment } from './comment';
import type { IPost } from './post';
import type { IProfile } from './profile';

export enum NotificationStatus {
  read = 'read',
  unread = 'unread',
}

export enum NotificationObjectType {
  post = 'post',
  comment = 'comment',
}

export enum NotificationType {
  like = 'like',
  dislike = 'dislike',
  comment = 'comment',
}

export interface INotification {
  id?: number
  groupId: string
  status: NotificationStatus
  type: NotificationType
  objectId: string
  objectType: NotificationObjectType
  from: string
  to: string
  timestamp: number
  extra: {
    post?: IPost
    comment?: IComment
    fromProfile?: IProfile
  }
}
