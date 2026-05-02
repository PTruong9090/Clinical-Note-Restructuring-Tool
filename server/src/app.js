import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import { generateRoutes } from "./routes/generateRoutes.js";
import { caseRoutes } from "./routes/caseRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin.split(",").map((origin) => origin.trim()),
      credentials: true
    })
  );
  app.use(express.json({ limit: "3mb" }));
  app.use(morgan(env.nodeEnv === "test" ? "tiny" : "dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/generate", generateRoutes);
  app.use("/api/cases", caseRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
