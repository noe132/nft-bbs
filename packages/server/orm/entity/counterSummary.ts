import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import type { Comment } from './comment';
import type { Post } from './post';

@Entity({ name: 'countersummary' })
export class CounterSummary {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column()
  public groupId!: number;

  @Index()
  @Column()
  public objectId!: string;

  @Index()
  @Column()
  public objectType!: 'post' | 'comment';

  @Index()
  @Column()
  public type!: 'like' | 'dislike';

  @Index()
  @Column()
  public userAddress!: string;

  @Column()
  public value!: number;

  private static create(params: EntityConstructorParams<CounterSummary, 'id'>) {
    const item = new CounterSummary();
    Object.assign(item, params);
    return item;
  }

  public static async set(params: EntityConstructorParams<CounterSummary, 'id'>, manager?: EntityManager) {
    const { groupId, objectId, objectType, type, userAddress, value } = params;
    const existedItem = await (manager || AppDataSource.manager).findOneBy(CounterSummary, {
      groupId, objectId, objectType, type, userAddress,
    });
    if (existedItem) {
      existedItem.value += value;
      return (manager || AppDataSource.manager).save(CounterSummary, existedItem);
    }
    const newItem = CounterSummary.create(params);
    return (manager || AppDataSource.manager).save(CounterSummary, newItem);
  }

  public static async get(where: FindOptionsWhere<CounterSummary>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOneBy(CounterSummary, where);
  }

  public static async getCounterMap(
    p: { type: CounterSummary['type'], userAddress: string, items: Array<Post | Comment> },
    manager?: EntityManager,
  ) {
    if (!p.items.length) return {};
    const groupId = p.items[0].groupId;
    const items = await (manager || AppDataSource.manager).findBy(CounterSummary, p.items.map((v) => ({
      groupId,
      objectId: v.id,
      type: p.type,
      userAddress: p.userAddress,
    })));

    const objectMap = items.reduce<Record<string, CounterSummary | undefined>>((p, c) => {
      p[c.objectId] = c;
      return p;
    }, {});

    return objectMap;
  }
}
