import Dexie from 'dexie';
import { runPreviousMigrations } from './migration';
import {
  IPost,
  IComment,
  IProfile,
  ICounter,
  IUniqueCounter,
  IImage,
  INotification,
} from './models/types';

export default class Database extends Dexie {
  posts: Dexie.Table<IPost, number>;
  comments: Dexie.Table<IComment, number>;
  profiles: Dexie.Table<IProfile, number>;
  counters: Dexie.Table<ICounter, number>;
  uniqueCounters: Dexie.Table<IUniqueCounter, number>;
  images: Dexie.Table<IImage, number>;
  notifications: Dexie.Table<INotification, number>;

  constructor() {
    super(DATABASE_NAME);

    runPreviousMigrations();

    this.version(1).stores({
      posts: [
        'trxId',
        'userAddress',
        'groupId',
        'status',
        'timestamp',
        'summary.commentCount',
        'summary.likeCount',
        'summary.dislikeCount',
        'summary.hotCount',
      ].join(','),
      comments: [
        'trxId',
        'userAddress',
        'objectId',
        'threadId',
        'replyId',
        'groupId',
        'status',
        'timestamp',
        'summary.commentCount',
        'summary.likeCount',
        'summary.dislikeCount',
        'summary.hotCount',
      ].join(','),
      profiles: [
        '[groupId+userAddress]',
      ].join(','),
      counters: [
        'trxId',
      ].join(','),
      uniqueCounters: [
        '[name+objectId+userAddress]',
      ].join(','),
      images: [
        'trxId',
      ].join(','),
      notifications: [
        '++id',
        'timestamp',
        'groupId',
        'type',
        'status',
        '[groupId+type]',
        '[groupId+status]',
      ].join(','),
    });

    this.posts = this.table('posts');
    this.comments = this.table('comments');
    this.profiles = this.table('profiles');
    this.counters = this.table('counters');
    this.uniqueCounters = this.table('uniqueCounters');
    this.images = this.table('images');
    this.notifications = this.table('notifications');
  }
}

export const DATABASE_NAME = 'BBS';
