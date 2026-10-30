import assert from "node:assert/strict";
import test from "node:test";
import { compilePostgresSql, PostgresDatabase } from "../shared/sql-database.ts";

test("PostgreSQL compilation binds placeholders without rewriting quoted SQL", () => {
  const compiled = compilePostgresSql(
    `SELECT ? AS value, '?' AS literal, "?" AS identifier, $$?$$ AS quoted /* ? */ -- ?\nWHERE changes() = 1`,
    ["value"],
    2,
  );
  assert.equal(compiled.sql, `SELECT $1 AS value, '?' AS literal, "?" AS identifier, $$?$$ AS quoted /* ? */ -- ?\nWHERE $2 = 1`);
  assert.deepEqual(compiled.values, ["value", 2]);
});

test("PostgreSQL compilation translates conflict-ignore and checks bind counts", () => {
  const compiled = compilePostgresSql("INSERT OR IGNORE INTO records(id) VALUES (?) RETURNING id", ["row-1"]);
  assert.equal(compiled.sql, "INSERT INTO records(id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id");
  assert.deepEqual(compiled.values, ["row-1"]);
  assert.throws(() => compilePostgresSql("SELECT ?, ?", ["one"]), /placeholder count/);
  assert.throws(() => compilePostgresSql("SELECT ?", ["one", "two"]), /placeholder count/);
});

test("PostgreSQL batches transact and pass the preceding statement count to changes()", async () => {
  const calls = [];
  const client = {
    async connect() { calls.push({ sql: "CONNECT" }); },
    async query(sql, values = []) {
      calls.push({ sql, values });
      return { rows: [], rowCount: sql === "UPDATE records SET active = 0" ? 1 : 1 };
    },
  };
  const db = new PostgresDatabase("postgres://test.invalid/db", () => client);
  const results = await db.batch([
    db.prepare("UPDATE records SET active = 0"),
    db.prepare("DELETE FROM records WHERE changes() = 1"),
  ]);
  assert.deepEqual(calls.map(({ sql }) => sql), ["CONNECT", "BEGIN", "UPDATE records SET active = 0", "DELETE FROM records WHERE $1 = 1", "COMMIT"]);
  assert.deepEqual(calls[3].values, [1]);
  assert.deepEqual(results.map(({ meta }) => meta.changes), [1, 1]);
});

test("PostgreSQL batches roll back when a statement fails", async () => {
  const calls = [];
  const failure = new Error("statement failed");
  const client = {
    async connect() {},
    async query(sql) {
      calls.push(sql);
      if (sql === "BROKEN") throw failure;
      return { rows: [], rowCount: 0 };
    },
  };
  const db = new PostgresDatabase("postgres://test.invalid/db", () => client);
  await assert.rejects(db.batch([db.prepare("BROKEN")]), (error) => error === failure);
  assert.deepEqual(calls, ["BEGIN", "BROKEN", "ROLLBACK"]);
});

test("PostgreSQL statements reject non-scalar bind values", () => {
  const db = new PostgresDatabase("postgres://test.invalid/db", () => ({ connect: async () => {}, query: async () => ({ rows: [], rowCount: 0 }) }));
  assert.throws(() => db.prepare("SELECT ?").bind({ unexpected: true }), /Unsupported SQL bind value/);
});
