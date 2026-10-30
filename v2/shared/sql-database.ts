import { Client, type QueryResultRow } from "pg";

export type SqlValue = string | number | boolean | null | Uint8Array | ArrayBuffer | Date;

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  first<T extends QueryResultRow = QueryResultRow>(): Promise<T | null>;
  all<T extends QueryResultRow = QueryResultRow>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}

export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  batch(statements: SqlStatement[]): Promise<Array<{ meta: { changes: number } }>>;
}

export interface PgClient {
  connect(): Promise<unknown>;
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: SqlValue[]): Promise<{ rows: T[]; rowCount: number | null }>;
  end?(): Promise<unknown>;
}

export type PgClientFactory = (connectionString: string) => PgClient;

export function compilePostgresSql(sql: string, values: SqlValue[], previousChanges = 0) {
  const ignoreInsert = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql);
  const source = sql.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i, "INSERT INTO");
  const params: SqlValue[] = [];
  let output = "";
  let index = 0;
  let quote = "";
  let dollarQuote = "";
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) {
      output += char;
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      output += char;
      if (char === "*" && next === "/") { output += next; i++; blockComment = false; }
      continue;
    }
    if (dollarQuote) {
      if (source.startsWith(dollarQuote, i)) { output += dollarQuote; i += dollarQuote.length - 1; dollarQuote = ""; }
      else output += char;
      continue;
    }
    if (quote) {
      output += char;
      if (char === quote && next === quote) { output += next; i++; }
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "-" && next === "-") { output += "--"; i++; lineComment = true; continue; }
    if (char === "/" && next === "*") { output += "/*"; i++; blockComment = true; continue; }
    if (char === "'" || char === '"') { quote = char; output += char; continue; }
    if (char === "$") {
      const match = source.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) { dollarQuote = match[0]; output += dollarQuote; i += dollarQuote.length - 1; continue; }
    }
    if (char === "?") {
      if (index >= values.length) throw new Error("SQL placeholder count does not match bound values.");
      params.push(values[index++] ?? null);
      output += `$${params.length}`;
      continue;
    }
    const changeMatch = source.slice(i).match(/^changes\s*\(\s*\)/i);
    if (changeMatch) {
      params.push(previousChanges);
      output += `$${params.length}`;
      i += changeMatch[0].length - 1;
      continue;
    }
    output += char;
  }

  if (index !== values.length) throw new Error("SQL placeholder count does not match bound values.");
  if (ignoreInsert) {
    const semicolon = /;\s*$/.test(output);
    const body = semicolon ? output.replace(/;\s*$/, "") : output;
    const returning = body.search(/\s+RETURNING\s+/i);
    output = returning < 0
      ? `${body.trimEnd()} ON CONFLICT DO NOTHING${semicolon ? ";" : ""}`
      : `${body.slice(0, returning)} ON CONFLICT DO NOTHING${body.slice(returning)}${semicolon ? ";" : ""}`;
  }
  return { sql: output, values: params };
}

class PostgresStatement implements SqlStatement {
  private values: SqlValue[] = [];
  private readonly database: PostgresDatabase;
  readonly sql: string;

  constructor(database: PostgresDatabase, sql: string) {
    this.database = database;
    this.sql = sql;
  }

  get boundValues() { return this.values; }

  bind(...values: unknown[]): SqlStatement {
    this.values = values.map((value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === "string" || typeof value === "boolean") return value;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (value instanceof Date && Number.isFinite(value.getTime())) return value;
      if (value instanceof Uint8Array) return value;
      if (value instanceof ArrayBuffer) return new Uint8Array(value);
      throw new TypeError("Unsupported SQL bind value.");
    });
    return this;
  }

  async first<T extends QueryResultRow = QueryResultRow>(): Promise<T | null> {
    const result = await this.database.execute<T>(this.sql, this.values);
    return result.rows[0] ?? null;
  }

  async all<T extends QueryResultRow = QueryResultRow>(): Promise<{ results: T[] }> {
    const result = await this.database.execute<T>(this.sql, this.values);
    return { results: result.rows };
  }

  async run() {
    const result = await this.database.execute(this.sql, this.values);
    return { meta: { changes: result.rowCount ?? 0 } };
  }
}

export class PostgresDatabase implements SqlDatabase {
  private clientPromise?: Promise<PgClient>;
  private readonly pgClient: PgClient;

  constructor(
    connectionString: string,
    clientFactory: PgClientFactory = (connection) => new Client({ connectionString: connection }),
  ) {
    this.pgClient = clientFactory(connectionString);
  }

  get nativeClient() { return this.pgClient as Client; }

  prepare(sql: string) { return new PostgresStatement(this, sql); }

  async execute<T extends QueryResultRow = QueryResultRow>(sql: string, values: SqlValue[], previousChanges = 0) {
    const compiled = compilePostgresSql(sql, values, previousChanges);
    return (await this.client()).query<T>(compiled.sql, compiled.values);
  }

  async batch(statements: SqlStatement[]) {
    if (!statements.length) return [];
    const client = await this.client();
    await client.query("BEGIN");
    const results: Array<{ meta: { changes: number } }> = [];
    let previousChanges = 0;
    try {
      for (const statement of statements) {
        if (!(statement instanceof PostgresStatement)) throw new Error("A database batch cannot mix drivers.");
        const result = await this.execute(statement.sql, statement.boundValues, previousChanges);
        previousChanges = result.rowCount ?? 0;
        results.push({ meta: { changes: previousChanges } });
      }
      await client.query("COMMIT");
      return results;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* Preserve the original statement error. */ }
      throw error;
    }
  }

  async close() {
    const client = await this.clientPromise;
    await client?.end?.();
  }

  private client(): Promise<PgClient> {
    if (!this.clientPromise) {
      this.clientPromise = this.pgClient.connect().then(() => this.pgClient);
    }
    return this.clientPromise;
  }
}
