import * as React from "react";
import { AlertCircle, CheckCircle2, Play, RefreshCw } from "@productivity-os/shared-ui/components/sf-symbols";
import { Button } from "@productivity-os/shared-ui/components/ui/button";
import {
  ApplicationSidebarContent,
  ApplicationSidebarLayout,
} from "@productivity-os/shared-ui/components/application-sidebar";
import { revisionData, type RevisionDeckSummary } from "@/api/revision-data";
import { Dashboard } from "@/features/dashboard/dashboard";
import { CardPreview } from "@/features/library/card-preview";
import {
  LibrarySidebar,
  type WorkspaceView,
} from "@/features/library/library-sidebar";
import { ReviewWindow } from "@/features/review/review-window";
import type { RevisionCard } from "@/models/revision";
import { revisionPrompt } from "@/lib/card-tiers";

type WorkspaceState = { decks: RevisionDeckSummary[]; cards: RevisionCard[] };

export function StandaloneWorkspace() {
  const [state, setState] = React.useState<WorkspaceState | null>(null);
  const [view, setView] = React.useState<WorkspaceView>({ type: "dashboard" });
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await revisionData.status();
      if (!status.connected)
        throw new Error(
          status.error ?? "The local data service is unavailable.",
        );
      const [decks, cards] = await Promise.all([
        revisionData.decks(),
        revisionData.cards(),
      ]);
      setState({ decks, cards });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    let unlisten: (() => void) | undefined;
    void revisionData.takePendingStandaloneSession().then((id) => {
      if (id) setSessionId(id);
    });
    void import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<string>("revise:start-session", (event) =>
          setSessionId(event.payload),
        ),
      )
      .then((dispose) => {
        unlisten = dispose;
      })
      .catch(() => undefined);
    return () => unlisten?.();
  }, []);

  const startReview = React.useCallback(async (notebookId?: string) => {
    setError(null);
    try {
      const active = await revisionData.activeStandaloneSession();
      const run = active
        ? await revisionData.sessionRun(active.id)
        : await revisionData.startStandaloneSession(notebookId);
      if (run.session.status === "completed" || run.cards.length === 0) {
        setError(
          notebookId
            ? "You’re caught up in this notebook."
            : "You’re caught up. No cards are due right now.",
        );
        return;
      }
      setSessionId(run.session.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  const leaveReview = React.useCallback(() => {
    setSessionId(null);
    void load();
  }, [load]);

  if (sessionId)
    return (
      <ReviewWindow sessionId={sessionId} embedded onLeave={leaveReview} />
    );
  if (loading && !state)
    return (
      <main className="revise-status">
        <RefreshCw className="spinning" />
        <strong>Opening your study workspace…</strong>
      </main>
    );
  if (!state)
    return (
      <main className="revise-status">
        <AlertCircle />
        <strong>Revise is offline</strong>
        <p>{error}</p>
        <Button type="button" size="sm" onClick={() => void load()}>
          <RefreshCw />
          Retry
        </Button>
      </main>
    );

  const dueCards = state.cards.filter((card) => card.dueAt <= Date.now());
  return (
    <ApplicationSidebarLayout accentColor="#ffa800" className="revise-workspace">
      <LibrarySidebar
        decks={state.decks}
        cards={state.cards}
        view={view}
        onView={setView}
        onStartReview={(id) => void startReview(id)}
      />
      <ApplicationSidebarContent className="revise-workspace-content">
        {error && (
          <div className="revise-inline-error">
            <AlertCircle />
            {error}
            <button type="button" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}
        {view.type === "dashboard" && (
          <Dashboard
            decks={state.decks}
            onStartReview={(id) => void startReview(id)}
          />
        )}
        {view.type === "due" && (
          <DueCards
            cards={dueCards}
            onStart={() => void startReview()}
            onSelect={(card) => setView({ type: "card", card })}
          />
        )}
        {view.type === "card" && (
          <CardPreview
            card={view.card}
            onBack={() => setView({ type: "dashboard" })}
            onEdit={() => void revisionData.openSource(view.card)}
          />
        )}
      </ApplicationSidebarContent>
    </ApplicationSidebarLayout>
  );
}

function DueCards({
  cards,
  onStart,
  onSelect,
}: {
  cards: RevisionCard[];
  onStart(): void;
  onSelect(card: RevisionCard): void;
}) {
  return (
    <main className="revise-due-page">
      <header>
        <div>
          <h1>Due Cards</h1>
          <p>{cards.length} cards are ready to review.</p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={cards.length === 0}
          onClick={onStart}
        >
          <Play />
          Review all
        </Button>
      </header>
      {cards.length === 0 ? (
        <div className="revise-empty revise-due-empty">
          <CheckCircle2 />
          You’re caught up.
        </div>
      ) : (
        <div className="revise-due-list">
          {cards.map((card) => (
            <button
              type="button"
              key={`${card.notebookId}-${card.cardId}`}
              onClick={() => onSelect(card)}
            >
              <span>{revisionPrompt(card) || "Untitled card"}</span>
              <small>{card.notebookTitle}</small>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
