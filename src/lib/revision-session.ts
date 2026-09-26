import type { RevisionSession } from "../api/revision-data.ts";

const MAX_TRACKED_CARD_SESSION_MS = 86_400_000;

export function revisionSessionElapsed(session: RevisionSession, now = Date.now()): number {
  const running = session.status === "running"
    ? Math.max(0, now - (session.startedAt ?? now))
    : 0;
  const elapsed = session.elapsedMs + running;
  return session.goal.type === "time"
    ? Math.min(session.goal.durationMs, elapsed)
    : Math.min(MAX_TRACKED_CARD_SESSION_MS, elapsed);
}

export function tickRevisionSession(session: RevisionSession, now = Date.now()): RevisionSession {
  if (session.status !== "running") return session;
  const elapsedMs = revisionSessionElapsed(session, now);
  const completed = session.goal.type === "time" && elapsedMs >= session.goal.durationMs;
  return {
    ...session,
    elapsedMs,
    status: completed ? "completed" : "running",
    startedAt: completed ? null : now,
  };
}

export function toggleRevisionSessionPause(session: RevisionSession, now = Date.now()): RevisionSession {
  if (session.status === "running") {
    return { ...session, elapsedMs: revisionSessionElapsed(session, now), status: "paused", startedAt: null };
  }
  if (session.status === "paused") return { ...session, status: "running", startedAt: now };
  return session;
}

export function cancelRevisionSession(session: RevisionSession, now = Date.now()): RevisionSession {
  if (session.status !== "running" && session.status !== "paused") return session;
  return {
    ...session,
    elapsedMs: revisionSessionElapsed(session, now),
    status: "cancelled",
    startedAt: null,
  };
}

export function effectiveRevisionCardGoal(session: RevisionSession): number {
  if (session.goal.type !== "cards") return session.totalCards;
  return session.totalCards > 0
    ? Math.min(session.goal.cardCount, session.totalCards)
    : session.goal.cardCount;
}
