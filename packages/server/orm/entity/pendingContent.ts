import { Column, Entity, EntityManager, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'pendingcontent' })
export class PendingContent {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column()
  @Index()
  public groupId!: number;

  @Column()
  public content!: string;

  private static create(params: EntityConstructorParams<PendingContent, 'id'>) {
    const item = new PendingContent();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<PendingContent>, manager?: EntityManager) {
    const item = PendingContent.create(params);
    return (manager || AppDataSource.manager).save(PendingContent, item);
  }

  public static async list(groupId: PendingContent['groupId'], manager?: EntityManager) {
    return (manager || AppDataSource.manager).findBy(PendingContent, {
      groupId,
    });
  }

  public static async delete(id: PendingContent['id'], manager?: EntityManager) {
    return (manager || AppDataSource.manager).delete(PendingContent, id);
  }
}
