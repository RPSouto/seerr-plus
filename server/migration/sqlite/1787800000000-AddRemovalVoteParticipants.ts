import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemovalVoteParticipants1787800000000
  implements MigrationInterface
{
  name = 'AddRemovalVoteParticipants1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "removal_vote_participant" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sessionId" integer NOT NULL, "userId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_removal_vote_participant_session_user" UNIQUE ("sessionId", "userId"), CONSTRAINT "FK_removal_vote_participant_session" FOREIGN KEY ("sessionId") REFERENCES "removal_vote_session" ("id") ON DELETE CASCADE, CONSTRAINT "FK_removal_vote_participant_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE)`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_removal_vote_participant_session" ON "removal_vote_participant" ("sessionId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_removal_vote_participant_user" ON "removal_vote_participant" ("userId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "removal_vote_participant"');
  }
}
