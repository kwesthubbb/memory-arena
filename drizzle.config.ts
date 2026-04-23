import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const cwd = process.cwd();
const envFiles = [".env.local", ".env"];

for (const fileName of envFiles) {
  const filePath = path.join(cwd, fileName);

  if (fs.existsSync(filePath)) {
    dotenv.config({
      path: filePath,
      override: false,
    });
  }
}

const isGenerate = process.argv.includes("generate");
const databaseUrl =
  process.env.DATABASE_URL ??
  (isGenerate ? "postgresql://postgres:postgres@localhost:5432/postgres" : "");

if (!databaseUrl && !isGenerate) {
  throw new Error("DATABASE_URL не задан. Добавь его в .env.local или .env");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/*schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
