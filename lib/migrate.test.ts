import { PGlite } from "@electric-sql/pglite";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyMigrations, type Executor, listMigrations } from "./migrate";

const executor = (db: PGlite): Executor => ({
  run: async (sql) => {
    await db.exec(sql);
  },
  all: async (sql, params) => (await db.query(sql, params)).rows as Record<string, unknown>[],
});

describe("migration runner", () => {
  it("notes the old hand-run migrations as done without running them, then runs the rest once", async () => {
    const db = new PGlite();
    const dir = mkdtempSync(path.join(tmpdir(), "mig-"));
    writeFileSync(path.join(dir, "2026-10-01-old.sql"), "create table old_thing (x int);");
    writeFileSync(path.join(dir, "2026-11-16-new.sql"), "create table if not exists new_thing (x int); insert into new_thing values (1);");
    const files = await listMigrations(dir);
    const first = await applyMigrations(executor(db), files, "2026-11-15");
    expect(first).toMatchObject({ applied: ["2026-11-16-new.sql"], baselined: ["2026-10-01-old.sql"], upToDate: false });
    await expect(db.query("select * from old_thing")).rejects.toThrow(); // not run
    const again = await applyMigrations(executor(db), files, "2026-11-15");
    expect(again).toMatchObject({ applied: [], baselined: [], upToDate: true });
    expect((await db.query("select count(*)::int n from new_thing")).rows).toEqual([{ n: 1 }]); // not run twice
  });

  it("rolls a failing migration back and says which one failed", async () => {
    const db = new PGlite();
    const dir = mkdtempSync(path.join(tmpdir(), "mig-"));
    writeFileSync(path.join(dir, "2026-11-16-bad.sql"), "create table half (x int); select nonsense from nowhere;");
    await expect(applyMigrations(executor(db), await listMigrations(dir), "2026-11-15")).rejects.toThrow(/2026-11-16-bad.sql/);
    await expect(db.query("select * from half")).rejects.toThrow(); // rolled back
    expect((await db.query("select count(*)::int n from schema_migrations")).rows).toEqual([{ n: 0 }]);
  });

  it("runs the real migrations on Postgres, twice over, and Despair is added once per roll and capped at 12", async () => {
    const db = new PGlite();
    // What the live database already has from the migrations run by hand before the runner
    await db.exec("create table players (id text primary key, name text); create table characters (id text primary key, player_id text references players(id) on delete cascade, name text); create table despair (adventure text primary key, value int not null default 0 check (value between 0 and 12), updated_at timestamptz not null default now());");
    const files = await listMigrations();
    await applyMigrations(executor(db), files);
    await applyMigrations(executor(db), files);
    const call = async (id: string, d: number) => (await db.query("select * from add_despair($1,'c1','Campaign 3',$2,4,9,0,0,'failure_with_despair',1)", [id, d])).rows[0];
    expect(await call("roll-aaaaaa1", 1)).toEqual({ value: 1, clamped: false, applied: true });
    expect(await call("roll-aaaaaa1", 1)).toEqual({ value: 1, clamped: false, applied: false });
    for (const id of ["b2", "b3", "b4"]) await call(`roll-aaaaaa${id}`, 3);
    expect(await call("roll-aaaaaa5", 3)).toEqual({ value: 12, clamped: true, applied: true });
    await db.exec("insert into players values ('p','P'); insert into characters values ('c','p','C');");
    await db.exec("insert into deleted_characters (id, player_id, name, character) values ('c','p','C','{}'::jsonb)");
  });
});
