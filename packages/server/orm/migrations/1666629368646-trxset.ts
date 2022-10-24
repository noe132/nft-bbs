import { MigrationInterface, QueryRunner } from 'typeorm';

export class trxset1666629368646 implements MigrationInterface {
  name = 'trxset1666629368646';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "trxset" ("trxId" character varying NOT NULL, CONSTRAINT "PK_d9989dbbf8758ef5971ae0a5adf" PRIMARY KEY ("trxId"))');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "trxset"');
  }
}
