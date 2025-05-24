import { DataTypes } from "sequelize";

export default function initSessionModel(sequelize, User, History) {
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

  // Setup associations if History and User are provided
  if (History) {
    Session.hasMany(History, { foreignKey: "session_name" });
    History.belongsTo(Session, { foreignKey: "session_name" });
  }

  if (User) {
    User.hasMany(Session, { foreignKey: "user_id" });
    Session.belongsTo(User, { foreignKey: "user_id" });
  }

  return Session;
}
