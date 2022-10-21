import { MigrationInterface, QueryRunner } from "typeorm";

export class init1666255930348 implements MigrationInterface {
    name = 'init1666255930348'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "imagefile" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "name" character varying NOT NULL, "groupId" character varying NOT NULL, "mineType" character varying NOT NULL, "content" character varying NOT NULL, "userAddress" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_1b46547ff361f5752001738e49c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_64f4f5768d8d4effd9dc7a1ee4" ON "imagefile" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_47e710cb6aada51f4c3f795b49" ON "imagefile" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_e3f4a7d9e95137b36b2480ac4f" ON "imagefile" ("groupId") `);
        await queryRunner.query(`CREATE TABLE "profiles" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "userAddress" character varying NOT NULL, "name" character varying NOT NULL DEFAULT '', "avatar" character varying NOT NULL DEFAULT '', "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4ac02c7a052bbc73576d6e9512" ON "profiles" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_13a496076a1e84ecef0049dc23" ON "profiles" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_aa3e2f4ab9bf065294111feb28" ON "profiles" ("userAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_8b7c3bb25fc546bbf0a791f77b" ON "profiles" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "stackedcounters" ("groupId" character varying NOT NULL, "objectId" character varying NOT NULL, "objectType" character varying NOT NULL, "type" character varying NOT NULL, "userAddress" character varying NOT NULL, CONSTRAINT "PK_c996fdc33327fc66a44f2a5bff6" PRIMARY KEY ("groupId", "objectId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cdcc1f870f5ee3704b75efb6f5" ON "stackedcounters" ("objectType") `);
        await queryRunner.query(`CREATE INDEX "IDX_917b56ef7529df2d4d2445ec96" ON "stackedcounters" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_8110f55f53cbf2c875d834d5be" ON "stackedcounters" ("userAddress") `);
        await queryRunner.query(`CREATE TABLE "comments" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "content" character varying NOT NULL, "postId" character varying NOT NULL, "threadId" character varying NOT NULL, "replyId" character varying NOT NULL, "userAddress" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "commentCount" integer NOT NULL, "likeCount" integer NOT NULL, "dislikeCount" integer NOT NULL, CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97bb1c85e0906c9e08ddb3a1ef" ON "comments" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dfcb12a949527d4b665b0a5099" ON "comments" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e44ddaaa6d058cb4092f83ad61" ON "comments" ("postId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f682eb665c360168731f596b0e" ON "comments" ("threadId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9029c2464ed0c122197be4f60b" ON "comments" ("replyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fcdfd24f4c1627eb1f070d7d50" ON "comments" ("userAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_31761e5f1b67f42fa0da44bc03" ON "comments" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "counters" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "type" character varying NOT NULL, "objectId" character varying NOT NULL, "objectType" character varying NOT NULL, "userAddress" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_910bfcbadea9cde6397e0daf996" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fe5974ee4af5427d2ca4210469" ON "counters" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d5ca40ed63b438d98c053b9540" ON "counters" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_05016cb34d66ea1d0eb3775c7f" ON "counters" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_81b3e177d31751be3eae8765de" ON "counters" ("objectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8f8c2691d839de621dc171e27e" ON "counters" ("objectType") `);
        await queryRunner.query(`CREATE INDEX "IDX_394a6392a368e40bca32694d51" ON "counters" ("userAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_478cb63b3a2ebaf1479650eb57" ON "counters" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "groupseed" ("seedUrl" character varying NOT NULL, "groupId" character varying NOT NULL DEFAULT '', CONSTRAINT "PK_5009aabd8db095167344184c322" PRIMARY KEY ("seedUrl"))`);
        await queryRunner.query(`CREATE TABLE "groupinfo" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "avatar" character varying NOT NULL, "desc" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "UQ_1dbbb645715c05ce0a131999740" UNIQUE ("trxId"), CONSTRAINT "PK_e7ea35ddaef2ddbe5985ad21656" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1dbbb645715c05ce0a13199974" ON "groupinfo" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_27c75a307d3baeee6749f8e45d" ON "groupinfo" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_40f5c0a66ffe4f0115898475e4" ON "groupinfo" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "groupstatus" ("groupId" character varying NOT NULL, "startTrx" character varying NOT NULL DEFAULT '', "seedUrl" character varying NOT NULL DEFAULT '', CONSTRAINT "PK_3f571bf581aab90549859c86829" PRIMARY KEY ("groupId"))`);
        await queryRunner.query(`CREATE TABLE "posts" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "title" character varying NOT NULL, "content" character varying NOT NULL, "userAddress" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "commentCount" integer NOT NULL, "likeCount" integer NOT NULL, "dislikeCount" integer NOT NULL, "deletedDate" TIMESTAMP, CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_11cf948188534e93d1966b5fc6" ON "posts" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d10acbe503da4c56853181efc9" ON "posts" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_1d06b06239b734b58ce158d7ff" ON "posts" ("userAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_2385da2b4885e83b8632782f24" ON "posts" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "groupId" character varying NOT NULL, "to" character varying NOT NULL, "from" character varying NOT NULL, "type" character varying NOT NULL, "objectType" character varying NOT NULL, "objectId" character varying NOT NULL, "actionObjectType" character varying NOT NULL, "actionObjectId" character varying NOT NULL, "status" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_14b5dd028d27b03db508ba7b13" ON "notifications" ("to") `);
        await queryRunner.query(`CREATE INDEX "IDX_cb0be279169836d581cab485ff" ON "notifications" ("from") `);
        await queryRunner.query(`CREATE INDEX "IDX_aef1c7aef3725068e5540f8f00" ON "notifications" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_92f5d3a7779be163cbea7916c6" ON "notifications" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_5f0cceaef187f5c7884891c9e0" ON "notifications" ("timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5f0cceaef187f5c7884891c9e0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_92f5d3a7779be163cbea7916c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aef1c7aef3725068e5540f8f00"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cb0be279169836d581cab485ff"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_14b5dd028d27b03db508ba7b13"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2385da2b4885e83b8632782f24"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1d06b06239b734b58ce158d7ff"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d10acbe503da4c56853181efc9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_11cf948188534e93d1966b5fc6"`);
        await queryRunner.query(`DROP TABLE "posts"`);
        await queryRunner.query(`DROP TABLE "groupstatus"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40f5c0a66ffe4f0115898475e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_27c75a307d3baeee6749f8e45d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1dbbb645715c05ce0a13199974"`);
        await queryRunner.query(`DROP TABLE "groupinfo"`);
        await queryRunner.query(`DROP TABLE "groupseed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_478cb63b3a2ebaf1479650eb57"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_394a6392a368e40bca32694d51"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8f8c2691d839de621dc171e27e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_81b3e177d31751be3eae8765de"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_05016cb34d66ea1d0eb3775c7f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d5ca40ed63b438d98c053b9540"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe5974ee4af5427d2ca4210469"`);
        await queryRunner.query(`DROP TABLE "counters"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_31761e5f1b67f42fa0da44bc03"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fcdfd24f4c1627eb1f070d7d50"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9029c2464ed0c122197be4f60b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f682eb665c360168731f596b0e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e44ddaaa6d058cb4092f83ad61"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dfcb12a949527d4b665b0a5099"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97bb1c85e0906c9e08ddb3a1ef"`);
        await queryRunner.query(`DROP TABLE "comments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8110f55f53cbf2c875d834d5be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_917b56ef7529df2d4d2445ec96"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cdcc1f870f5ee3704b75efb6f5"`);
        await queryRunner.query(`DROP TABLE "stackedcounters"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b7c3bb25fc546bbf0a791f77b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa3e2f4ab9bf065294111feb28"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_13a496076a1e84ecef0049dc23"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4ac02c7a052bbc73576d6e9512"`);
        await queryRunner.query(`DROP TABLE "profiles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3f4a7d9e95137b36b2480ac4f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_47e710cb6aada51f4c3f795b49"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_64f4f5768d8d4effd9dc7a1ee4"`);
        await queryRunner.query(`DROP TABLE "imagefile"`);
    }

}
