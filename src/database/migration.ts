import type Database from './database';

export const runPreviousMigrations = (db: Database) => {
  db.version(3).stores({
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
  }).upgrade(async () => {
    await Promise.all([
      'posts',
      'comments',
      'profiles',
      'counters',
      'uniqueCounters',
      'images',
      'notifications',
      'groupStatus',
    ].map((v) => db.table(v).clear()));
  });
};
