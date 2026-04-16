import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as authSchema from "@/db/auth-schema";
import * as gameSchema from "@/db/game-schema";

const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  prepare: false,
});

export const db = drizzle(client, {
  schema: {
    ...authSchema,
    ...gameSchema,
  },
});

export type Database = typeof db;
