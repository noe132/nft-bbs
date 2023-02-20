import { Column, Entity, Index, FindOptionsWhere, EntityManager, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import { AttachedImage } from './attachedImage';
import { CounterSummary } from './counterSummary';
import { Profile } from './profile';
import { TempProfile } from './tempProfile';

type FindCommentParams = Required<Pick<FindOptionsWhere<Comment>, 'groupId' | 'id'>>;

@Entity({ name: 'comments' })
export class Comment {
  @PrimaryColumn()
  public groupId!: number;

  @PrimaryColumn()
  public id!: string;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

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
    images: Array<AttachedImage>
  };

  private static create(params: EntityConstructorParams<Comment, 'extra'>) {
    const item = new Comment();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Comment, 'extra'>, manager?: EntityManager) {
    const item = Comment.create(params);
    return (manager || AppDataSource.manager).save(Comment, item);
  }

  public static async save(comment: Comment, manager?: EntityManager) {
    await (manager || AppDataSource.manager).save(comment);
  }

  public static async get(where: FindCommentParams, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOneBy(Comment, where);
  }

  public static async getFirst(params: Required<Pick<FindOptionsWhere<Comment>, 'groupId' | 'userAddress'>>) {
    return AppDataSource.manager.findOne(Comment, {
      where: params,
      order: { timestamp: 'asc' },
    });
  }

  public static async bulkGet(data: Array<FindCommentParams>, manager?: EntityManager) {
    if (!data.length) { return []; }
    return (manager || AppDataSource.manager).findBy(Comment, data);
  }

  public static async has(where: FindCommentParams, manager?: EntityManager) {
    return (manager || AppDataSource.manager).exists(Comment, { where });
  }

  public static async list(
    params: { limit: number, offset: number } & Pick<FindOptionsWhere<Comment>, 'groupId' | 'postId'>,
    manager?: EntityManager,
  ) {
    return (manager || AppDataSource.manager).createQueryBuilder()
      .select('comment')
      .from(Comment, 'comment')
      .where({
        groupId: params.groupId,
        postId: params.postId,
      })
      .offset(params.offset)
      .limit(params.limit)
      .getMany();
  }

  public static getHot(comment: Comment) {
    return comment.likeCount * 2 + comment.commentCount - comment.dislikeCount * 2;
  }

  public static async appendExtra(_items: Comment, options?: { viewer?: string }): Promise<Comment>;
  public static async appendExtra(_items: Array<Comment>, options?: { viewer?: string }): Promise<Array<Comment>>;
  public static async appendExtra(_items: Array<Comment> | Comment, options?: { viewer?: string }) {
    const userAddress = options?.viewer;
    const items = Array.isArray(_items) ? _items : [_items];
    if (!items.length) { return items; }
    const [likedMap, dislikedMap, images] = await Promise.all([
      userAddress ? CounterSummary.getCounterMap({
        type: 'like',
        userAddress,
        items,
      }) : Promise.resolve({}),
      userAddress ? CounterSummary.getCounterMap({
        type: 'dislike',
        userAddress,
        items,
      }) : Promise.resolve({}),
      AttachedImage.getByObject(items.map((v) => ({
        groupId: v.groupId,
        objectId: v.id,
      }))),
    ]);
    const profiles = await Profile.bulkGet(items.map((item) => ({
      groupId: item.groupId,
      userAddress: item.userAddress,
    })));
    const tempProfiles = await TempProfile.bulkGet(items.map((item) => ({
      groupId: item.groupId,
      userAddress: item.userAddress,
    })));
    const profileMap = profiles.reduce<Record<string, Profile>>((p, c) => {
      p[c.userAddress] = c;
      return p;
    }, {});
    tempProfiles.map(TempProfile.toProfile).forEach((v) => {
      if (!profileMap[v.userAddress]) {
        profileMap[v.userAddress] = v;
      }
    });
    items.forEach((comment) => {
      comment.extra = {
        liked: (likedMap[comment.id]?.value ?? 0) > 0,
        disliked: (dislikedMap[comment.id]?.value ?? 0) > 0,
        userProfile: profileMap[comment.userAddress] ?? Profile.generateFallbackProfile({
          userAddress: comment.userAddress,
          groupId: comment.groupId,
        }),
        images: images.filter((v) => v.objectId === comment.id),
      };
    });
    return Array.isArray(_items) ? items : items[0];
  }
}
