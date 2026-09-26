import assert from "node:assert/strict";
import test from "node:test";
import type { RevisionSession } from "../src/api/revision-data.ts";
import {
  cancelRevisionSession,
  effectiveRevisionCardGoal,
  revisionSessionElapsed,
  tickRevisionSession,
  toggleRevisionSessionPause,
} from "../src/lib/revision-session.ts";

function session(overrides: Partial<RevisionSession> = {}): RevisionSession {
  return {
    id: "session-1",
    origin: "workflow",
    workflowId: "workflow-1",
    nodeId: "node-1",
    notebookId: null,
    goal: { type: "time", durationMs: 25 * 60_000 },
    elapsedMs: 5_000,
    status: "running",
    totalCards: 10,
    remainingCards: 10,
    reviewedCount: 0,
    rightCount: 0,
    wrongCount: 0,
    startedAt: 10_000,
    createdAt: 10_000,
    updatedAt: 10_000,
    results: [],
    ...overrides,
  };
}

test("time sessions accumulate elapsed time and complete at their target", () => {
  const current = session({ goal: { type: "time", durationMs: 10_000 } });
  assert.equal(revisionSessionElapsed(current, 13_000), 8_000);

  const completed = tickRevisionSession(current, 16_000);
  assert.equal(completed.elapsedMs, 10_000);
  assert.equal(completed.status, "completed");
  assert.equal(completed.startedAt, null);
});

test("card sessions track elapsed time without completing from the clock", () => {
  const current = session({ goal: { type: "cards", cardCount: 20 } });
  const ticked = tickRevisionSession(current, 16_000);
  assert.equal(ticked.elapsedMs, 11_000);
  assert.equal(ticked.status, "running");
  assert.equal(ticked.startedAt, 16_000);
});

test("pause, resume, and cancel preserve accumulated elapsed time", () => {
  const paused = toggleRevisionSessionPause(session(), 13_000);
  assert.equal(paused.status, "paused");
  assert.equal(paused.elapsedMs, 8_000);
  assert.equal(paused.startedAt, null);

  const resumed = toggleRevisionSessionPause(paused, 20_000);
  assert.equal(resumed.status, "running");
  assert.equal(resumed.startedAt, 20_000);

  const cancelled = cancelRevisionSession(resumed, 22_000);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.elapsedMs, 10_000);
  assert.equal(cancelled.startedAt, null);
});

test("card goals use the smaller requested or available card count", () => {
  assert.equal(
    effectiveRevisionCardGoal(
      session({ goal: { type: "cards", cardCount: 20 }, totalCards: 8 }),
    ),
    8,
  );
  assert.equal(
    effectiveRevisionCardGoal(
      session({ goal: { type: "cards", cardCount: 5 }, totalCards: 8 }),
    ),
    5,
  );
  assert.equal(
    effectiveRevisionCardGoal(
      session({ goal: { type: "cards", cardCount: 20 }, totalCards: 0 }),
    ),
    20,
  );
});
