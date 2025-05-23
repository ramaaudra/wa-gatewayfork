// filepath: /Users/mbam1/Local Document/Project/whatsapp-gateway/server/database/models/media.model.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../config/Database.js";

const MediaModel = sequelize.define(
  "Media",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    upload_date: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Or false if media must have a user
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // Or 'CASCADE'
    },
  },
  { tableName: "medias", timestamps: true }
);

import User from './user.model.js'; // Import User model

// Define associations
User.hasMany(MediaModel, { foreignKey: 'user_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
MediaModel.belongsTo(User, { foreignKey: 'user_id' });

export default MediaModel;
