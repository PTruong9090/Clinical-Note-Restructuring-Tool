import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || "",
  llmProvider: process.env.LLM_PROVIDER || "openai",
  llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
  llmModel: process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-5.4-mini",
  useLlm: (process.env.USE_LLM || process.env.USE_OPENAI || "false") === "true",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173"
};
