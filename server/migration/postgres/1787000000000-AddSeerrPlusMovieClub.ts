import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeerrPlusMovieClub1787000000000 implements MigrationInterface {
  name = 'AddSeerrPlusMovieClub1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "movie_club_session" ("id" SERIAL NOT NULL, "status" integer NOT NULL DEFAULT 0, "closesAt" TIMESTAMP NOT NULL, "whatsappUrl" character varying, "selectedMediaId" integer, "createdById" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_movie_club_session" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "movie_club_candidate" ("id" SERIAL NOT NULL, "sessionId" integer NOT NULL, "mediaId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_movie_club_candidate_session_media" UNIQUE ("sessionId", "mediaId"), CONSTRAINT "PK_movie_club_candidate" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "movie_club_vote" ("id" SERIAL NOT NULL, "sessionId" integer NOT NULL, "candidateId" integer NOT NULL, "userId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_movie_club_vote_session_user" UNIQUE ("sessionId", "userId"), CONSTRAINT "PK_movie_club_vote" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "movie_club_session" ADD CONSTRAINT "FK_movie_club_session_media" FOREIGN KEY ("selectedMediaId") REFERENCES "media"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "movie_club_session" ADD CONSTRAINT "FK_movie_club_session_user" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "movie_club_candidate" ADD CONSTRAINT "FK_movie_club_candidate_session" FOREIGN KEY ("sessionId") REFERENCES "movie_club_session"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "movie_club_candidate" ADD CONSTRAINT "FK_movie_club_candidate_media" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "movie_club_vote" ADD CONSTRAINT "FK_movie_club_vote_session" FOREIGN KEY ("sessionId") REFERENCES "movie_club_session"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "movie_club_vote" ADD CONSTRAINT "FK_movie_club_vote_candidate" FOREIGN KEY ("candidateId") REFERENCES "movie_club_candidate"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "movie_club_vote" ADD CONSTRAINT "FK_movie_club_vote_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`);
    await queryRunner.query(`CREATE INDEX "IDX_movie_club_candidate_session" ON "movie_club_candidate" ("sessionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_movie_club_vote_session" ON "movie_club_vote" ("sessionId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "movie_club_vote"');
    await queryRunner.query('DROP TABLE "movie_club_candidate"');
    await queryRunner.query('DROP TABLE "movie_club_session"');
  }
}
