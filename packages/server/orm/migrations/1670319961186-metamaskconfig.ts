import { MigrationInterface, QueryRunner } from 'typeorm';

export class metamaskconfig1670319961186 implements MigrationInterface {
  name = 'metamaskconfig1670319961186';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "groupconfig" ADD "metamask" boolean NOT NULL DEFAULT true');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "groupconfig" DROP COLUMN "metamask"');
  }
}
