import { DataTypes } from "sequelize";
import { sequelize } from "../../config/Database.js";

const AutoReplyModel = sequelize.define(
  "AutoReply",
  {
    session_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    session_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    keyword: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    response: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    media_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    media_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Or false if an auto-reply must have a user
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // Or 'CASCADE'
    },
  },
  { tableName: "autoreplys", timestamps: true }
);

import User from './user.model.js'; // Import User model

// Define associations
User.hasMany(AutoReplyModel, { foreignKey: 'user_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
AutoReplyModel.belongsTo(User, { foreignKey: 'user_id' });

export default AutoReplyModel;
