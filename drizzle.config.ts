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

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL не задан. Добавь его в .env.local или .env");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/*schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
