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
  /** 产生 notification 的这个 comment trx 的 id */
  actionTrxId: string
  fromUserAddress: string
  timestamp: number
}
