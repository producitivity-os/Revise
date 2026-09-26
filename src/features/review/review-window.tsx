import * as React from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@productivity-os/shared-ui/components/ui/button";
import {
  revisionData,
  type RevisionSession,
  type RevisionSessionRun,
} from "@/api/revision-data";
import { ReviewSession } from "@/components/review-session";
import type { RevisionCard, RevisionRating } from "@/models/revision";

type ReviewWindowProps = {
  sessionId: string;
  embedded?: boolean;
  onLeave?: () => void;
};

async function closeNativeWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } catch {
    window.close();
  }
}

export function ReviewWindow({
  sessionId,
  embedded = false,
  onLeave,
}: ReviewWindowProps) {
  const [run, setRun] = React.useState<RevisionSessionRun | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const sessionRef = React.useRef<RevisionSession | null>(null);
  const closingRef = React.useRef(false);
  sessionRef.current = run?.session ?? null;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await revisionData.sessionRun(sessionId);
      if (next.session.status === "idle" || next.session.status === "paused") {
        next.session = await revisionData.setSessionStatus(
          sessionId,
          "running",
        );
      }
      setRun(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const rate = React.useCallback(
    async (
      card: RevisionCard,
      rating: RevisionRating,
      question: string,
      expectedAnswer: string,
    ) => {
      if (busy) return false;
      setBusy(true);
      try {
        const result = await revisionData.reviewSessionCard({
          sessionId,
          card,
          rating,
          question,
          expectedAnswer,
        });
        setRun((current) =>
          current
            ? {
                session: result.session,
                cards: current.cards.filter(
                  (candidate) => candidate.cardId !== card.cardId,
                ),
              }
            : current,
        );
        return true;
      } catch (cause) {
        setError(
          `Your rating was not saved. ${cause instanceof Error ? cause.message : String(cause)}`,
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, sessionId],
  );

  const togglePause = React.useCallback(async () => {
    const current = sessionRef.current;
    if (
      !current ||
      (current.status !== "running" && current.status !== "paused")
    )
      return;
    const session = await revisionData.setSessionStatus(
      current.id,
      current.status === "running" ? "paused" : "running",
    );
    setRun((value) => (value ? { ...value, session } : value));
  }, []);

  const leave = React.useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      const current = sessionRef.current;
      if (
        current &&
        (current.status === "running" || current.status === "paused")
      ) {
        const status = current.origin === "workflow" ? "cancelled" : "paused";
        const session = await revisionData.setSessionStatus(current.id, status);
        setRun((value) => (value ? { ...value, session } : value));
      }
    } finally {
      if (embedded) {
        closingRef.current = false;
        onLeave?.();
      } else {
        await closeNativeWindow();
      }
    }
  }, [embedded, onLeave]);

  React.useEffect(() => {
    if (embedded) return undefined;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) =>
        getCurrentWindow().onCloseRequested(async (event) => {
          if (closingRef.current) return;
          event.preventDefault();
          await leave();
        }),
      )
      .then((dispose) => {
        unlisten = dispose;
      })
      .catch(() => undefined);
    return () => unlisten?.();
  }, [embedded, leave]);

  if (loading)
    return (
      <main className="revise-status">
        <RefreshCw className="spinning" />
        <strong>Loading review…</strong>
      </main>
    );
  if (error || !run)
    return (
      <main className="revise-status">
        <span>!</span>
        <strong>Couldn’t load your review</strong>
        <p>{error}</p>
        <div className="revise-status-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
          >
            <RefreshCw />
            Retry
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void leave()}
          >
            <X />
            Close
          </Button>
        </div>
      </main>
    );

  return (
    <ReviewSession
      key={`${run.session.id}-${run.session.reviewedCount}`}
      cards={run.cards}
      busy={busy}
      status={run.session.status}
      reviewedCount={run.session.reviewedCount}
      totalCards={run.session.totalCards}
      onRate={rate}
      onTogglePause={() => void togglePause()}
      onExit={() => void leave()}
      onOpenSource={(card) => void revisionData.openSource(card)}
    />
  );
}
