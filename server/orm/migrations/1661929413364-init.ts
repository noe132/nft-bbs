import { MigrationInterface, QueryRunner } from "typeorm";

export class init1661929413364 implements MigrationInterface {
    name = 'init1661929413364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "profiles" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "userAddress" character varying NOT NULL, "name" character varying NOT NULL DEFAULT '', "avatar" character varying NOT NULL DEFAULT '', "intro" character varying NOT NULL DEFAULT '', CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4ac02c7a052bbc73576d6e9512" ON "profiles" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_13a496076a1e84ecef0049dc23" ON "profiles" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_aa3e2f4ab9bf065294111feb28" ON "profiles" ("userAddress") `);
        await queryRunner.query(`CREATE TABLE "uniquecounters" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "name" character varying NOT NULL, "objectId" character varying NOT NULL, "userAddress" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_055230a069d78111e1c1dd6d20d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6b69a50ecde84de1f8613f110b" ON "uniquecounters" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_40c6ecae44d45bc1e8253843ff" ON "uniquecounters" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_51e28b6fa71e03866cb87ed4e7" ON "uniquecounters" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_7e9b14e8cd783a39c201568c62" ON "uniquecounters" ("objectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7ce07952f2b5839fa0f956d26b" ON "uniquecounters" ("userAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_e2824e8f40a12b62e95055fbd7" ON "uniquecounters" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "comments" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "content" character varying NOT NULL, "objectId" character varying NOT NULL, "threadId" character varying NOT NULL, "replyId" character varying NOT NULL, "userAddress" character varying NOT NULL, "storage" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "commentCount" integer NOT NULL, "likeCount" integer NOT NULL, "dislikeCount" integer NOT NULL, "hotCount" integer NOT NULL, CONSTRAINT "PK_707445bd2c93e7827f4e4b2e3d8" PRIMARY KEY ("id", "trxId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97bb1c85e0906c9e08ddb3a1ef" ON "comments" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dfcb12a949527d4b665b0a5099" ON "comments" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b8a8f8ccd9ff439d7069554bbd" ON "comments" ("objectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f682eb665c360168731f596b0e" ON "comments" ("threadId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9029c2464ed0c122197be4f60b" ON "comments" ("replyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fcdfd24f4c1627eb1f070d7d50" ON "comments" ("userAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_31761e5f1b67f42fa0da44bc03" ON "comments" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "posts" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "title" character varying NOT NULL, "content" character varying NOT NULL, "userAddress" character varying NOT NULL, "storage" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "commentCount" integer NOT NULL, "likeCount" integer NOT NULL, "dislikeCount" integer NOT NULL, "hotCount" integer NOT NULL, CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`);
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
        await queryRunner.query(`CREATE TABLE "groupinfo" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "avatar" character varying NOT NULL, "desc" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_f6d7728a87a072655ca4ca06766" PRIMARY KEY ("id", "trxId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1dbbb645715c05ce0a13199974" ON "groupinfo" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_27c75a307d3baeee6749f8e45d" ON "groupinfo" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_40f5c0a66ffe4f0115898475e4" ON "groupinfo" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "image" ("id" SERIAL NOT NULL, "trxId" character varying NOT NULL, "groupId" character varying NOT NULL, "mineType" character varying NOT NULL, "content" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_d6db1ab4ee9ad9dbe86c64e4cc3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e602759164f0789747def62283" ON "image" ("trxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e4b9d14ea1e4c5115ea7ec79bb" ON "image" ("groupId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e4b9d14ea1e4c5115ea7ec79bb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e602759164f0789747def62283"`);
        await queryRunner.query(`DROP TABLE "image"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40f5c0a66ffe4f0115898475e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_27c75a307d3baeee6749f8e45d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1dbbb645715c05ce0a13199974"`);
        await queryRunner.query(`DROP TABLE "groupinfo"`);
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
        await queryRunner.query(`DROP INDEX "public"."IDX_31761e5f1b67f42fa0da44bc03"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fcdfd24f4c1627eb1f070d7d50"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9029c2464ed0c122197be4f60b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f682eb665c360168731f596b0e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b8a8f8ccd9ff439d7069554bbd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dfcb12a949527d4b665b0a5099"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97bb1c85e0906c9e08ddb3a1ef"`);
        await queryRunner.query(`DROP TABLE "comments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e2824e8f40a12b62e95055fbd7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ce07952f2b5839fa0f956d26b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e9b14e8cd783a39c201568c62"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_51e28b6fa71e03866cb87ed4e7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40c6ecae44d45bc1e8253843ff"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b69a50ecde84de1f8613f110b"`);
        await queryRunner.query(`DROP TABLE "uniquecounters"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa3e2f4ab9bf065294111feb28"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_13a496076a1e84ecef0049dc23"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4ac02c7a052bbc73576d6e9512"`);
        await queryRunner.query(`DROP TABLE "profiles"`);
    }

}
