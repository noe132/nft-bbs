import { keyBy } from 'lodash';
import { Column, Entity, Index, FindOptionsWhere, PrimaryGeneratedColumn, EntityManager } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import { ImageFile } from './imageFile';
import { Profile } from './profile';
import { StackedCounter } from './stackedCounter';

@Entity({ name: 'comments' })
export class Comment {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: string;

  @Column({ nullable: false })
  public content!: string;

  @Index()
  @Column({ nullable: false })
  public postId!: string;

  @Index()
  @Column({ nullable: false })
  public threadId!: string;

  @Index()
  @Column({ nullable: false })
  public replyId!: string;

  @Index()
  @Column({ nullable: false })
  public userAddress!: string;

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

  public extra?: {
    liked: boolean
    disliked: boolean
    userProfile: Profile
    images: Array<ImageFile>
  };

  private static create(params: EntityConstructorParams<Comment, 'id' | 'extra'>) {
    const item = new Comment();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Comment, 'id' | 'extra'>, manager?: EntityManager) {
    const item = Comment.create(params);
    return (manager || AppDataSource.manager).save(Comment, item);
  }

  public static async save(comment: Comment, manager?: EntityManager) {
    await (manager || AppDataSource.manager).save(comment);
  }

  public static async get(where: { groupId: string, trxId: string }, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOneBy(Comment, where);
  }

  public static async getFirst(params: { groupId: string, userAddress: string }) {
    return AppDataSource.manager.findOne(Comment, {
      where: params,
      order: { timestamp: 'asc' },
    });
  }

  public static async bulkGet(trxIds: Array<string>, manager?: EntityManager) {
    if (!trxIds.length) { return []; }
    return (manager || AppDataSource.manager).findBy(Comment, trxIds.map((trxId) => ({ trxId })));
  }

  public static async list(params: { limit: number, offset: number } & Pick<FindOptionsWhere<Comment>, 'groupId' | 'postId'>) {
    return AppDataSource.manager.find(Comment, {
      where: {
        groupId: params.groupId,
        postId: params.postId,
      },
      take: params.limit,
      skip: params.offset,
    });
  }

  public static async appendExtra(_items: Comment, options?: { viewer?: string }): Promise<Comment>;
  public static async appendExtra(_items: Array<Comment>, options?: { viewer?: string }): Promise<Array<Comment>>;
  public static async appendExtra(_items: Array<Comment> | Comment, options?: { viewer?: string }) {
    const userAddress = options?.viewer;
    const items = Array.isArray(_items) ? _items : [_items];
    if (!items.length) { return items; }
    const [likedMap, dislikedMap, images] = await Promise.all([
      userAddress ? StackedCounter.getCounterMap({
        type: 'Like',
        userAddress,
        items,
      }) : null,
      userAddress ? StackedCounter.getCounterMap({
        type: 'Dislike',
        userAddress,
        items,
      }) : null,
      ImageFile.list(items.map((v) => ({
        groupId: v.groupId,
        trxId: v.trxId,
      }))),
    ]);
    const profiles = await Profile.bulkGet(items.map((item) => ({
      groupId: item.groupId,
      userAddress: item.userAddress,
    })));
    const profileMap = keyBy(profiles, 'userAddress');
    items.forEach((item) => {
      item.extra = {
        liked: !!likedMap?.[item.trxId],
        disliked: !!dislikedMap?.[item.trxId],
        userProfile: profileMap[item.userAddress] ?? Profile.generateFallbackProfile({
          userAddress: item.userAddress,
          groupId: item.groupId,
        }),
        images: images.filter((v) => v.trxId === item.trxId),
      };
    });
    return Array.isArray(_items) ? items : items[0];
  }
}
