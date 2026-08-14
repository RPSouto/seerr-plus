import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieClubScheduling1787200000000
  implements MigrationInterface
{
  name = 'AddMovieClubScheduling1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "movie_club_session" ADD "startsAt" datetime'
    );
    await queryRunner.query(
      'ALTER TABLE "movie_club_session" ADD "startNotificationSentAt" datetime'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "movie_club_session" DROP COLUMN "startNotificationSentAt"'
    );
    await queryRunner.query(
      'ALTER TABLE "movie_club_session" DROP COLUMN "startsAt"'
    );
  }
}
