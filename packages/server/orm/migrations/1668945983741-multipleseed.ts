import { utils } from 'quorum-light-node-sdk-nodejs';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class multipleseed1668945983741 implements MigrationInterface {
  name = 'multipleseed1668945983741';

  public async up(queryRunner: QueryRunner): Promise<void> {
    interface OldGroupStatus {
      groupId: string
      startTrx: string
      seedUrl: string
    }
    const items: Array<OldGroupStatus> = await queryRunner.query('SELECT * FROM "groupstatus"');
    const newItems = items.map((v: any) => {
      const group = utils.restoreSeedFromUrl(v.seedUrl);
      return {
        shortName: group.group_id,
        mainSeedUrl: v.seedUrl,
        commentSeedUrl: v.seedUrl,
        counterSeedUrl: v.seedUrl,
        profileSeedUrl: v.seedUrl,
        mainStartTrx: '',
        commentStartTrx: '',
        counterStartTrx: '',
        profileStartTrx: '',
      };
    });
    // await queryRunner.query('DROP TABLE "groupseed"');
    await queryRunner.query('TRUNCATE "comments"');
    await queryRunner.query('TRUNCATE "counters"');
    await queryRunner.query('TRUNCATE "groupinfo"');
    await queryRunner.query('TRUNCATE "groupstatus"');
    await queryRunner.query('TRUNCATE "imagefile"');
    await queryRunner.query('TRUNCATE "nftrequests"');
    await queryRunner.query('TRUNCATE "notifications"');
    await queryRunner.query('TRUNCATE "posts"');
    await queryRunner.query('TRUNCATE "profiles"');
    await queryRunner.query('TRUNCATE "stackedcounters"');
    await queryRunner.query('TRUNCATE "trxset"');

    await queryRunner.query('CREATE TABLE "pendingcontent" ("id" SERIAL NOT NULL, "groupId" integer NOT NULL, "content" character varying NOT NULL, CONSTRAINT "PK_8bf298befd8439498da38c82ead" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE INDEX "IDX_4f5b87261f8cb65e060e695a3b" ON "pendingcontent" ("groupId") ');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP CONSTRAINT "PK_3f571bf581aab90549859c86829"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "startTrx"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "seedUrl"');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "id" SERIAL NOT NULL');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD CONSTRAINT "PK_cf90ac9d0c87b7bf6c7071fae69" PRIMARY KEY ("id")');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "shortName" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "mainSeedUrl" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "commentSeedUrl" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "counterSeedUrl" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "profileSeedUrl" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "mainStartTrx" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "commentStartTrx" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "counterStartTrx" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "profileStartTrx" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "loaded" boolean NOT NULL DEFAULT true');
    await queryRunner.query('ALTER TABLE "trxset" ADD "groupId" integer NOT NULL');
    await queryRunner.query('ALTER TABLE "trxset" DROP CONSTRAINT "PK_d9989dbbf8758ef5971ae0a5adf"');
    await queryRunner.query('ALTER TABLE "trxset" ADD CONSTRAINT "PK_84aae4f58cbc82198d406699f6a" PRIMARY KEY ("trxId", "groupId")');
    await queryRunner.query('DROP INDEX "public"."IDX_d5ca40ed63b438d98c053b9540"');
    await queryRunner.query('ALTER TABLE "counters" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "counters" ADD "groupId" integer NOT NULL');
    await queryRunner.query('DROP INDEX "public"."IDX_e3f4a7d9e95137b36b2480ac4f"');
    await queryRunner.query('ALTER TABLE "imagefile" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "imagefile" ADD "groupId" integer NOT NULL');
    await queryRunner.query('DROP INDEX "public"."IDX_13a496076a1e84ecef0049dc23"');
    await queryRunner.query('ALTER TABLE "profiles" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "profiles" ADD "groupId" integer NOT NULL');
    await queryRunner.query('ALTER TABLE "stackedcounters" DROP CONSTRAINT "PK_c996fdc33327fc66a44f2a5bff6"');
    await queryRunner.query('ALTER TABLE "stackedcounters" ADD CONSTRAINT "PK_c05717c02372035a946bf55f3ff" PRIMARY KEY ("objectId")');
    await queryRunner.query('ALTER TABLE "stackedcounters" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "stackedcounters" ADD "groupId" integer NOT NULL');
    await queryRunner.query('ALTER TABLE "stackedcounters" DROP CONSTRAINT "PK_c05717c02372035a946bf55f3ff"');
    await queryRunner.query('ALTER TABLE "stackedcounters" ADD CONSTRAINT "PK_c996fdc33327fc66a44f2a5bff6" PRIMARY KEY ("objectId", "groupId")');
    await queryRunner.query('DROP INDEX "public"."IDX_dfcb12a949527d4b665b0a5099"');
    await queryRunner.query('ALTER TABLE "comments" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "comments" ADD "groupId" integer NOT NULL');
    await queryRunner.query('DROP INDEX "public"."IDX_0988cd97f7fbc7dd57c086c39f"');
    await queryRunner.query('ALTER TABLE "nftrequests" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "nftrequests" ADD "groupId" integer NOT NULL');
    await queryRunner.query('DROP INDEX "public"."IDX_27c75a307d3baeee6749f8e45d"');
    await queryRunner.query('ALTER TABLE "groupinfo" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "groupinfo" ADD "groupId" integer NOT NULL');
    await queryRunner.query('DROP INDEX "public"."IDX_d10acbe503da4c56853181efc9"');
    await queryRunner.query('ALTER TABLE "posts" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "posts" ADD "groupId" integer NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "notifications" ADD "groupId" integer NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_d5ca40ed63b438d98c053b9540" ON "counters" ("groupId") ');
    await queryRunner.query('CREATE INDEX "IDX_e3f4a7d9e95137b36b2480ac4f" ON "imagefile" ("groupId") ');
    await queryRunner.query('CREATE INDEX "IDX_13a496076a1e84ecef0049dc23" ON "profiles" ("groupId") ');
    await queryRunner.query('CREATE INDEX "IDX_dfcb12a949527d4b665b0a5099" ON "comments" ("groupId") ');
    await queryRunner.query('CREATE INDEX "IDX_0988cd97f7fbc7dd57c086c39f" ON "nftrequests" ("groupId") ');
    await queryRunner.query('CREATE INDEX "IDX_27c75a307d3baeee6749f8e45d" ON "groupinfo" ("groupId") ');
    await queryRunner.query('CREATE INDEX "IDX_d10acbe503da4c56853181efc9" ON "posts" ("groupId") ');

    await queryRunner.query(
      `
      INSERT INTO "groupstatus"("shortName", "mainSeedUrl", "commentSeedUrl", "counterSeedUrl", "profileSeedUrl", "mainStartTrx", "commentStartTrx", "counterStartTrx", "profileStartTrx", "loaded")
      SELECT * FROM UNNEST ($1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::varchar[], $6::varchar[], $7::varchar[], $8::varchar[], $9::varchar[], $10::bool[]) AS t(a,b,c,d,e,f,g,h,i,j)
      `,
      [
        newItems.map((v) => v.shortName),
        newItems.map((v) => v.mainSeedUrl),
        newItems.map((v) => v.commentSeedUrl),
        newItems.map((v) => v.counterSeedUrl),
        newItems.map((v) => v.profileSeedUrl),
        newItems.map((v) => v.mainStartTrx),
        newItems.map((v) => v.commentStartTrx),
        newItems.map((v) => v.counterStartTrx),
        newItems.map((v) => v.profileStartTrx),
        newItems.map(() => false),
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_d10acbe503da4c56853181efc9"');
    await queryRunner.query('DROP INDEX "public"."IDX_27c75a307d3baeee6749f8e45d"');
    await queryRunner.query('DROP INDEX "public"."IDX_0988cd97f7fbc7dd57c086c39f"');
    await queryRunner.query('DROP INDEX "public"."IDX_dfcb12a949527d4b665b0a5099"');
    await queryRunner.query('DROP INDEX "public"."IDX_13a496076a1e84ecef0049dc23"');
    await queryRunner.query('DROP INDEX "public"."IDX_e3f4a7d9e95137b36b2480ac4f"');
    await queryRunner.query('DROP INDEX "public"."IDX_d5ca40ed63b438d98c053b9540"');
    await queryRunner.query('ALTER TABLE "notifications" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "notifications" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "posts" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "posts" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_d10acbe503da4c56853181efc9" ON "posts" ("groupId") ');
    await queryRunner.query('ALTER TABLE "groupinfo" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "groupinfo" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_27c75a307d3baeee6749f8e45d" ON "groupinfo" ("groupId") ');
    await queryRunner.query('ALTER TABLE "nftrequests" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "nftrequests" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_0988cd97f7fbc7dd57c086c39f" ON "nftrequests" ("groupId") ');
    await queryRunner.query('ALTER TABLE "comments" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "comments" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_dfcb12a949527d4b665b0a5099" ON "comments" ("groupId") ');
    await queryRunner.query('ALTER TABLE "stackedcounters" DROP CONSTRAINT "PK_c996fdc33327fc66a44f2a5bff6"');
    await queryRunner.query('ALTER TABLE "stackedcounters" ADD CONSTRAINT "PK_c05717c02372035a946bf55f3ff" PRIMARY KEY ("objectId")');
    await queryRunner.query('ALTER TABLE "stackedcounters" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "stackedcounters" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "stackedcounters" DROP CONSTRAINT "PK_c05717c02372035a946bf55f3ff"');
    await queryRunner.query('ALTER TABLE "stackedcounters" ADD CONSTRAINT "PK_c996fdc33327fc66a44f2a5bff6" PRIMARY KEY ("groupId", "objectId")');
    await queryRunner.query('ALTER TABLE "profiles" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "profiles" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_13a496076a1e84ecef0049dc23" ON "profiles" ("groupId") ');
    await queryRunner.query('ALTER TABLE "imagefile" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "imagefile" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_e3f4a7d9e95137b36b2480ac4f" ON "imagefile" ("groupId") ');
    await queryRunner.query('ALTER TABLE "counters" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "counters" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_d5ca40ed63b438d98c053b9540" ON "counters" ("groupId") ');
    await queryRunner.query('ALTER TABLE "trxset" DROP CONSTRAINT "PK_84aae4f58cbc82198d406699f6a"');
    await queryRunner.query('ALTER TABLE "trxset" ADD CONSTRAINT "PK_d9989dbbf8758ef5971ae0a5adf" PRIMARY KEY ("trxId")');
    await queryRunner.query('ALTER TABLE "trxset" DROP COLUMN "groupId"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "profileStartTrx"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "counterStartTrx"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "commentStartTrx"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "mainStartTrx"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "profileSeedUrl"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "counterSeedUrl"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "commentSeedUrl"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "mainSeedUrl"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "shortName"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "loaded"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP CONSTRAINT "PK_cf90ac9d0c87b7bf6c7071fae69"');
    await queryRunner.query('ALTER TABLE "groupstatus" DROP COLUMN "id"');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "seedUrl" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "startTrx" character varying NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD "groupId" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "groupstatus" ADD CONSTRAINT "PK_3f571bf581aab90549859c86829" PRIMARY KEY ("groupId")');
    await queryRunner.query('DROP INDEX "public"."IDX_4f5b87261f8cb65e060e695a3b"');
    await queryRunner.query('DROP TABLE "pendingcontent"');
  }
}
