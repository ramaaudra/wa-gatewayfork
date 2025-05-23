import { Sequelize, QueryTypes } from "sequelize";
import { modules } from "../../../lib/index.js";
import { moment } from "../../config/index.js";

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DIALECT } =
  process.env;

// Create a direct connection to the database for this migration
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: false,
});

async function addMediaColumns() {
  try {
    console.log(
      modules.color("[MIGRATION]", "#EB6112"),
      modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"),
      modules.color("Starting migration to add media columns", "#82E0AA")
    );

    // Check if columns already exist
    const tableInfo = await sequelize.query(
      "SHOW COLUMNS FROM `autoreplys` LIKE 'media_type'",
      { type: QueryTypes.SELECT }
    );

    if (tableInfo.length === 0) {
      // Add media_type column
      await sequelize.query(
        "ALTER TABLE `autoreplys` ADD COLUMN `media_type` VARCHAR(255) NULL AFTER `response`",
        { type: QueryTypes.RAW }
      );
      console.log(
        modules.color("[MIGRATION]", "#EB6112"),
        modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"),
        modules.color("Added media_type column", "#82E0AA")
      );

      // Add media_url column
      await sequelize.query(
        "ALTER TABLE `autoreplys` ADD COLUMN `media_url` VARCHAR(255) NULL AFTER `media_type`",
        { type: QueryTypes.RAW }
      );
      console.log(
        modules.color("[MIGRATION]", "#EB6112"),
        modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"),
        modules.color("Added media_url column", "#82E0AA")
      );

      console.log(
        modules.color("[MIGRATION]", "#EB6112"),
        modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"),
        modules.color("Migration completed successfully", "#82E0AA")
      );
    } else {
      console.log(
        modules.color("[MIGRATION]", "#EB6112"),
        modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"),
        modules.color("Columns already exist, no migration needed", "#82E0AA")
      );
    }

    process.exit(0);
  } catch (error) {
    console.error(modules.color("[MIGRATION ERROR]", "#E74C3C"), error);
    process.exit(1);
  }
}

// Run the migration
addMediaColumns();
