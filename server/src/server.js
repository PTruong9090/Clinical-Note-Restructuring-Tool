import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { sequelize } from "./db/sequelize.js";
import "./models/index.js";

async function start() {
  await sequelize.authenticate();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Clinical note API listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Unable to start server:", error);
  process.exit(1);
});
