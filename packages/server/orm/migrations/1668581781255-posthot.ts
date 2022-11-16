import { MigrationInterface, QueryRunner } from 'typeorm';
import { Post } from '../entity';

export class posthot1668581781255 implements MigrationInterface {
  name = 'posthot1668581781255';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "posts" ADD "hot" integer NOT NULL DEFAULT \'0\'');
    const posts = await queryRunner.manager.find(Post);
    posts.forEach((v) => {
      v.hot = v.likeCount * 2 + v.commentCount - v.dislikeCount * 2;
    });
    await queryRunner.manager.save(Post, posts);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "posts" DROP COLUMN "hot"');
  }
}
