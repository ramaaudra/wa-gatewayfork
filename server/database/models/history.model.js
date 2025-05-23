import { DataTypes } from "sequelize";
import { sequelize } from "../../config/Database.js";

const History = sequelize.define(
	"History",
	{
		session_name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		target: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		type: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		date: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		caption: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		user_id: {
			type: DataTypes.INTEGER,
			allowNull: true, // Or false if history must have a user
			references: {
				model: "users",
				key: "id",
			},
			onUpdate: "CASCADE",
			onDelete: "SET NULL", // Or 'CASCADE'
		},
	},
	{ tableName: "historys", timestamps: false }
);

import User from './user.model.js'; // Import User model

// Define associations
User.hasMany(History, { foreignKey: 'user_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
History.belongsTo(User, { foreignKey: 'user_id' });

export default History;
