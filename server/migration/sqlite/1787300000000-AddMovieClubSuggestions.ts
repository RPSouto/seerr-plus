import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieClubSuggestions1787300000000
  implements MigrationInterface
{
  name = 'AddMovieClubSuggestions1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "movie_club_suggestion" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "weekKey" varchar(10) NOT NULL, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "mediaId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "UQ_movie_club_suggestion_week_media_user" UNIQUE ("weekKey", "mediaId", "userId"), CONSTRAINT "FK_movie_club_suggestion_media" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE, CONSTRAINT "FK_movie_club_suggestion_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE)`);
    await queryRunner.query(
      'CREATE INDEX "IDX_movie_club_suggestion_week" ON "movie_club_suggestion" ("weekKey")'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_movie_club_suggestion_media" ON "movie_club_suggestion" ("mediaId")'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_movie_club_suggestion_user" ON "movie_club_suggestion" ("userId")'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "movie_club_suggestion"');
  }
}
