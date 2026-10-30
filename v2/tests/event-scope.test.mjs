import assert from "node:assert/strict";
import test from "node:test";
import { appendUniqueEvents, EventRequestGuard, runScopedLoad } from "../web/src/event-scope.ts";

test("late event results from a previous tenant cannot become current", async () => {
  const guard = new EventRequestGuard();
  guard.setScope("principal-a:tenant-a:Civic");
  const token = guard.begin();
  let visible = [];
  let finish;
  const lateResult = new Promise((resolve) => { finish = resolve; }).then((events) => {
    if (guard.isCurrent(token)) visible = events;
  });

  guard.setScope("principal-b:tenant-b:Civic");
  finish([{ id: "tenant-a-event" }]);
  await lateResult;
  assert.deepEqual(visible, []);
});

test("a newer request and duplicate page entries cannot inflate event density", () => {
  const guard = new EventRequestGuard();
  guard.setScope("tenant-a:Civic");
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);
  assert.deepEqual(appendUniqueEvents([{ id: "one" }], [{ id: "one" }, { id: "two" }]), [{ id: "one" }, { id: "two" }]);
});

test("reload and pagination orchestration discard results after the identity/filter scope changes", async () => {
  const guard = new EventRequestGuard();
  const events = [];
  const errors = [];
  const finalStates = [];
  let finish;
  const pendingPage = new Promise((resolve) => { finish = resolve; });
  const load = runScopedLoad(
    guard,
    JSON.stringify(["user-a", "tenant-a", "Civic", "water"]),
    async (isCurrent) => {
      const page = await pendingPage;
      return isCurrent() ? page : [];
    },
    (page) => { events.push(...appendUniqueEvents(events, page)); },
    (error) => errors.push(error),
    (isCurrent) => finalStates.push(isCurrent),
  );

  guard.invalidate();
  guard.setScope(JSON.stringify(["user-b", "tenant-b", "Civic", "water"]));
  finish([{ id: "tenant-a-event" }]);
  await load;

  assert.deepEqual(events, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(finalStates, [false]);
});
