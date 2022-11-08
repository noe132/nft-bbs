import { Column, Entity, Index, PrimaryGeneratedColumn, EntityManager, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'nftrequests' })
export class NftRequest {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public by!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: string;

  @Column({ nullable: false, default: '' })
  public memo!: string;

  @Column({ nullable: false, default: '' })
  public reply!: string;

  @Index()
  @Column({ type: 'varchar', nullable: false, default: 'pending' })
  public status!: 'pending' | 'rejected' | 'approved';

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt?: string;

  @Index()
  @UpdateDateColumn({ type: 'timestamptz' })
  public updatedAt?: string;

  private static create(params: EntityConstructorParams<NftRequest, 'id'>) {
    const item = new NftRequest();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<NftRequest, 'id' | 'extra'>, manager?: EntityManager) {
    const item = NftRequest.create(params);
    return (manager || AppDataSource.manager).save(NftRequest, item);
  }

  public static async get(id: number, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOne(NftRequest, { where: { id } });
  }
}
