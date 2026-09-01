import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemovalVoteSessionDisplayTitle1787900000000
  implements MigrationInterface
{
  name = 'AddRemovalVoteSessionDisplayTitle1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "removal_vote_session" ADD "displayTitle" character varying`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "removal_vote_session" DROP COLUMN "displayTitle"`
    );
  }
}
