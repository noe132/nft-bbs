import { isLeft, tryCatch } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { keyBy } from 'lodash';
import { IContent } from 'quorum-light-node-sdk-nodejs';
import { Column, Entity, FindOptionsWhere, Index, PrimaryGeneratedColumn } from 'typeorm';
import { CounterName, counterTrxContent } from '~/types';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import type { Comment } from './comment';
import type { Post } from './posts';

@Entity({ name: 'uniquecounters' })
export class UniqueCounter {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: string;

  @Index()
  @Column({ type: 'varchar', nullable: false })
  public name!: CounterName;

  @Index()
  @Column({ nullable: false })
  public objectId!: string;

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

  public static parseTrxContent(item: IContent) {
    const data = tryCatch(() => JSON.parse(item.Data.content), identity);
    if (isLeft(data)) { return null; }
    const trxContent = counterTrxContent.decode(data.right);
    if (isLeft(trxContent)) { return null; }
    return trxContent.right;
  }

  public static create(params: EntityConstructorParams<UniqueCounter, 'id'>) {
    const item = new UniqueCounter();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<UniqueCounter, 'id'>) {
    const item = UniqueCounter.create(params);
    return AppDataSource.manager.save(UniqueCounter, item);
  }

  public static async destroy(where: FindOptionsWhere<UniqueCounter>) {
    return AppDataSource.manager.delete(UniqueCounter, where);
  }

  public static async has(where: FindOptionsWhere<UniqueCounter>) {
    const count = await AppDataSource.manager.countBy(UniqueCounter, where);
    return !!count;
  }

  public static async bulkGet(queries: Array<FindOptionsWhere<UniqueCounter>>) {
    return AppDataSource.manager.findBy(UniqueCounter, queries);
  }

  public static async count(queries: FindOptionsWhere<UniqueCounter>) {
    return AppDataSource.manager.countBy(UniqueCounter, queries);
  }

  public static async deleteWith(trxId: string) {
    const items = await AppDataSource.manager.findBy(UniqueCounter, { objectId: trxId });
    if (!items.length) { return null; }
    return AppDataSource.manager.delete(UniqueCounter, items);
  }

  public static async getCounterMap(p: { counterName: CounterName, userAddress: string, items: Array<Post | Comment> }) {
    const counters = await UniqueCounter.bulkGet(p.items.map((item) => ({
      name: p.counterName,
      objectId: item.trxId,
      userAddress: p.userAddress,
    })));
    return keyBy(counters, (dislike) => dislike.objectId);
  }
}
