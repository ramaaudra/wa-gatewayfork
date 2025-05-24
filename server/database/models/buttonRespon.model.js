import { DataTypes } from "sequelize";

export default function initButtonResponseModel(sequelize, User) {
  const ButtonResponseModel = sequelize.define(
    "ButtonResponse",
    {
      session_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      target_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      msg_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      keyword: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      response: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Or false if a button response must have a user
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL", // Or 'CASCADE'
      },
    },
    { tableName: "buttonresponses", timestamps: true }
  );

  // Define associations if User is provided
  if (User) {
    User.hasMany(ButtonResponseModel, {
      foreignKey: "user_id",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    ButtonResponseModel.belongsTo(User, { foreignKey: "user_id" });
  }

  return ButtonResponseModel;
}
