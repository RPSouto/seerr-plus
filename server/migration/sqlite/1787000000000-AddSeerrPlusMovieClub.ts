import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeerrPlusMovieClub1787000000000 implements MigrationInterface {
  name = 'AddSeerrPlusMovieClub1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "movie_club_session" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "status" integer NOT NULL DEFAULT (0), "closesAt" datetime NOT NULL, "whatsappUrl" varchar, "selectedMediaId" integer, "createdById" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "FK_movie_club_session_media" FOREIGN KEY ("selectedMediaId") REFERENCES "media" ("id") ON DELETE SET NULL, CONSTRAINT "FK_movie_club_session_user" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE TABLE "movie_club_candidate" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sessionId" integer NOT NULL, "mediaId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_movie_club_candidate_session_media" UNIQUE ("sessionId", "mediaId"), CONSTRAINT "FK_movie_club_candidate_session" FOREIGN KEY ("sessionId") REFERENCES "movie_club_session" ("id") ON DELETE CASCADE, CONSTRAINT "FK_movie_club_candidate_media" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE TABLE "movie_club_vote" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sessionId" integer NOT NULL, "candidateId" integer NOT NULL, "userId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_movie_club_vote_session_user" UNIQUE ("sessionId", "userId"), CONSTRAINT "FK_movie_club_vote_session" FOREIGN KEY ("sessionId") REFERENCES "movie_club_session" ("id") ON DELETE CASCADE, CONSTRAINT "FK_movie_club_vote_candidate" FOREIGN KEY ("candidateId") REFERENCES "movie_club_candidate" ("id") ON DELETE CASCADE, CONSTRAINT "FK_movie_club_vote_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX "IDX_movie_club_candidate_session" ON "movie_club_candidate" ("sessionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_movie_club_vote_session" ON "movie_club_vote" ("sessionId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "movie_club_vote"');
    await queryRunner.query('DROP TABLE "movie_club_candidate"');
    await queryRunner.query('DROP TABLE "movie_club_session"');
  }
}
