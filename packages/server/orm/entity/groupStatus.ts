import { Column, Entity, EntityManager, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'groupstatus' })
export class GroupStatus {
  @PrimaryColumn()
  public groupId!: string;

  @Column({ nullable: false, default: '' })
  public startTrx!: string;

  @Column({ nullable: false, default: '' })
  public seedUrl!: string;

  private static create(params: EntityConstructorParams<GroupStatus>) {
    const item = new GroupStatus();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<GroupStatus>, manager?: EntityManager) {
    const item = GroupStatus.create(params);
    return (manager || AppDataSource.manager).save(GroupStatus, item);
  }

  public static async update(groupId: string, fields: Partial<EntityConstructorParams<GroupStatus>>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).update(GroupStatus, { groupId }, fields);
  }

  public static async get(groupId: string, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOne(GroupStatus, {
      where: { groupId },
    });
  }

  public static async list(manager?: EntityManager) {
    return (manager || AppDataSource.manager).find(GroupStatus);
  }
}
