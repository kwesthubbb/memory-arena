import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

dotenv.config({ path: ".env.local" });

const port = Number(process.env.PORT ?? 3000);

const env = {
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:5432/memory_arena",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ||
    "12345678901234567890123456789012",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || `http://127.0.0.1:${port}`,
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: "next dev --hostname 127.0.0.1 --port 3000",
    env,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
