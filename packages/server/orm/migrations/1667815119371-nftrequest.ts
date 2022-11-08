import { MigrationInterface, QueryRunner } from 'typeorm';

export class nftrequest1667815119371 implements MigrationInterface {
  name = 'nftrequest1667815119371';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "nftrequests" ("id" SERIAL NOT NULL, "by" character varying NOT NULL, "groupId" character varying NOT NULL, "memo" character varying NOT NULL DEFAULT \'\', "reply" character varying NOT NULL DEFAULT \'\', "status" character varying NOT NULL DEFAULT \'pending\', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2048dac8ce9b8f7acb817e6a080" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE INDEX "IDX_cc11098096fe3738711ed64ed0" ON "nftrequests" ("by") ');
    await queryRunner.query('CREATE INDEX "IDX_0988cd97f7fbc7dd57c086c39f" ON "nftrequests" ("groupId") ');
    await queryRunner.query('CREATE INDEX "IDX_f351681fc3ee45ac3e92557950" ON "nftrequests" ("status") ');
    await queryRunner.query('CREATE INDEX "IDX_af98d3d652b941e342dfc9f914" ON "nftrequests" ("createdAt") ');
    await queryRunner.query('CREATE INDEX "IDX_377a8a2fe75069896a81560b49" ON "nftrequests" ("updatedAt") ');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_377a8a2fe75069896a81560b49"');
    await queryRunner.query('DROP INDEX "public"."IDX_af98d3d652b941e342dfc9f914"');
    await queryRunner.query('DROP INDEX "public"."IDX_f351681fc3ee45ac3e92557950"');
    await queryRunner.query('DROP INDEX "public"."IDX_0988cd97f7fbc7dd57c086c39f"');
    await queryRunner.query('DROP INDEX "public"."IDX_cc11098096fe3738711ed64ed0"');
    await queryRunner.query('DROP TABLE "nftrequests"');
  }
}
