import { Entity, EntityManager, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'trxset' })
export class TrxSet {
  @PrimaryColumn()
  public groupId!: number;

  @PrimaryColumn()
  public trxId!: string;

  private static create(params: EntityConstructorParams<TrxSet, 'id'>) {
    const item = new TrxSet();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<TrxSet>, manager?: EntityManager) {
    const item = TrxSet.create(params);
    return (manager || AppDataSource.manager).save(TrxSet, item);
  }

  public static async has(groupId: TrxSet['groupId'], trxId: TrxSet['trxId'], manager?: EntityManager) {
    return !!await (manager || AppDataSource.manager).countBy(TrxSet, { groupId, trxId });
  }
}
