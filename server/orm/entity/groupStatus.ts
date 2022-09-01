import { Column, Entity, EntityManager, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'groupstatus' })
export class GroupStatus {
  @PrimaryColumn()
  public groupId!: string;

  @Column({ nullable: false, default: '' })
  public startTrx!: string;

  public static create(params: EntityConstructorParams<GroupStatus>) {
    const item = new GroupStatus();
    Object.assign(item, params);
    return item;
  }

  public static async addOrUpdate(params: EntityConstructorParams<GroupStatus>, manager?: EntityManager) {
    const existed = await GroupStatus.get(params.groupId, manager);
    if (existed) {
      existed.startTrx = params.startTrx;
      await (manager || AppDataSource.manager).save(GroupStatus, existed);
      return;
    }
    const item = GroupStatus.create(params);
    return (manager || AppDataSource.manager).save(GroupStatus, item);
  }

  public static async get(groupId: string, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOne(GroupStatus, {
      where: { groupId },
    });
  }
}
