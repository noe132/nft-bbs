import { MigrationInterface, QueryRunner } from 'typeorm';

export class postappend1671702402931 implements MigrationInterface {
  name = 'postappend1671702402931';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "postappends" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" integer NOT NULL, "postId" character varying NOT NULL, "content" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_f0a65c4c2dfc41e2d6f8feafda1" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE INDEX "IDX_34d43519f9ddfbe6ab7bf2b762" ON "postappends" ("trxId") ');
    await queryRunner.query('CREATE INDEX "IDX_8ee4c959c306cc849fe9a3f794" ON "postappends" ("groupId") ');
    await queryRunner.query('CREATE INDEX "IDX_8e238809bfe8c1141f117ba88a" ON "postappends" ("postId") ');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_8e238809bfe8c1141f117ba88a"');
    await queryRunner.query('DROP INDEX "public"."IDX_8ee4c959c306cc849fe9a3f794"');
    await queryRunner.query('DROP INDEX "public"."IDX_34d43519f9ddfbe6ab7bf2b762"');
    await queryRunner.query('DROP TABLE "postappends"');
  }
}
