import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieClubSessionTitle1787500000000
  implements MigrationInterface
{
  name = 'AddMovieClubSessionTitle1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "movie_club_session" ADD "title" varchar'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "movie_club_session" DROP COLUMN "title"'
    );
  }
}
