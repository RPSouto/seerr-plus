import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeerrPlusRemovalRequests1786900000000
  implements MigrationInterface
{
  name = 'AddSeerrPlusRemovalRequests1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "issue" ADD "removalReason" character varying');
    await queryRunner.query(
      'ALTER TABLE "issue" ADD "removalIs4k" boolean NOT NULL DEFAULT false'
    );
    await queryRunner.query('ALTER TABLE "issue" ADD "removalDecision" integer');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "issue" DROP COLUMN "removalDecision"');
    await queryRunner.query('ALTER TABLE "issue" DROP COLUMN "removalIs4k"');
    await queryRunner.query('ALTER TABLE "issue" DROP COLUMN "removalReason"');
  }
}
