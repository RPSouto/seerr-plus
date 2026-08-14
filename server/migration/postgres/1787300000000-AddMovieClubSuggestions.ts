import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieClubSuggestions1787300000000
  implements MigrationInterface
{
  name = 'AddMovieClubSuggestions1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "movie_club_suggestion" ("id" SERIAL NOT NULL, "weekKey" character varying(10) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "mediaId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "UQ_movie_club_suggestion_week_media_user" UNIQUE ("weekKey", "mediaId", "userId"), CONSTRAINT "PK_movie_club_suggestion" PRIMARY KEY ("id"))`);
    await queryRunner.query(
      'CREATE INDEX "IDX_movie_club_suggestion_week" ON "movie_club_suggestion" ("weekKey")'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_movie_club_suggestion_media" ON "movie_club_suggestion" ("mediaId")'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_movie_club_suggestion_user" ON "movie_club_suggestion" ("userId")'
    );
    await queryRunner.query('ALTER TABLE "movie_club_suggestion" ADD CONSTRAINT "FK_movie_club_suggestion_media" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "movie_club_suggestion" ADD CONSTRAINT "FK_movie_club_suggestion_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "movie_club_suggestion"');
  }
}
