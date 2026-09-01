import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieClubSelectedAt1788000000000
  implements MigrationInterface
{
  name = 'AddMovieClubSelectedAt1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "movie_club_session" ADD "selectedAt" datetime'
    );
    await queryRunner.query(
      'UPDATE "movie_club_session" SET "selectedAt" = "createdAt" WHERE "selectedMediaId" IS NOT NULL AND "selectedAt" IS NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "movie_club_session" DROP COLUMN "selectedAt"'
    );
  }
}
