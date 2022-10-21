import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'imagefile' })
export class ImageFile {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public name!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: string;

  @Column({ nullable: false })
  public mineType!: string;

  @Column({ nullable: false })
  public content!: string;

  @Column({ nullable: false })
  public userAddress!: string;

  @Column({
    type: 'timestamp',
    nullable: false,
    transformer: {
      from: (v: Date) => v.getTime(),
      to: (v: number) => new Date(v),
    },
  })
  public timestamp!: number;

  private static create(params: EntityConstructorParams<ImageFile, 'id'>) {
    const item = new ImageFile();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<ImageFile, 'id'>, manager?: EntityManager) {
    const item = ImageFile.create(params);
    return (manager || AppDataSource.manager).save(ImageFile, item);
  }

  public static async get(groupId: string, trxId: string, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOne(ImageFile, {
      where: { groupId, trxId },
      order: { id: 'desc' },
    });
  }

  public static async list(where: FindOptionsWhere<ImageFile> | Array<FindOptionsWhere<ImageFile>>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).find(ImageFile, {
      where,
      order: { id: 'desc' },
    });
  }
}
