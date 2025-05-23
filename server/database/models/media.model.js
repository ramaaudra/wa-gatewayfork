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
  },
  { tableName: "medias", timestamps: true }
);

export default MediaModel;
