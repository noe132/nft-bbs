import { isLeft, tryCatch } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { imageTrxContent } from 'nft-bbs-types';
import { IContent } from 'quorum-light-node-sdk-nodejs';
import { Column, Entity, EntityManager, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'image' })
export class ImageFile {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: string;

  @Column({ nullable: false })
  public mineType!: string;

  @Column({ nullable: false })
  public content!: string;

  @Column({
    type: 'timestamp',
    nullable: false,
    transformer: {
      from: (v: Date) => v.getTime(),
      to: (v: number) => new Date(v),
    },
  })
  public timestamp!: number;


  public static parseTrxContent(item: IContent) {
    const data = tryCatch(() => JSON.parse(item.Data.content), identity);
    if (isLeft(data)) { return null; }
    const trxContent = imageTrxContent.decode(data.right);
    if (isLeft(trxContent)) { return null; }
    return trxContent.right;
  }

  public static create(params: EntityConstructorParams<ImageFile, 'id'>) {
    const item = new ImageFile();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<ImageFile, 'id'>, manager?: EntityManager) {
    const item = ImageFile.create(params);
    return (manager || AppDataSource.manager).save(ImageFile, item);
  }

  public static async get(groupId: string, trxId: string) {
    return AppDataSource.manager.findOne(ImageFile, {
      where: { groupId, trxId },
      order: { id: 'desc' },
    });
  }
}
