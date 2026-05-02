import { sequelize } from "../src/db/sequelize.js";
import * as createCases from "../migrations/001-create-cases.js";

async function ensureMigrationTable(queryInterface) {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
      "name" VARCHAR(255) NOT NULL PRIMARY KEY
    );
  `);
}

async function hasMigration(queryInterface, name) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT "name" FROM "SequelizeMeta" WHERE "name" = :name',
    { replacements: { name } }
  );
  return rows.length > 0;
}

async function recordMigration(queryInterface, name) {
  await queryInterface.sequelize.query(
    'INSERT INTO "SequelizeMeta" ("name") VALUES (:name) ON CONFLICT DO NOTHING',
    { replacements: { name } }
  );
}

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  const migrationName = "001-create-cases.js";

  await sequelize.authenticate();
  await ensureMigrationTable(queryInterface);

  if (!(await hasMigration(queryInterface, migrationName))) {
    await createCases.up(queryInterface);
    await recordMigration(queryInterface, migrationName);
    console.log(`Applied migration ${migrationName}`);
  } else {
    console.log("Database is already up to date");
  }

  await sequelize.close();
}

migrate().catch(async (error) => {
  console.error(error);
  await sequelize.close();
  process.exit(1);
});
