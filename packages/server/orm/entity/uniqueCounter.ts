import { either, json, function as fp } from 'fp-ts';
import { keyBy } from 'lodash';
import { CounterName, counterTrxContent } from 'nft-bbs-types';
import { IContent } from 'quorum-light-node-sdk-nodejs';
import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryGeneratedColumn } from 'typeorm';
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
    return fp.pipe(
      json.parse(item.Data.content),
      either.map((v) => counterTrxContent.decode(v)),
      either.flattenW,
      either.getOrElseW(() => null),
    );
  }

  public static create(params: EntityConstructorParams<UniqueCounter, 'id'>) {
    const item = new UniqueCounter();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<UniqueCounter, 'id'>, manager?: EntityManager) {
    const item = UniqueCounter.create(params);
    return (manager || AppDataSource.manager).save(UniqueCounter, item);
  }

  public static async destroy(where: FindOptionsWhere<UniqueCounter>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).delete(UniqueCounter, where);
  }

  public static async has(where: FindOptionsWhere<UniqueCounter>, manager?: EntityManager) {
    const count = await (manager || AppDataSource.manager).countBy(UniqueCounter, where);
    return !!count;
  }

  public static async bulkGet(queries: Array<FindOptionsWhere<UniqueCounter>>) {
    return AppDataSource.manager.findBy(UniqueCounter, queries);
  }

  public static async count(queries: FindOptionsWhere<UniqueCounter>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).countBy(UniqueCounter, queries);
  }

  public static async deleteWith(where: { groupId: string, trxId: string }, manager?: EntityManager) {
    const items = await (manager || AppDataSource.manager).findBy(
      UniqueCounter,
      { groupId: where.groupId, objectId: where.trxId },
    );
    if (!items.length) { return null; }
    return (manager || AppDataSource.manager).delete(UniqueCounter, items);
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
