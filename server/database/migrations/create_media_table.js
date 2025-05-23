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

async function createMediaTable() {
  try {
    console.log(
      modules.color("[MIGRATION]", "#EB6112"),
      modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"),
      modules.color("Starting migration to create media table", "#82E0AA")
    );

    // Check if table already exists
    const tableExists = await sequelize.query("SHOW TABLES LIKE 'medias'", {
      type: QueryTypes.SELECT,
    });

    if (tableExists.length === 0) {
      // Create media table
      await sequelize.query(
        `
        CREATE TABLE \`medias\` (
          \`id\` INTEGER NOT NULL auto_increment , 
          \`name\` VARCHAR(255) NOT NULL, 
          \`file_name\` VARCHAR(255) NOT NULL, 
          \`file_path\` VARCHAR(255) NOT NULL, 
          \`mime_type\` VARCHAR(255) NOT NULL, 
          \`size\` INTEGER NOT NULL, 
          \`description\` TEXT, 
          \`upload_date\` VARCHAR(255) NOT NULL, 
          \`createdAt\` DATETIME NOT NULL, 
          \`updatedAt\` DATETIME NOT NULL, 
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB;
      `,
        { type: QueryTypes.RAW }
      );

      console.log(
        modules.color("[MIGRATION]", "#EB6112"),
        modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"),
        modules.color("Created media table", "#82E0AA")
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
        modules.color("Table already exists, no migration needed", "#82E0AA")
      );
    }

    process.exit(0);
  } catch (error) {
    console.error(modules.color("[MIGRATION ERROR]", "#E74C3C"), error);
    process.exit(1);
  }
}

// Run the migration
createMediaTable();
