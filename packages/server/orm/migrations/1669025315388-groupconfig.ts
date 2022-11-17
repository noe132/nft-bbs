import { MigrationInterface, QueryRunner } from 'typeorm';

export class groupconfig1669025315388 implements MigrationInterface {
  name = 'groupconfig1669025315388';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "groupconfig" ("groupId" integer NOT NULL, "keystore" boolean NOT NULL, "mixin" boolean NOT NULL, "anonymous" boolean NOT NULL, "nft" character varying NOT NULL, CONSTRAINT "PK_926b812139148493792056f1440" PRIMARY KEY ("groupId"))');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "groupconfig"');
  }
}
