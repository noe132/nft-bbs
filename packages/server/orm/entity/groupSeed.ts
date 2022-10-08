import { Column, Entity, EntityManager, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'groupseed' })
export class GroupSeed {
  @PrimaryColumn()
  public seedUrl!: string;

  @Column({ nullable: false, default: '' })
  public groupId!: string;

  public static create(params: EntityConstructorParams<GroupSeed>) {
    const item = new GroupSeed();
    Object.assign(item, params);
    return item;
  }

  public static async has(seedUrl: string, manager?: EntityManager) {
    return !!await (manager || AppDataSource.manager).countBy(GroupSeed, { seedUrl });
  }

  public static async add(params: EntityConstructorParams<GroupSeed>, manager?: EntityManager) {
    const item = GroupSeed.create(params);
    return (manager || AppDataSource.manager).save(GroupSeed, item);
  }

  public static async get(groupId: string, manager?: EntityManager) {
    return (manager || AppDataSource.manager).find(GroupSeed, {
      where: { groupId },
    });
  }

  public static async list(manager?: EntityManager) {
    return (manager || AppDataSource.manager).find(GroupSeed);
  }
}
