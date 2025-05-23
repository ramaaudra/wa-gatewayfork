import { DataTypes } from "sequelize";
import { sequelize } from "../../config/Database.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

// Associations will be defined in the respective model files
// where the foreign key 'user_id' is present,
// e.g., in session.model.js:
// import User from './user.model.js';
// Session.belongsTo(User, { foreignKey: 'user_id' });
// User.hasMany(Session, { foreignKey: 'user_id' });


export default User;
