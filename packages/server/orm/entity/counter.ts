import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'counters' })
export class Counter {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: string;

  @Index()
  @Column({ type: 'varchar', nullable: false })
  public type!: 'Like' | 'Dislike';

  @Index()
  @Column({ nullable: false })
  public objectId!: string;

  @Index()
  @Column({ type: 'varchar', nullable: false })
  public objectType!: 'post' | 'comment';

  @Index()
  @Column({ nullable: false })
  public userAddress!: string;

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

  private static create(params: EntityConstructorParams<Counter, 'id'>) {
    const item = new Counter();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<Counter, 'id'>, manager?: EntityManager) {
    const item = Counter.create(params);
    return (manager || AppDataSource.manager).save(Counter, item);
  }
}
