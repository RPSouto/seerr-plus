import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieClubCurators1787100000000 implements MigrationInterface {
  name = 'AddMovieClubCurators1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "movie_club_curator" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sessionId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "UQ_movie_club_curator_session_user" UNIQUE ("sessionId", "userId"), CONSTRAINT "FK_movie_club_curator_session" FOREIGN KEY ("sessionId") REFERENCES "movie_club_session" ("id") ON DELETE CASCADE, CONSTRAINT "FK_movie_club_curator_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "movie_club_curator"');
  }
}
