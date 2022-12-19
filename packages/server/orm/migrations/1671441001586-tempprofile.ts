import { MigrationInterface, QueryRunner } from 'typeorm';

export class tempprofile1671441001586 implements MigrationInterface {
  name = 'tempprofile1671441001586';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "tempprofiles" ("groupId" integer NOT NULL, "userAddress" character varying NOT NULL, "name" character varying NOT NULL DEFAULT \'\', "avatar" character varying NOT NULL DEFAULT \'\', CONSTRAINT "PK_f7dd86a459c7cd999093684a90f" PRIMARY KEY ("groupId", "userAddress"))');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tempprofiles"');
  }
}
