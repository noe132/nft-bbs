import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'objecthistory' })
export class ObjectHistory {
  @PrimaryColumn()
  public groupId!: number;

  @PrimaryColumn()
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public objectId!: string;

  @Index()
  @Column({ nullable: false })
  public objectType!: string;

  @Index()
  @Column({ nullable: false })
  public type!: string;

  @Column({ nullable: false })
  public content!: string;

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

  private static create(params: EntityConstructorParams<ObjectHistory>) {
    const item = new ObjectHistory();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<ObjectHistory>, manager?: EntityManager) {
    const post = ObjectHistory.create(params);
    return (manager || AppDataSource.manager).save(post);
  }

  public static get(where: Pick<FindOptionsWhere<ObjectHistory>, 'groupId' | 'objectId'>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findBy(ObjectHistory, where);
  }
}
