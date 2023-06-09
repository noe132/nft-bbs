import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import { Comment } from './comment';
import { NftRequest } from './nftRequest';
import { Post } from './post';
import { Profile } from './profile';
import { TempProfile } from './tempProfile';

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({ nullable: false })
  public groupId!: number;

  @Index()
  @Column({ nullable: false })
  public to!: string;

  @Index()
  @Column({ nullable: false })
  public from!: string;

  @Index()
  @Column({ type: 'varchar', nullable: false })
  public type!: 'like' | 'dislike' | 'comment' | 'nftrequest' | 'nftrequestresponse';

  @Column({ type: 'varchar', nullable: false })
  public objectType!: 'post' | 'comment' | 'nftrequest' | '';

  @Column({ nullable: false })
  public objectId!: string;

  @Column({ nullable: false })
  public actionObjectType!: string;

  @Column({ nullable: false })
  public actionObjectId!: string;

  @Index()
  @Column({ type: 'varchar', nullable: false })
  public status!: 'unread' | 'read';

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

  public extra?: {
    object?: {
      type: 'post'
      value: Post
    } | {
      type: 'comment'
      value: Comment
    } | {
      type: 'nftrequest'
      value: NftRequest
    }
    actionObject?: {
      type: 'comment'
      value: Comment
    }
    fromProfile: Profile
  };

  private static create(params: EntityConstructorParams<Notification, 'id' | 'extra'>) {
    const item = new Notification();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Notification, 'id' | 'extra'>, manager?: EntityManager) {
    const item = Notification.create(params);
    return (manager || AppDataSource.manager).save(Notification, item);
  }

  public static async bulkAdd(
    items: Array<EntityConstructorParams<Notification, 'id' | 'extra'>>,
    manager: EntityManager,
  ) {
    const notifications = items.map((v) => Notification.create(v));
    return (manager || AppDataSource.manager).save(Notification, notifications);
  }

  public static async markAsRead(ids: Array<number>) {
    return AppDataSource.manager.update(Notification, ids, {
      status: 'read',
    });
  }

  public static async list(params: {
    order: 'asc' | 'desc'
    limit: number
    offset: number
  } & Pick<FindOptionsWhere<Notification>, 'groupId' | 'to'>) {
    return AppDataSource.manager.createQueryBuilder()
      .select('notification')
      .from(Notification, 'notification')
      .where({
        groupId: params.groupId,
        to: params.to,
      })
      .orderBy({ timestamp: 'DESC' })
      .offset(params.offset)
      .limit(params.limit)
      .getMany();
  }

  public static async count(query: FindOptionsWhere<Notification>) {
    return AppDataSource.manager.countBy(Notification, query);
  }

  public static async appendExtra(items: Notification, manager?: EntityManager): Promise<Notification>;
  public static async appendExtra(items: Array<Notification>, manager?: EntityManager): Promise<Array<Notification>>;
  public static async appendExtra(_items: Array<Notification> | Notification, manager?: EntityManager) {
    const items = Array.isArray(_items) ? _items : [_items];

    const [posts, comments, profiles, tempProfiles, nftRequests] = await Promise.all([
      Post.bulkGet(
        items.filter((v) => v.objectType === 'post').map((v) => ({ groupId: v.groupId, id: v.objectId })),
        manager,
      ),
      Comment.bulkGet(
        [
          ...items.filter((v) => v.objectType === 'comment').map((v) => ({ groupId: v.groupId, id: v.objectId })),
          ...items.filter((v) => v.actionObjectType === 'comment').map((v) => ({ groupId: v.groupId, id: v.actionObjectId })),
        ],
        manager,
      ),
      Profile.bulkGet(items.map((v) => ({
        groupId: v.groupId,
        userAddress: v.from,
      })), manager),
      TempProfile.bulkGet(items.map((v) => ({
        groupId: v.groupId,
        userAddress: v.from,
      })), manager),
      NftRequest.bulkGet(
        items.filter((v) => v.objectType === 'nftrequest').map((v) => Number(v.objectId)),
        manager,
      ),
    ]);

    items.forEach((item) => {
      let object;
      let actionObject;
      if (item.objectType === 'post') {
        const post = posts.find((v) => v.id === item.objectId);
        if (post) {
          object = {
            type: 'post',
            value: post,
          } as const;
        }
      } else if (item.objectType === 'comment') {
        const comment = comments.find((v) => v.id === item.objectId);
        if (comment) {
          object = {
            type: 'comment',
            value: comment,
          } as const;
        }
      } else if (item.objectType === 'nftrequest') {
        const nftRequest = nftRequests.find((v) => v.id === Number(item.objectId));
        if (nftRequest) {
          object = {
            type: 'nftrequest',
            value: nftRequest,
          } as const;
        }
      }

      if (item.actionObjectType === 'comment') {
        const comment = comments.find((v) => v.id === item.actionObjectId);
        if (comment) {
          actionObject = {
            type: 'comment',
            value: comment,
          } as const;
        }
      }

      const profile = profiles.find((v) => v.groupId === item.groupId && v.userAddress === item.from);
      const tempProfile = tempProfiles.find((v) => v.groupId === item.groupId && v.userAddress === item.from);
      const fromProfile = profile
        ?? (tempProfile && TempProfile.toProfile(tempProfile))
        ?? Profile.generateFallbackProfile({ userAddress: item.from, groupId: item.groupId });

      item.extra = {
        object,
        actionObject,
        fromProfile,
      };
    });

    return Array.isArray(_items) ? items : items[0];
  }
}
