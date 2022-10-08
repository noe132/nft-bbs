import { MigrationInterface, QueryRunner } from 'typeorm';
import { GroupStatus, GroupSeed } from '../entity';

export class groupseed1665228282566 implements MigrationInterface {
  name = 'groupseed1665228282566';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "groupseed" ("seedUrl" character varying NOT NULL, "groupId" character varying NOT NULL DEFAULT \'\', CONSTRAINT "PK_1ae12f50abae63e07c197bc761f" PRIMARY KEY ("seedUrl"))');
    const groupStatus = await queryRunner.manager.find(GroupStatus);
    for (const item of groupStatus) {
      const groupSeed = queryRunner.manager.create(GroupSeed, {
        groupId: item.groupId,
        seedUrl: item.seedUrl,
      });
      await queryRunner.manager.save(groupSeed);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "groupseed"');
  }
}
