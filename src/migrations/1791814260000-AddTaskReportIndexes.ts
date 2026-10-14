import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskReportIndexes1791814260000 implements MigrationInterface {
  name = 'AddTaskReportIndexes1791814260000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_project_id_status"
      ON "tasks" ("project_id", "status")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_assignee_created_at"
      ON "tasks" ("assignee_id", "created_at" DESC)
      WHERE "deleted_at" IS NULL AND "assignee_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_open_project_created_at"
      ON "tasks" ("project_id", "created_at")
      WHERE "deleted_at" IS NULL AND "status" <> 'done'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_tasks_open_project_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_assignee_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_project_id_status"`);
  }
}
