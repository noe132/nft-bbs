import { Column, Entity, FindOptionsWhere, EntityManager, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import type { Profile } from './profile';

@Entity({ name: 'tempprofiles' })
export class TempProfile {
  @PrimaryColumn()
  public groupId!: number;

  @PrimaryColumn()
  public userAddress!: string;

  @Column({ nullable: false, default: '' })
  public name!: string;

  @Column({ nullable: false, default: '' })
  public avatar!: string;

  private static create(params: EntityConstructorParams<TempProfile>) {
    const item = new TempProfile();
    Object.assign(item, params);
    return item;
  }

  public static async put(params: EntityConstructorParams<TempProfile>, manager?: EntityManager) {
    const item = TempProfile.create(params);
    return (manager || AppDataSource.manager).save(TempProfile, item);
  }

  public static async get(params: FindOptionsWhere<TempProfile>) {
    return AppDataSource.manager.findOne(TempProfile, {
      where: params,
    });
  }

  public static async bulkGet(params: Array<FindOptionsWhere<TempProfile>>, manager?: EntityManager) {
    if (!params.length) { return []; }
    return (manager || AppDataSource.manager).findBy(TempProfile, params);
  }

  public static toProfile(tempProfile: TempProfile): Profile {
    return {
      ...tempProfile,
      id: 0,
      trxId: '',
      timestamp: Date.now(),
    };
  }
}
