import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "@/db/auth-schema";
import * as gameSchema from "@/db/game-schema";
import { getEnv } from "@/lib/env";

const schema = {
  ...authSchema,
  ...gameSchema,
};

const shouldRequireSsl = (databaseUrl: string) => {
  try {
    const url = new URL(databaseUrl);
    const host = url.hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return process.env.NODE_ENV === "production";
  }
};

const createDb = (databaseUrl: string) => {
  const client = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    prepare: false,
    ...(shouldRequireSsl(databaseUrl) ? { ssl: "require" } : {}),
  });

  return drizzle(client, { schema });
};

type Db = ReturnType<typeof createDb>;

let cachedDb: Db | null = null;

const getDb = (): Db => {
  if (cachedDb) return cachedDb;
  cachedDb = createDb(getEnv().DATABASE_URL);
  return cachedDb;
};

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
}) as Db;

export type Database = Db;
