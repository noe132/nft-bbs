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
  fromUserAddress: string
  timestamp: number
}
