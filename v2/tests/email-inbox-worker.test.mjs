import test from "node:test";
import assert from "node:assert/strict";
import worker from "../email-inbox/worker.ts";

function fakeBucket(initial = []) {
  const objects = [...initial];
  return {
    objects,
    async put(key, value) { objects.push({ key, value }); },
    async get(key) {
      const found = objects.find((o) => o.key === key);
      if (!found) return null;
      return {
        body: found.value,
        async json() { return JSON.parse(typeof found.value === "string" ? found.value : new TextDecoder().decode(found.value)); },
      };
    },
    async list({ prefix }) {
      return { objects: objects.filter((o) => o.key.startsWith(prefix)).map((o) => ({ key: o.key })) };
    },
  };
}

function auth(actor = null) {
  return { async fetch() { return actor ? Response.json(actor) : new Response(null, { status: 403 }); } };
}

function fakeMessage(to, raw = "From: sender@example.org\r\nTo: t\r\nSubject: hi\r\n\r\nbody") {
  return {
    to,
    raw: new TextEncoder().encode(raw),
    rejected: null,
    setReject(reason) { this.rejected = reason; },
  };
}

const tenantA = { id: "user-1", tenantId: "org-a" };

test("inbox API rejects unauthenticated requests", async () => {
  const response = await worker.fetch(new Request("https://harvy.test/"), { HARVY_INBOX: fakeBucket(), AUTH: auth() });
  assert.equal(response.status, 401);
});

test("inbox list returns only the caller tenant's keys", async () => {
  const bucket = fakeBucket([
    { key: "inbox/org-a/2026/10/30/1-a.json", value: JSON.stringify({ subject: "a" }) },
    { key: "inbox/org-a/2026/10/30/1-a.eml", value: "raw-a" },
    { key: "inbox/org-b/2026/10/30/2-b.json", value: JSON.stringify({ subject: "b" }) },
    { key: "inbox/org-b/2026/10/30/2-b.eml", value: "raw-b" },
  ]);
  const response = await worker.fetch(new Request("https://harvy.test/"), { HARVY_INBOX: bucket, AUTH: auth(tenantA) });
  assert.equal(response.status, 200);
  const { items } = await response.json();
  assert.deepEqual(items.map((i) => i.key), ["inbox/org-a/2026/10/30/1-a.eml"]);
  assert.equal(items[0].subject, "a");
});

test("message fetch outside the caller tenant prefix is not found", async () => {
  const bucket = fakeBucket([
    { key: "inbox/org-a/2026/10/30/1-a.eml", value: "raw-a" },
    { key: "inbox/org-b/2026/10/30/2-b.eml", value: "raw-b" },
  ]);
  const env = { HARVY_INBOX: bucket, AUTH: auth(tenantA) };
  const denied = await worker.fetch(new Request("https://harvy.test/m/inbox/org-b/2026/10/30/2-b.eml"), env);
  assert.equal(denied.status, 404);
  const allowed = await worker.fetch(new Request("https://harvy.test/m/inbox/org-a/2026/10/30/1-a.eml"), env);
  assert.equal(allowed.status, 200);
  assert.equal(await allowed.text(), "raw-a");
});

test("inbox API is read-only", async () => {
  const response = await worker.fetch(new Request("https://harvy.test/", { method: "POST" }), { HARVY_INBOX: fakeBucket(), AUTH: auth(tenantA) });
  assert.equal(response.status, 405);
});

test("inbound mail is stored under the recipient tenant prefix", async () => {
  const bucket = fakeBucket();
  const message = fakeMessage("inbox+org-a@inbox.harvy.dev");
  await worker.email(message, { HARVY_INBOX: bucket, AUTH: auth() });
  assert.equal(message.rejected, null);
  assert.ok(bucket.objects.length > 0);
  assert.ok(bucket.objects.every((o) => o.key.startsWith("inbox/org-a/")));
  assert.equal(bucket.objects.filter((o) => o.key.endsWith(".eml")).length, 1);
});

test("inbound mail without a validated tenant recipient is rejected", async () => {
  const bucket = fakeBucket();
  const message = fakeMessage("inbox@inbox.harvy.dev");
  await worker.email(message, { HARVY_INBOX: bucket, AUTH: auth() });
  assert.equal(message.rejected, "unrecognized inbox address");
  assert.equal(bucket.objects.length, 0);
  const sneaky = fakeMessage("inbox+org-a/../../org-b@inbox.harvy.dev");
  await worker.email(sneaky, { HARVY_INBOX: bucket, AUTH: auth() });
  assert.equal(sneaky.rejected, "unrecognized inbox address");
  assert.equal(bucket.objects.length, 0);
});
