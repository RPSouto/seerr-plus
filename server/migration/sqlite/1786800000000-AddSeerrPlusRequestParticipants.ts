import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeerrPlusRequestParticipants1786800000000
  implements MigrationInterface
{
  name = 'AddSeerrPlusRequestParticipants1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media_request_participant" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "requestId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "UQ_seerrplus_request_user" UNIQUE ("requestId", "userId"), CONSTRAINT "FK_seerrplus_participant_request" FOREIGN KEY ("requestId") REFERENCES "media_request" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_seerrplus_participant_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_seerrplus_participant_request" ON "media_request_participant" ("requestId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_seerrplus_participant_user" ON "media_request_participant" ("userId")`
    );
    await queryRunner.query(
      `INSERT OR IGNORE INTO "media_request_participant" ("requestId", "userId") SELECT "id", "requestedById" FROM "media_request" WHERE "requestedById" IS NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_seerrplus_participant_user"`);
    await queryRunner.query(`DROP INDEX "IDX_seerrplus_participant_request"`);
    await queryRunner.query(`DROP TABLE "media_request_participant"`);
  }
}
