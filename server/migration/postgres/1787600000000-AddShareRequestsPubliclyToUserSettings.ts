import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShareRequestsPubliclyToUserSettings1787600000000
  implements MigrationInterface
{
  name = 'AddShareRequestsPubliclyToUserSettings1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_settings" ADD "shareRequestsPublicly" boolean NOT NULL DEFAULT false'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_settings" DROP COLUMN "shareRequestsPublicly"'
    );
  }
}
