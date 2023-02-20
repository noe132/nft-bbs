import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

type GetByObjectParam = Required<Pick<FindOptionsWhere<AttachedImage>, 'groupId' | 'objectId'>>;

@Entity({ name: 'attachedimage' })
export class AttachedImage {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public groupId!: number;

  @Index()
  @Column({ nullable: false })
  public objectId!: string;

  @Column({ nullable: false })
  public mineType!: string;

  @Column({ nullable: false })
  public content!: string;

  private static create(params: EntityConstructorParams<AttachedImage, 'id'>) {
    const item = new AttachedImage();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<AttachedImage, 'id'>, manager?: EntityManager) {
    const item = AttachedImage.create(params);
    return (manager || AppDataSource.manager).save(AttachedImage, item);
  }

  public static async getByObject(
    where: GetByObjectParam | Array<GetByObjectParam>,
    manager?: EntityManager,
  ) {
    return (manager || AppDataSource.manager).find(AttachedImage, {
      where,
    });
  }
}
