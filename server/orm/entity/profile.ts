import { isLeft, tryCatch } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { IContent } from 'quorum-light-node-sdk-nodejs';
import { Column, Entity, Index, FindOptionsWhere, PrimaryGeneratedColumn, EntityManager } from 'typeorm';
import { profileTrxContent } from '~/types';
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
  public groupId!: string;

  @Index()
  @Column({ nullable: false })
  public userAddress!: string;

  @Column({ nullable: false, default: '' })
  public name!: string;

  @Column({ nullable: false, default: '' })
  public avatar!: string;

  @Column({ nullable: false, default: '' })
  public intro!: string;

  @Index()
  @Column({
    type: 'timestamp',
    nullable: false,
    transformer: {
      from: (v: Date) => v.getTime(),
      to: (v: number) => new Date(v),
    },
  })

  public static parseTrxContent(item: IContent) {
    const data = tryCatch(() => JSON.parse(item.Data.content), identity);
    if (isLeft(data)) { return null; }
    const trxContent = profileTrxContent.decode(data.right);
    if (isLeft(trxContent)) { return null; }
    return trxContent.right;
  }

  public static create(params: EntityConstructorParams<Profile, 'id'>) {
    const item = new Profile();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Profile, 'id'>, manager?: EntityManager) {
    const item = Profile.create(params);
    return (manager || AppDataSource.manager).save(Profile, item);
  }

  public static async get(params: FindOptionsWhere<Profile>) {
    return AppDataSource.manager.findOneBy(Profile, params);
  }

  public static async bulkGet(params: Array<FindOptionsWhere<Profile>>, manager?: EntityManager) {
    if (!params.length) { return []; }
    return (manager || AppDataSource.manager).findBy(Profile, params);
  }

  public static generateFallbackProfile(params: { groupId?: string, userAddress: string }): Profile {
    return {
      trxId: '',
      groupId: params.groupId ?? '',
      userAddress: params.userAddress,
      name: '',
      avatar: '',
      intro: '',
    };
  }
}
