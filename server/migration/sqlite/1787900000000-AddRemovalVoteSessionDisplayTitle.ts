import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemovalVoteSessionDisplayTitle1787900000000
  implements MigrationInterface
{
  name = 'AddRemovalVoteSessionDisplayTitle1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "removal_vote_session" ADD COLUMN "displayTitle" varchar`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_removal_vote_session" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "status" integer NOT NULL DEFAULT (0), "mediaId" integer NOT NULL, "issueId" integer, "createdById" integer NOT NULL, "is4k" boolean NOT NULL DEFAULT (0), "reason" varchar, "message" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "FK_removal_vote_session_media" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE, CONSTRAINT "FK_removal_vote_session_issue" FOREIGN KEY ("issueId") REFERENCES "issue" ("id") ON DELETE SET NULL, CONSTRAINT "FK_removal_vote_session_user" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE CASCADE)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_removal_vote_session"("id", "status", "mediaId", "issueId", "createdById", "is4k", "reason", "message", "createdAt") SELECT "id", "status", "mediaId", "issueId", "createdById", "is4k", "reason", "message", "createdAt" FROM "removal_vote_session"`
    );
    await queryRunner.query(`DROP TABLE "removal_vote_session"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_removal_vote_session" RENAME TO "removal_vote_session"`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_removal_vote_session_media" ON "removal_vote_session" ("mediaId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_removal_vote_session_issue" ON "removal_vote_session" ("issueId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_removal_vote_session_user" ON "removal_vote_session" ("createdById")`
    );
  }
}
