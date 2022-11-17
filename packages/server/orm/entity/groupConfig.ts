import { Column, Entity, EntityManager, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'groupconfig' })
export class GroupConfig {
  @PrimaryColumn()
  public groupId!: number;

  @Column({ nullable: false })
  public keystore!: boolean;

  @Column({ nullable: false })
  public mixin!: boolean;

  @Column({ nullable: false })
  public anonymous!: boolean;

  @Column({ nullable: false })
  public nft!: string;

  private static create(params: EntityConstructorParams<GroupConfig>) {
    const item = new GroupConfig();
    Object.assign(item, params);
    return item;
  }

  public static list(manager?: EntityManager) {
    return (manager || AppDataSource.manager).find(GroupConfig);
  }

  public static async set(groupConfig: EntityConstructorParams<GroupConfig>, manager?: EntityManager) {
    const item = await (manager || AppDataSource.manager).findOneBy(GroupConfig, {
      groupId: groupConfig.groupId,
    });
    if (item) {
      Object.assign(item, groupConfig);
      await (manager || AppDataSource.manager).save(GroupConfig, item);
      return item;
    }
    const newItem = GroupConfig.create(groupConfig);
    await (manager || AppDataSource.manager).save(GroupConfig, newItem);
    return newItem;
  }

  public static async delete(groupId: GroupConfig['groupId'], manager?: EntityManager) {
    await (manager || AppDataSource.manager).delete(GroupConfig, {
      groupId,
    });
  }
}
