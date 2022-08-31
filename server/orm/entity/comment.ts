import { isLeft, tryCatch } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { keyBy } from 'lodash';
import { IContent } from 'quorum-light-node-sdk-nodejs';
import { Column, Entity, PrimaryColumn, Index, FindOptionsWhere, PrimaryGeneratedColumn } from 'typeorm';
import { commentTrxContent } from '~/types';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import { Profile } from './profile';
import { UniqueCounter } from './uniqueCounter';

@Entity({ name: 'comments' })
export class Comment {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @PrimaryColumn({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: string;

  @Column({ nullable: false })
  public content!: string;

  @Index()
  @Column({ nullable: false })
  public objectId!: string;

  @Index()
  @Column({ nullable: false })
  public threadId!: string;

  @Index()
  @Column({ nullable: false })
  public replyId!: string;

  @Index()
  @Column({ nullable: false })
  public userAddress!: string;

  @Column({ type: 'varchar', nullable: false })
  public storage!: 'chain' | 'cache';

  @Index()
  @Column({
    type: 'timestamp',
    nullable: false,
    transformer: {
      from: (v: Date) => v.getTime(),
      to: (v: number) => new Date(v),
    },
  })
  public timestamp!: number;

  @Column({ type: 'int', nullable: false })
  public commentCount!: number;

  @Column({ type: 'int', nullable: false })
  public likeCount!: number;

  @Column({ type: 'int', nullable: false })
  public dislikeCount!: number;

  @Column({ type: 'int', nullable: false })
  public hotCount!: number;

  public extra?: {
    liked: boolean
    disliked: boolean
    userProfile: Profile
  };

  public static parseTrxContent(item: IContent) {
    const data = tryCatch(() => JSON.parse(item.Data.content), identity);
    if (isLeft(data)) { return null; }
    const trxContent = commentTrxContent.decode(data.right);
    if (isLeft(trxContent)) { return null; }
    return trxContent.right;
  }

  public static create(params: EntityConstructorParams<Comment, 'id' | 'extra'>) {
    const item = new Comment();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Comment, 'id' | 'extra'>) {
    const item = Comment.create(params);
    return AppDataSource.manager.save(Comment, item);
  }

  public static async save(comment: Comment) {
    await AppDataSource.manager.save(comment);
  }

  public static update(trxId: string, params: Partial<EntityConstructorParams<Comment, 'extra'>>) {
    return AppDataSource.manager.update(Comment, { trxId }, params);
  }

  public static async get(trxId: string) {
    return AppDataSource.manager.findOneBy(Comment, { trxId });
  }

  public static async getFirst(params: { groupId: string, userAddress: string }) {
    return AppDataSource.manager.findOne(Comment, {
      where: params,
      order: { timestamp: 'asc' },
    });
  }

  public static async bulkGet(trxIds: Array<string>) {
    if (!trxIds.length) { return []; }
    return AppDataSource.manager.findBy(Comment, trxIds.map((trxId) => ({ trxId })));
  }

  public static async delete(trxId: string) {
    await AppDataSource.manager.delete(Comment, { trxId });
  }

  public static async list(params: { limit: number, offset: number } & Pick<FindOptionsWhere<Comment>, 'groupId' | 'objectId'>) {
    return AppDataSource.manager.find(Comment, {
      where: {
        groupId: params.groupId,
        objectId: params.objectId,
      },
      take: params.limit,
      skip: params.offset,
    });
  }

  public static async count(query: FindOptionsWhere<Comment>) {
    return AppDataSource.manager.countBy(Comment, query);
  }

  public static async appendExtra(_items: Comment, options?: { viewer?: string }): Promise<Comment>;
  public static async appendExtra(_items: Array<Comment>, options?: { viewer?: string }): Promise<Array<Comment>>;
  public static async appendExtra(_items: Array<Comment> | Comment, options?: { viewer?: string }) {
    const items = Array.isArray(_items) ? _items : [_items];
    if (!items.length) { return items; }
    const [likedMap, dislikedMap] = options?.viewer
      ? await Promise.all([
        UniqueCounter.getCounterMap({
          counterName: 'commentLike',
          userAddress: options.viewer,
          items,
        }),
        UniqueCounter.getCounterMap({
          counterName: 'commentDislike',
          userAddress: options.viewer,
          items,
        }),
      ])
      : [{}, {}];
    const profiles = await Profile.bulkGet(items.map((item) => ({
      groupId: item.groupId,
      userAddress: item.userAddress,
    })));
    const profileMap = keyBy(profiles, 'userAddress');
    items.forEach((item) => {
      item.extra = {
        liked: !!likedMap[item.trxId],
        disliked: !!dislikedMap[item.trxId],
        userProfile: profileMap[item.userAddress]
        ?? Profile.generateFallbackProfile({
          userAddress: item.userAddress,
          groupId: item.groupId,
        }),
      };
    });
    return Array.isArray(_items) ? items : items[0];
  }
}
