import { DataTypes } from "sequelize";
import { sequelize } from "../../config/Database.js";
import History from "./history.model.js";

const Session = sequelize.define(
	"Session",
	{
		session_name: {
			type: DataTypes.STRING,
			unique: true,
			primaryKey: true,
			allowNull: false,
		},
		session_number: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		status: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		user_id: {
			type: DataTypes.INTEGER,
			allowNull: true, // Or false if a session must have a user
			references: {
				model: "users", // Name of the target table
				key: "id",
			},
			onUpdate: "CASCADE",
			onDelete: "SET NULL", // Or 'CASCADE'
		},
	},
	{ tableName: "sessions", timestamps: true }
);

Session.removeAttribute("id");

Session.hasMany(History, { foreignKey: "session_name" });
History.belongsTo(Session, { foreignKey: "session_name" });

import User from './user.model.js'; // Import User model

// Define associations
User.hasMany(Session, { foreignKey: 'user_id' });
Session.belongsTo(User, { foreignKey: 'user_id' });

export default Session;
