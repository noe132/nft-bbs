import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import type { Comment } from './comment';
import type { Post } from './post';

@Entity({ name: 'stackedcounters' })
export class StackedCounter {
  @PrimaryColumn()
  public groupId!: number;

  @PrimaryColumn()
  public objectId!: string;

  @Index()
  @Column({ type: 'varchar', nullable: false })
  public objectType!: 'post' | 'comment';

  @Index()
  @Column({ type: 'varchar', nullable: false })
  public type!: 'Like' | 'Dislike';

  @Index()
  @Column({ nullable: false })
  public userAddress!: string;

  private static create(params: EntityConstructorParams<StackedCounter, 'id'>) {
    const item = new StackedCounter();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<StackedCounter, 'id'>, manager?: EntityManager) {
    const item = StackedCounter.create(params);
    return (manager || AppDataSource.manager).save(StackedCounter, item);
  }

  public static async get(queries: FindOptionsWhere<StackedCounter>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOneBy(StackedCounter, queries);
  }

  public static async remove(item: StackedCounter, manager?: EntityManager) {
    return (manager || AppDataSource.manager).remove(StackedCounter, item);
  }

  public static async getCounterMap(
    p: { type: 'Like' | 'Dislike', userAddress: string, items: Array<Post | Comment> },
    manager?: EntityManager,
  ) {
    if (!p.items.length) return {};
    const groupId = p.items[0].groupId;
    const items = await (manager || AppDataSource.manager).findBy(StackedCounter, p.items.map((v) => ({
      groupId,
      objectId: v.trxId,
      type: p.type,
      userAddress: p.userAddress,
    })));

    const objectMap = items.reduce<Record<string, StackedCounter>>((p, c) => {
      p[c.objectId] = c;
      return p;
    }, {});

    return objectMap;
  }
}
