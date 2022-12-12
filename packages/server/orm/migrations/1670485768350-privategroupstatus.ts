import { MigrationInterface, QueryRunner } from 'typeorm';

export class privategroupstatus1670485768350 implements MigrationInterface {
  name = 'privategroupstatus1670485768350';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "private" boolean NOT NULL DEFAULT false');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "private"');
  }
}
