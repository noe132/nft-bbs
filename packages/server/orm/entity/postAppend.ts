import { Column, Entity, EntityManager, FindOptionsWhere, Index, PrimaryColumn } from 'typeorm';
import { EntityConstructorParams } from '~/utils';
import { AppDataSource } from '../data-source';

@Entity({ name: 'postappends' })
export class PostAppend {
  @PrimaryColumn()
  public groupId!: number;

  @PrimaryColumn()
  public id!: string;

  @Index()
  @Column({ nullable: false })
  public trxId!: string;

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

  private static create(params: EntityConstructorParams<PostAppend>) {
    const item = new PostAppend();
    Object.assign(item, params);
    return item;
  }

  public static async add(params: EntityConstructorParams<PostAppend>, manager?: EntityManager) {
    const post = PostAppend.create(params);
    return (manager || AppDataSource.manager).save(post);
  }

  public static get(where: Required<Pick<FindOptionsWhere<PostAppend>, 'groupId' | 'id'>>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).findBy(PostAppend, where);
  }

  public static has(where: Required<Pick<FindOptionsWhere<PostAppend>, 'groupId' | 'id'>>, manager?: EntityManager) {
    return (manager || AppDataSource.manager).exists(PostAppend, { where });
  }

  public static getByPost(wheres: Array<Required<Pick<FindOptionsWhere<PostAppend>, 'groupId' | 'postId'>>>, manager?: EntityManager) {
    if (!wheres.length) { return []; }
    return (manager || AppDataSource.manager).findBy(PostAppend, wheres);
  }
}
