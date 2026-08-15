import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableMovieClubEmailPreference1787400000000
  implements MigrationInterface
{
  name = 'EnableMovieClubEmailPreference1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "user_settings"
      SET "notificationTypes" = json_set(
        "notificationTypes",
        '$.email',
        (COALESCE(CAST(json_extract("notificationTypes", '$.email') AS INTEGER), 16382) | 8192)
      )
      WHERE "notificationTypes" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "user_settings"
      SET "notificationTypes" = json_set(
        "notificationTypes",
        '$.email',
        (COALESCE(CAST(json_extract("notificationTypes", '$.email') AS INTEGER), 16382) & ~8192)
      )
      WHERE "notificationTypes" IS NOT NULL`);
  }
}
