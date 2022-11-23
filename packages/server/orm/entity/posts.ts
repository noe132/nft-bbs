import {
  Brackets, Column, DeleteDateColumn, Entity, EntityManager,
  FindOptionsWhere,
  Index, PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import { Comment } from './comment';
import { Profile } from './profile';
import { StackedCounter } from './stackedCounter';

@Entity({ name: 'posts' })
export class Post {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: number;

  @Column({ nullable: false })
  public title!: string;

  @Column({ nullable: false })
  public content!: string;

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

  @Column({ type: 'int', nullable: false, default: 0 })
  public nonAuthorCommentCount!: number;

  @Column({ type: 'int', nullable: false })
  public likeCount!: number;

  @Column({ type: 'int', nullable: false })
  public dislikeCount!: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  public hot!: number;

  @DeleteDateColumn({
    transformer: {
      from: (v: Date | null) => v?.getTime() ?? null,
      to: (v: number | null) => v && new Date(v),
    },
  })
  public deletedDate?: number | null;

  public extra?: {
    liked: boolean
    disliked: boolean
    userProfile: Profile
  };

  private static create(params: EntityConstructorParams<Post, 'id' | 'extra'>) {
    const item = new Post();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Post, 'id' | 'extra'>, manager?: EntityManager) {
    const post = Post.create(params);
    return (manager || AppDataSource.manager).save(post);
  }

  public static async save(post: Post, manager?: EntityManager) {
    await (manager || AppDataSource.manager).save(post);
  }

  public static get(where: Pick<FindOptionsWhere<Post>, 'groupId' | 'trxId'>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOneBy(Post, where);
  }

  public static async getFirst(params: Pick<FindOptionsWhere<Post>, 'groupId' | 'userAddress' >) {
    return AppDataSource.manager.findOne(Post, {
      where: params,
      order: { timestamp: 'asc' },
    });
  }

  public static bulkGet(trxIds: Array<Post['trxId']>, manager?: EntityManager) {
    if (!trxIds.length) { return []; }
    return (manager || AppDataSource.manager).findBy(Post, trxIds.map((trxId) => ({ trxId })));
  }

  public static delete(where: Pick<FindOptionsWhere<Post>, 'groupId' | 'trxId' >, manager?: EntityManager) {
    return (manager || AppDataSource.manager).softDelete(Post, where);
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
      .limit(params.limit)
      .offset(params.offset)
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

  public static count(groupId: number, userAddress: string) {
    return AppDataSource.manager.countBy(Post, {
      groupId,
      userAddress,
    });
  }

  public static getHot(post: Post) {
    return post.likeCount * 2 + post.nonAuthorCommentCount - post.dislikeCount * 2;
  }

  public static async appendExtra(items: Post, options?: { viewer?: string }): Promise<Post>;
  public static async appendExtra(items: Array<Post>, options?: { viewer?: string }): Promise<Array<Post>>;
  public static async appendExtra(_items: Post | Array<Post>, options: { groupId: string, viewer?: string }) {
    const items = Array.isArray(_items) ? _items : [_items];
    if (!items.length) { return items; }
    const [likedMap, dislikedMap] = options?.viewer
      ? await Promise.all([
        StackedCounter.getCounterMap({
          type: 'Like',
          userAddress: options.viewer,
          items,
        }),
        StackedCounter.getCounterMap({
          type: 'Dislike',
          userAddress: options.viewer,
          items,
        }),
      ])
      : [{}, {}];
    const profiles = await Profile.bulkGet(items.map((item) => ({
      groupId: item.groupId,
      userAddress: item.userAddress,
    })));
    const profileMap = profiles.reduce<Record<string, Profile>>((p, c) => {
      p[c.userAddress] = c;
      return p;
    }, {});

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
