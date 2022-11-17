import { MigrationInterface, QueryRunner } from 'typeorm';

export class posthot1668581781255 implements MigrationInterface {
  name = 'posthot1668581781255';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "posts" ADD "hot" integer NOT NULL DEFAULT \'0\'');

    interface OldPost {
      id: number
      commentCount: number
      likeCount: number
      dislikeCount: number
      hot: number
    }
    const posts: Array<OldPost> = await queryRunner.query('SELECT * FROM "posts"');
    const ids = posts.map((v) => v.id);
    const hots = posts.map((v) => v.likeCount * 2 + v.commentCount - v.dislikeCount * 2);
    await queryRunner.query(
      `
      UPDATE "posts" AS "p" SET "hot" = "t"."hot" FROM
      (SELECT * FROM UNNEST ($1::int[], $2::int[])) AS "t"("id", "hot")
      WHERE "t"."id" = "p"."id"
      `,
      [
        ids,
        hots,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "posts" DROP COLUMN "hot"');
  }
}
