import { Column, Entity, FindOptionsWhere, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import { Comment } from './comment';
import { Post } from './posts';
import { Profile } from './profile';

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({ nullable: false })
  public groupId!: string;

  @Index()
  @Column({ nullable: false })
  public to!: string;

  @Index()
  @Column({ nullable: false })
  public from!: string;

  @Index()
  @Column({ type: 'varchar', nullable: false })
  public type!: 'like' | 'dislike' | 'comment';

  @Column({ type: 'varchar', nullable: false })
  public objectType!: 'post' | 'comment';

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
    }
    actionObject?: {
      type: 'comment'
      value: Comment
    }
    fromProfile: Profile
  };

  public static create(params: EntityConstructorParams<Notification, 'id' | 'extra'>) {
    const item = new Notification();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Notification, 'id' | 'extra'>) {
    const item = Notification.create(params);
    return AppDataSource.manager.save(Notification, item);
  }

  public static async bulkAdd(items: Array<EntityConstructorParams<Notification, 'id' | 'extra'>>) {
    const notifications = items.map((v) => Notification.create(v));
    return AppDataSource.manager.save(Notification, notifications);
  }

  public static async save(item: Notification) {
    return AppDataSource.manager.save(Notification, item);
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
    return AppDataSource.manager.find(Notification, {
      where: {
        groupId: params.groupId,
        to: params.to,
      },
      order: {
        timestamp: 'desc',
      },
      take: params.limit,
      skip: params.offset,
    });
  }

  public static async count(query: FindOptionsWhere<Notification>) {
    return AppDataSource.manager.countBy(Notification, query);
  }

  public static async deleteWith(groupId: string, trxId: string) {
    const notifications = await AppDataSource.manager.findBy(Notification, [
      { groupId, objectId: trxId },
      { groupId, actionObjectId: trxId },
    ]);
    if (!notifications.length) { return null; }
    const deleteResult = await AppDataSource.manager.delete(Notification, notifications);
    return deleteResult;
  }

  public static async appendExtra(items: Notification): Promise<Notification>;
  public static async appendExtra(items: Array<Notification>): Promise<Array<Notification>>;
  public static async appendExtra(_items: Array<Notification> | Notification) {
    const items = Array.isArray(_items) ? _items : [_items];
    const commentTrxIds: Array<string> = [];
    const postTrxIds: Array<string> = [];
    items.forEach((v) => {
      if (v.objectType === 'post') {
        postTrxIds.push(v.objectId);
      }
      if (v.objectType === 'comment') {
        commentTrxIds.push(v.objectId);
      }
      if (v.actionObjectType === 'comment') {
        commentTrxIds.push(v.actionObjectId);
      }
    });

    const [posts, comments, profiles] = await Promise.all([
      Post.bulkGet(postTrxIds),
      Comment.bulkGet(commentTrxIds),
      Profile.bulkGet(items.map((v) => ({
        groupId: v.groupId,
        userAddress: v.from,
      }))),
    ]);

    items.forEach((item) => {
      let object;
      let actionObject;
      if (item.objectType === 'post') {
        const post = posts.find((v) => v.trxId === item.objectId);
        if (post) {
          object = {
            type: 'post',
            value: post,
          } as const;
        }
      } else if (item.objectType === 'comment') {
        const comment = comments.find((v) => v.trxId === item.objectId);
        if (comment) {
          object = {
            type: 'comment',
            value: comment,
          } as const;
        }
      }

      if (item.actionObjectType === 'comment') {
        const comment = comments.find((v) => v.trxId === item.actionObjectId);
        if (comment) {
          actionObject = {
            type: 'comment',
            value: comment,
          } as const;
        }
      }

      item.extra = {
        object,
        actionObject,
        fromProfile: profiles.find((v) => v.groupId === item.groupId && v.userAddress === item.from)
          ?? Profile.generateFallbackProfile({ userAddress: item.from, groupId: item.groupId }),
      };
    });

    return Array.isArray(_items) ? items : items[0];
  }
}
