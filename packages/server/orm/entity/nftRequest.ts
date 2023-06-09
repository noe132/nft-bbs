import { utils } from 'rum-sdk-nodejs';
import { Column, Entity, Index, PrimaryGeneratedColumn, EntityManager, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';
import { GroupStatus } from './groupStatus';
import { Profile } from './profile';

@Entity({ name: 'nftrequests' })
export class NftRequest {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public by!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: number;

  @Column({ nullable: false, default: '' })
  public memo!: string;

  @Column({ nullable: false, default: '' })
  public reply!: string;

  @Index()
  @Column({ type: 'varchar', nullable: false, default: 'pending' })
  public status!: 'pending' | 'rejected' | 'approved';

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt?: string;

  @Index()
  @UpdateDateColumn({ type: 'timestamptz' })
  public updatedAt?: string;

  public extra?: {
    groupName: string
    profile?: Profile
  };

  private static create(params: EntityConstructorParams<NftRequest, 'id'>) {
    const item = new NftRequest();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<NftRequest, 'id' | 'extra'>, manager?: EntityManager) {
    const item = NftRequest.create(params);
    return (manager || AppDataSource.manager).save(NftRequest, item);
  }

  public static async get(id: NftRequest['id'], manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOne(NftRequest, { where: { id } });
  }

  public static async bulkGet(ids: Array<NftRequest['id']>, manager?: EntityManager) {
    if (!ids.length) { return []; }
    return (manager || AppDataSource.manager).createQueryBuilder()
      .from(NftRequest, 'nft')
      .select('nft')
      .whereInIds(ids)
      .getMany();
  }

  public static async pack(items: Array<NftRequest>, manager?: EntityManager) {
    if (!items.length) { return items; }
    const groupIds = Array.from(
      items.reduce((p, c) => { p.add(c.groupId); return p; }, new Set<NftRequest['groupId']>()),
    );
    const userAddresses = Array.from(
      items.reduce((p, c) => { p.add(c.by); return p; }, new Set<NftRequest['by']>()),
    );
    const groups = groupIds.length
      ? await (manager ?? AppDataSource.manager).createQueryBuilder()
        .select('groupstatus')
        .from(GroupStatus, 'groupstatus')
        .where('groupstatus.id in (:...groupIds)', { groupIds })
        .getMany()
      : [];

    const profiles = userAddresses.length
      ? await (manager ?? AppDataSource.manager).createQueryBuilder()
        .select('profile')
        .from(Profile, 'profile')
        .where('profile.userAddress in (:...userAddresses)', { userAddresses })
        .getMany()
      : [];

    const groupNameMap = groups.reduce(
      (p, c) => {
        const seedUrl = c.mainSeedUrl;
        const groupName = utils.restoreSeedFromUrl(seedUrl).group_name;
        p.set(c.id, groupName);
        return p;
      },
      new Map<number, string>(),
    );

    const profileMap = profiles.reduce(
      (p, c) => {
        p.set(c.userAddress, c);
        return p;
      },
      new Map<string, Profile>(),
    );

    items.forEach((v) => {
      v.extra = {
        groupName: groupNameMap.get(v.groupId) ?? '',
        profile: profileMap.get(v.by),
      };
    });

    return items;
  }
}
