import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableMovieClubEmailPreference1787400000000
  implements MigrationInterface
{
  name = 'EnableMovieClubEmailPreference1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "user_settings"
      SET "notificationTypes" = jsonb_set(
        "notificationTypes"::jsonb,
        '{email}',
        to_jsonb((COALESCE(("notificationTypes"::jsonb ->> 'email')::integer, 16382) | 8192)),
        true
      )::text
      WHERE "notificationTypes" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "user_settings"
      SET "notificationTypes" = jsonb_set(
        "notificationTypes"::jsonb,
        '{email}',
        to_jsonb((COALESCE(("notificationTypes"::jsonb ->> 'email')::integer, 16382) & ~8192)),
        true
      )::text
      WHERE "notificationTypes" IS NOT NULL`);
  }
}
