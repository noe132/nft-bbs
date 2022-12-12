import { Column, Entity, EntityManager, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'groupstatus' })
export class GroupStatus {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column({ nullable: false, default: '' })
  public shortName!: string;

  @Column({ nullable: false, default: '' })
  public mainSeedUrl!: string;

  @Column({ nullable: false, default: '' })
  public commentSeedUrl!: string;

  @Column({ nullable: false, default: '' })
  public counterSeedUrl!: string;

  @Column({ nullable: false, default: '' })
  public profileSeedUrl!: string;

  @Column({ nullable: false, default: '' })
  public mainStartTrx!: string;

  @Column({ nullable: false, default: '' })
  public commentStartTrx!: string;

  @Column({ nullable: false, default: '' })
  public counterStartTrx!: string;

  @Column({ nullable: false, default: '' })
  public profileStartTrx!: string;

  @Column({ nullable: false, default: true })
  public loaded!: boolean;

  @Column({ nullable: false, default: false })
  public private!: boolean;

  private static create(params: EntityConstructorParams<GroupStatus, 'id'>) {
    const item = new GroupStatus();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<GroupStatus, 'id'>, manager?: EntityManager) {
    const item = GroupStatus.create(params);
    return (manager || AppDataSource.manager).save(GroupStatus, item);
  }

  public static async update(id: GroupStatus['id'], fields: Partial<EntityConstructorParams<GroupStatus>>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).update(GroupStatus, { id }, fields);
  }

  public static async get(id: GroupStatus['id'], manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOne(GroupStatus, {
      where: { id },
    });
  }

  public static async list(manager?: EntityManager) {
    return (manager || AppDataSource.manager).find(GroupStatus, {
      order: {
        id: 'ASC',
      },
    });
  }
}
