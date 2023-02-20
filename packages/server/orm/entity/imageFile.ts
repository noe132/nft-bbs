import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'imagefile' })
export class ImageFile {
  @PrimaryColumn()
  public groupId!: number;

  @PrimaryColumn()
  public id!: string;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

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

  private static create(params: EntityConstructorParams<ImageFile>) {
    const item = new ImageFile();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<ImageFile>, manager?: EntityManager) {
    const item = ImageFile.create(params);
    return (manager || AppDataSource.manager).save(ImageFile, item);
  }

  public static async get(groupId: ImageFile['groupId'], id: string, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOne(ImageFile, {
      where: { groupId, id },
      order: { id: 'desc' },
    });
  }

  public static async has(where: Required<Pick<FindOptionsWhere<ImageFile>, 'groupId' | 'id'>>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).exists(ImageFile, { where });
  }

  public static async list(where: FindOptionsWhere<ImageFile> | Array<FindOptionsWhere<ImageFile>>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).find(ImageFile, {
      where,
      order: { id: 'desc' },
    });
  }
}
