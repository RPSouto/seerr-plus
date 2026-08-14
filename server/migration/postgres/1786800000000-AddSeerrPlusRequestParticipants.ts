import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeerrPlusRequestParticipants1786800000000
  implements MigrationInterface
{
  name = 'AddSeerrPlusRequestParticipants1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media_request_participant" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "requestId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "UQ_seerrplus_request_user" UNIQUE ("requestId", "userId"), CONSTRAINT "PK_seerrplus_participant" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_seerrplus_participant_request" ON "media_request_participant" ("requestId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_seerrplus_participant_user" ON "media_request_participant" ("userId")`
    );
    await queryRunner.query(
      `ALTER TABLE "media_request_participant" ADD CONSTRAINT "FK_seerrplus_participant_request" FOREIGN KEY ("requestId") REFERENCES "media_request"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "media_request_participant" ADD CONSTRAINT "FK_seerrplus_participant_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `INSERT INTO "media_request_participant" ("requestId", "userId") SELECT "id", "requestedById" FROM "media_request" WHERE "requestedById" IS NOT NULL ON CONFLICT ("requestId", "userId") DO NOTHING`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media_request_participant" DROP CONSTRAINT "FK_seerrplus_participant_user"`
    );
    await queryRunner.query(
      `ALTER TABLE "media_request_participant" DROP CONSTRAINT "FK_seerrplus_participant_request"`
    );
    await queryRunner.query(`DROP INDEX "IDX_seerrplus_participant_user"`);
    await queryRunner.query(`DROP INDEX "IDX_seerrplus_participant_request"`);
    await queryRunner.query(`DROP TABLE "media_request_participant"`);
  }
}
