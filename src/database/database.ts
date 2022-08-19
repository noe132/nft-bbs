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
  IGroupStatus,
  IGroupInfo,
} from './models/types';

export default class Database extends Dexie {
  posts: Dexie.Table<IPost, number>;
  comments: Dexie.Table<IComment, number>;
  profiles: Dexie.Table<IProfile, number>;
  counters: Dexie.Table<ICounter, number>;
  uniqueCounters: Dexie.Table<IUniqueCounter, number>;
  images: Dexie.Table<IImage, number>;
  notifications: Dexie.Table<INotification, number>;
  groupStatus: Dexie.Table<IGroupStatus, number>;
  groupInfo: Dexie.Table<IGroupInfo, number>;

  public constructor() {
    super(DATABASE_NAME);

    runPreviousMigrations(this);

    this.version(5).stores({
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
        'actionTimestamp',
        'groupId',
        'type',
        'status',
        '[groupId+type]',
        '[groupId+status]',
      ].join(','),
      groupStatus: [
        '++id',
        'groupId',
        'startTrx',
      ].join(','),
      groupInfo: [
        '++id',
        'groupId',
        'trxId',
        'timestamp',
        'isOwner',
      ].join(','),
    }).upgrade(async () => {
      await Promise.allSettled([
        'posts',
        'comments',
        'profiles',
        'counters',
        'uniqueCounters',
        'images',
        'notifications',
        'groupStatus',
        'groupInfo',
      ].map((v) => this.table(v).clear()));
    });

    this.posts = this.table('posts');
    this.comments = this.table('comments');
    this.profiles = this.table('profiles');
    this.counters = this.table('counters');
    this.uniqueCounters = this.table('uniqueCounters');
    this.images = this.table('images');
    this.notifications = this.table('notifications');
    this.groupStatus = this.table('groupStatus');
    this.groupInfo = this.table('groupInfo');
  }

  public async clearAllTable() {
    const tables = [
      this.posts,
      this.comments,
      this.profiles,
      this.counters,
      this.uniqueCounters,
      this.images,
      this.notifications,
      this.groupStatus,
      this.groupInfo,
    ];
    await this.transaction('rw', tables, async () => {
      await Promise.allSettled(tables.map((v) => v.clear()));
    });
  }
}

export const DATABASE_NAME = 'BBS';
