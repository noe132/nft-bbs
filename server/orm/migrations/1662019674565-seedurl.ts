import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedurl1662019674565 implements MigrationInterface {
  name = 'seedurl1662019674565';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "seedUrl" character varying NOT NULL DEFAULT \'\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "seedUrl"');
  }
}
