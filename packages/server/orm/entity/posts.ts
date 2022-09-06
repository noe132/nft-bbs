import { either } from 'fp-ts';
import { keyBy } from 'lodash';
import { CounterName, postTrxContent, TrxStorage } from 'nft-bbs-types';
import { IContent } from 'quorum-light-node-sdk-nodejs';
import {
  Brackets, Column, Entity, EntityManager,
  FindOptionsWhere, Index, PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import { Profile } from './profile';
import { UniqueCounter } from './uniqueCounter';

@Entity({ name: 'posts' })
export class Post {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: string;

  @Column({ nullable: false })
  public title!: string;

  @Column({ nullable: false })
  public content!: string;

  @Index()
  @Column({ nullable: false })
  public userAddress!: string;

  @Column({ type: 'varchar', nullable: false })
  public storage!: TrxStorage;

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
    const data = either.tryCatch(() => JSON.parse(item.Data.content), (v) => v);
    if (either.isLeft(data)) { return null; }
    const trxContent = postTrxContent.decode(data.right);
    if (either.isLeft(trxContent)) { return null; }
    return trxContent.right;
  }

  public static create(params: EntityConstructorParams<Post, 'id' | 'extra'>) {
    const item = new Post();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Post, 'id' | 'extra'>, manager?: EntityManager) {
    const post = Post.create(params);
    await (manager || AppDataSource.manager).save(post);
  }

  public static async save(post: Post, manager?: EntityManager) {
    await (manager || AppDataSource.manager).save(post);
  }

  public static update(
    where: FindOptionsWhere<Post>,
    params: Partial<EntityConstructorParams<Post, 'id' | 'extra'>>,
    manager?: EntityManager,
  ) {
    return (manager || AppDataSource.manager).update(Post, where, params);
  }

  public static get(where: { groupId: string, trxId: string }, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOneBy(Post, where);
  }

  public static async getFirst(params: { groupId: string, userAddress: string }) {
    return AppDataSource.manager.findOne(Post, {
      where: params,
      order: { timestamp: 'asc' },
    });
  }

  public static bulkGet(trxIds: Array<string>, manager?: EntityManager) {
    if (!trxIds.length) { return []; }
    return (manager || AppDataSource.manager).findBy(Post, trxIds.map((trxId) => ({ trxId })));
  }

  public static delete(where: { groupId: string, trxId: string }, manager?: EntityManager) {
    return (manager || AppDataSource.manager).delete(Post, where);
  }

  public static list(params: {
    groupId: string
    offset: number
    limit: number
    userAddress?: string
    order: 'ASC' | 'DESC'
    search?: string
  }) {
    const query = AppDataSource.manager
      .createQueryBuilder(Post, 'post')
      .where('post.groupId = :groupId', { groupId: params.groupId })
      .take(params.limit)
      .skip(params.offset)
      .orderBy('post.timestamp', params.order);

    if (params.userAddress) {
      query.andWhere('post.userAddress = :userAddress', { userAddress: params.userAddress });
    }

    if (params.search) {
      const keywords = params.search.split(' ').filter((v) => v);
      keywords.forEach((keyword, i) => {
        query.andWhere(new Brackets((qb) => {
          qb
            .where(`post.content like :keyword${i}`, { [`keyword${i}`]: `%${keyword}%` })
            .orWhere(`post.title like :keyword${i}`, { [`keyword${i}`]: `%${keyword}%` });
        }));
      });
    }

    return query.getMany();
  }

  public static count(groupId: string, userAddress: string) {
    return AppDataSource.manager.countBy(Post, {
      groupId,
      userAddress,
    });
  }

  public static async appendExtra(items: Post, options?: { viewer?: string }): Promise<Post>;
  public static async appendExtra(items: Array<Post>, options?: { viewer?: string }): Promise<Array<Post>>;
  public static async appendExtra(_items: Post | Array<Post>, options?: { viewer?: string }) {
    const items = Array.isArray(_items) ? _items : [_items];
    if (!items.length) { return items; }
    const [likedMap, dislikedMap] = options?.viewer
      ? await Promise.all([
        UniqueCounter.getCounterMap({
          counterName: CounterName.postLike,
          userAddress: options.viewer,
          items,
        }),
        UniqueCounter.getCounterMap({
          counterName: CounterName.postDislike,
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
