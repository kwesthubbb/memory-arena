const fs = require("node:fs");
const path = require("node:path");

const postgres = require("postgres");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRequireSsl = (databaseUrl) => {
  try {
    const url = new URL(databaseUrl);
    const host = url.hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return process.env.NODE_ENV === "production";
  }
};

const getDatabaseUrl = () =>
  process.env.DATABASE_URL ||
  process.env.DATABASE_URI ||
  process.env.POSTGRES_URL ||
  "";

const loadStatements = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split(/--> statement-breakpoint\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
};

const isRetriableNetworkError = (error) => {
  const code = error && typeof error === "object" ? error.code : undefined;
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error);

  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    /connection.*(lost|closed|reset)/i.test(message) ||
    /read ECONNRESET/i.test(message)
  );
};

async function run() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error("Set DATABASE_URL first.");
    process.exit(1);
  }

  const sqlFile = path.join(process.cwd(), "drizzle", "bootstrap.sql");
  if (!fs.existsSync(sqlFile)) {
    console.error(`Missing ${sqlFile}`);
    process.exit(1);
  }

  const statements = loadStatements(sqlFile);
  console.log(`Loaded ${statements.length} statements from ${path.relative(process.cwd(), sqlFile)}`);

  const ssl = shouldRequireSsl(databaseUrl) ? "require" : false;

  let index = 0;
  while (index < statements.length) {
    const statement = statements[index];
    const label = `${index + 1}/${statements.length}`;

    let attempt = 0;
    while (true) {
      attempt += 1;
      let sql;
      try {
        sql = postgres(databaseUrl, {
          ssl,
          max: 1,
          idle_timeout: 20,
          connect_timeout: 15,
          prepare: false,
        });

        await sql.unsafe(statement);
        await sql.end({ timeout: 5 });
        break;
      } catch (error) {
        try {
          if (sql) await sql.end({ timeout: 1 });
        } catch {}

        if (!isRetriableNetworkError(error) || attempt >= 8) {
          console.error(`Failed at ${label} (attempt ${attempt})`);
          console.error(statement.slice(0, 500));
          throw error;
        }

        const backoffMs = Math.min(15000, 300 * 2 ** attempt);
        console.warn(`Network drop at ${label}, retrying in ${backoffMs}ms (attempt ${attempt})`);
        await sleep(backoffMs);
      }
    }

    if ((index + 1) % 3 === 0 || index + 1 === statements.length) {
      console.log(`Applied ${label}`);
    }
    index += 1;
  }

  console.log("Done.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

