import test from "node:test";
import assert from "node:assert/strict";
import { createAuth } from "./auth.ts";

const secret = "s".repeat(32);
const ctx = { waitUntil() {} };

test("createAuth uses a real pg adapter when HYPERDRIVE_PRIVATE is set", () => {
  // Client construction is lazy, so this never opens a connection.
  const auth = createAuth(
    { BETTER_AUTH_SECRET: secret, HYPERDRIVE_PRIVATE: { connectionString: "postgres://u:p@127.0.0.1:1/db" } },
    ctx,
    {},
  );
  assert.ok(auth.options.database, "Hyperdrive path must install a real database adapter");
});

test("createAuth fails closed in the worker when no database binding exists", () => {
  assert.throws(() => createAuth({ BETTER_AUTH_SECRET: secret }, ctx, {}), /No database binding/);
});
