import { either } from 'fp-ts';
import { groupInfoTrxContent } from 'nft-bbs-types';
import { IContent } from 'quorum-light-node-sdk-nodejs';
import { Column, Entity, EntityManager, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'groupinfo' })
export class GroupInfo {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false, unique: true })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: string;

  @Column({ nullable: false })
  public avatar!: string;

  @Column({ nullable: false })
  public desc!: string;

  @Index()
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
    const data = either.tryCatch(() => JSON.parse(item.Data.content), (v) => v);
    if (either.isLeft(data)) { return null; }
    const trxContent = groupInfoTrxContent.decode(data.right);
    if (either.isLeft(trxContent)) { return null; }
    return trxContent.right;
  }

  public static create(params: EntityConstructorParams<GroupInfo, 'id'>) {
    const item = new GroupInfo();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<GroupInfo, 'id'>, manager?: EntityManager) {
    const item = GroupInfo.create(params);
    return (manager || AppDataSource.manager).save(GroupInfo, item);
  }

  public static async get(groupId: string) {
    return AppDataSource.manager.findOne(GroupInfo, {
      where: { groupId },
      order: { timestamp: 'desc' },
    });
  }
}
