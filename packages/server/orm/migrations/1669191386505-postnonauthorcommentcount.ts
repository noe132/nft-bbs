import { MigrationInterface, QueryRunner } from 'typeorm';

export class postnonauthorcommentcount1669191386505 implements MigrationInterface {
  name = 'postnonauthorcommentcount1669191386505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "posts" ADD "nonAuthorCommentCount" integer NOT NULL DEFAULT \'0\'');
    interface OldPosts {
      id: number
      groupId: number
      trxId: string
      commentCount: number
      nonAuthorCommentCount: number
      likeCount: number
      dislikeCount: number
      hot: number
      userAddress: string
    }
    interface OldComment {
      trxId: string
      postId: string
      groupId: number
      userAddress: string
    }
    const posts: Array<OldPosts> = await queryRunner.query('SELECT * FROM "posts"');
    const comments: Array<OldComment> = await queryRunner.query('SELECT * FROM "comments"');
    posts.forEach((p) => {
      p.nonAuthorCommentCount = comments.filter((c) => [
        p.groupId === c.groupId,
        p.trxId === c.postId,
        p.userAddress !== c.userAddress,
      ].every((v) => v)).length;
      p.hot = p.likeCount * 2 + p.nonAuthorCommentCount - p.dislikeCount * 2;
    });

    await queryRunner.query(
      `
      UPDATE "posts" AS "p" set
      "hot" = "t"."hot",
      "nonAuthorCommentCount" = "t"."nonAuthorCommentCount"
      FROM unnest ($1::int[], $2::int[], $3::int[]) AS "t"("id", "nonAuthorCommentCount", "hot")
      WHERE "t"."id" = "p"."id"
      `,
      [
        posts.map((v) => v.id),
        posts.map((v) => v.nonAuthorCommentCount),
        posts.map((v) => v.hot),
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "posts" DROP COLUMN "nonAuthorCommentCount"');
  }
}
