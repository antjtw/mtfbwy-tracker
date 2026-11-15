import { promises as fs } from "node:fs";
import path from "node:path";

/*
 * Applies the SQL files in supabase/migrations, once each, in name order, and remembers which it has run.
 * Every migration has to be safe to run twice (create ... if not exists, create or replace), so a half-finished
 * run or an overlap with something already run by hand does no harm.
 */

export interface Executor {
  /** Runs one or more statements */
  run(sql: string): Promise<void>;
  all(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
}

export interface MigrationFile {
  name: string;
  sql: string;
}

/** Migrations dated before this were run by hand before the runner existed (several change data), so they are noted as done and not run */
export const BASELINE = "2026-11-15";

export async function listMigrations(dir = path.join(process.cwd(), "supabase", "migrations")): Promise<MigrationFile[]> {
  const names = (await fs.readdir(dir)).filter((n) => n.endsWith(".sql")).sort();
  return Promise.all(names.map(async (name) => ({ name, sql: await fs.readFile(path.join(dir, name), "utf8") })));
}

export async function applyMigrations(exec: Executor, files: MigrationFile[], baseline = BASELINE): Promise<{ applied: string[]; baselined: string[]; upToDate: boolean }> {
  await exec.run("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await exec.all("select name from schema_migrations")).map((r) => r.name as string));
  const firstRun = done.size === 0;
  const applied: string[] = [];
  const baselined: string[] = [];
  for (const f of files) {
    if (done.has(f.name)) continue;
    if (firstRun && f.name < baseline) {
      await exec.all("insert into schema_migrations (name) values ($1) on conflict do nothing", [f.name]);
      baselined.push(f.name);
      continue;
    }
    await exec.run("begin");
    try {
      await exec.run(f.sql);
      await exec.all("insert into schema_migrations (name) values ($1) on conflict do nothing", [f.name]);
      await exec.run("commit");
    } catch (e) {
      await exec.run("rollback").catch(() => undefined);
      throw new Error(`${f.name}: ${(e as Error).message}`);
    }
    applied.push(f.name);
  }
  return { applied, baselined, upToDate: applied.length === 0 && baselined.length === 0 };
}
