import { Client } from "pg";
import type { Executor } from "./migrate";

/** Runs `fn` against the Postgres database named by DATABASE_URL (the connection string from Supabase) */
export async function withDatabase<T>(fn: (exec: Executor) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    return await fn({
      run: async (sql) => {
        await client.query(sql);
      },
      all: async (sql, params) => (await client.query(sql, params)).rows,
    });
  } finally {
    await client.end().catch(() => undefined);
  }
}
