import { Column, Entity, Index, FindOptionsWhere, PrimaryGeneratedColumn, EntityManager } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'profiles' })
export class Profile {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: number;

  @Index()
  @Column({ nullable: false })
  public userAddress!: string;

  @Column({ nullable: false, default: '' })
  public name!: string;

  @Column({ nullable: false, default: '' })
  public avatar!: string;

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

  private static create(params: EntityConstructorParams<Profile, 'id'>) {
    const item = new Profile();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Profile, 'id'>, manager?: EntityManager) {
    const item = Profile.create(params);
    return (manager || AppDataSource.manager).save(Profile, item);
  }

  public static async get(params: FindOptionsWhere<Profile>) {
    return AppDataSource.manager.findOne(Profile, {
      where: params,
      order: { id: 'DESC' },
    });
  }

  public static async bulkGet(params: Array<FindOptionsWhere<Profile>>, manager?: EntityManager) {
    if (!params.length) { return []; }
    return (manager || AppDataSource.manager).findBy(Profile, params);
  }

  public static generateFallbackProfile(params: { groupId?: Profile['groupId'], userAddress: Profile['userAddress'] }): Profile {
    return {
      trxId: '',
      groupId: params.groupId ?? 0,
      userAddress: params.userAddress,
      name: '',
      avatar: '',
      timestamp: Date.now(),
    };
  }
}
