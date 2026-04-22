import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as authSchema from "@/db/auth-schema";
import * as gameSchema from "@/db/game-schema";
import { getEnv } from "@/lib/env";

const createAuth = () => {
  const env = getEnv();

  return betterAuth({
    appName: "Арена памяти",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...authSchema,
        ...gameSchema,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "student",
          input: false,
        },
      },
    },
    plugins: [nextCookies()],
  });
};

type Auth = ReturnType<typeof createAuth>;

let cachedAuth: Auth | null = null;

export const getAuth = (): Auth => {
  if (cachedAuth) return cachedAuth;
  cachedAuth = createAuth();
  return cachedAuth;
};

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getAuth() as any)[prop];
  },
}) as Auth;

