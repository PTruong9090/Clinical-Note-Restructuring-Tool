import { Sequelize } from "sequelize";
import { env } from "../config/env.js";

const fallbackUrl = "postgres://postgres:postgres@localhost:5432/clinical_notes";

export const sequelize = new Sequelize(env.databaseUrl || fallbackUrl, {
  dialect: "postgres",
  logging: env.nodeEnv === "development" ? false : false,
  dialectOptions:
    env.nodeEnv === "production"
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {}
});
