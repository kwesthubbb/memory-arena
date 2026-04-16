const required = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Отсутствует обязательная переменная окружения: ${name}`);
  }

  return value;
};

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
} as const;
