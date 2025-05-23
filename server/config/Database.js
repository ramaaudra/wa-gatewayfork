import { Sequelize } from "sequelize";
import mysql from "mysql2";
import { modules } from "../../lib/index.js";
import { moment } from "./index.js";
import User from "../database/models/user.model.js";
import Session from "../database/models/session.model.js";
import MediaModel from "../database/models/media.model.js";
import AutoReplyModel from "../database/models/autoReply.model.js";
import History from "../database/models/history.model.js";
import ButtonResponseModel from "../database/models/buttonRespon.model.js";
import ListResponseModel from "../database/models/listRespon.model.js";

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DIALECT } = process.env;

let connection = mysql.createPool({ waitForConnections: true, connectTimeout: 30000, host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD });
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
	host: DB_HOST,
	port: DB_PORT,
	dialect: DB_DIALECT,
	logging: false,
});

async function connectDatabase() {
	connection.query(`use \`${DB_NAME}\`;`, (err) => {
		if (err) {
			console.log(modules.color("[APP]", "#EB6112"), modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"), modules.color(`Create new Database Success!`, "#82E0AA"));
			connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
		}
	});
	await modules.sleep(2000);
	await sequelize
		.authenticate()
		.then(() => {
			console.log(modules.color("[APP]", "#EB6112"), modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"), modules.color(`Connection Database has been established Successfully`, "#82E0AA"));
		})
		.catch((error) => {
			console.error(error);
		});

	// Sync all models. Using alter:true can be risky in production.
	// It's generally better to handle migrations with a dedicated library.
	// For development, this can help apply schema changes.
	const syncOptions = { alter: true }; // Use alter:true to attempt to add new columns

	await sequelize.sync(syncOptions).then(() => {
		console.log(modules.color("[APP]", "#EB6112"), modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"), modules.color(`Re-Sync All Tables (with alter:true)`, "#82E0AA"));
	});
	// Individual sync calls are not strictly necessary if sequelize.sync() is called without models,
	// as it syncs all defined models. However, if specific logging per model is desired,
	// or if some models need different sync options, they can be done individually.
	// For this task, a general sequelize.sync({ alter: true }) is sufficient.
}

const db = {};
db.User = User;
db.Session = Session;
db.MediaModel = MediaModel;
db.AutoReplyModel = AutoReplyModel;
db.History = History;
db.ButtonResponseModel = ButtonResponseModel;
db.ListResponseModel = ListResponseModel;

export { connectDatabase, sequelize, connection, db };
