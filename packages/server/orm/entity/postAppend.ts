import { Column, Entity, EntityManager, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'postappends' })
export class PostAppend {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

  @Index()
  @Column({ nullable: false })
  public groupId!: number;

  @Index()
  @Column({ nullable: false })
  public postId!: string;

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

  private static create(params: EntityConstructorParams<PostAppend, 'id'>) {
    const item = new PostAppend();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<PostAppend, 'id'>, manager?: EntityManager) {
    const post = PostAppend.create(params);
    return (manager || AppDataSource.manager).save(post);
  }

  public static get(postId: PostAppend['postId'], manager?: EntityManager) {
    return (manager || AppDataSource.manager).findOneBy(PostAppend, { postId });
  }

  public static bulkGet(postIds: Array<PostAppend['postId']>, manager?: EntityManager) {
    if (!postIds.length) { return []; }
    return (manager || AppDataSource.manager).findBy(PostAppend, postIds.map((postId) => ({ postId })));
  }
}
