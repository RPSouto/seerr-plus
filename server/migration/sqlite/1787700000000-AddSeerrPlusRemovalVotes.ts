import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeerrPlusRemovalVotes1787700000000
  implements MigrationInterface
{
  name = 'AddSeerrPlusRemovalVotes1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "removal_vote_session" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "status" integer NOT NULL DEFAULT (0), "mediaId" integer NOT NULL, "issueId" integer, "createdById" integer NOT NULL, "is4k" boolean NOT NULL DEFAULT (0), "reason" varchar, "message" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "FK_removal_vote_session_media" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE, CONSTRAINT "FK_removal_vote_session_issue" FOREIGN KEY ("issueId") REFERENCES "issue" ("id") ON DELETE SET NULL, CONSTRAINT "FK_removal_vote_session_user" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE CASCADE)`
    );
    await queryRunner.query(
      `CREATE TABLE "removal_vote" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sessionId" integer NOT NULL, "userId" integer NOT NULL, "vote" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_removal_vote_session_user" UNIQUE ("sessionId", "userId"), CONSTRAINT "FK_removal_vote_session" FOREIGN KEY ("sessionId") REFERENCES "removal_vote_session" ("id") ON DELETE CASCADE, CONSTRAINT "FK_removal_vote_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE)`
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
    await queryRunner.query(
      `CREATE INDEX "IDX_removal_vote_session" ON "removal_vote" ("sessionId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_removal_vote_user" ON "removal_vote" ("userId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "removal_vote"');
    await queryRunner.query('DROP TABLE "removal_vote_session"');
  }
}
