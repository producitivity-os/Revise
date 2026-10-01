import * as React from "react";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Layers3,
  Play,
} from "@productivity-os/shared-ui/components/sf-symbols";
import { Button } from "@productivity-os/shared-ui/components/ui/button";
import {
  ApplicationSidebar,
  ApplicationSidebarItem,
  ApplicationSidebarNav,
  ApplicationSidebarSection,
} from "@productivity-os/shared-ui/components/application-sidebar";
import type { RevisionDeckSummary } from "@/api/revision-data";
import { revisionPrompt } from "@/lib/card-tiers";
import type { RevisionCard } from "@/models/revision";

export type WorkspaceView =
  | { type: "dashboard" }
  | { type: "due" }
  | { type: "card"; card: RevisionCard };

function prompt(card: RevisionCard) {
  return (
    revisionPrompt(card).trim() ||
    "Untitled card"
  );
}

export function LibrarySidebar({
  decks,
  cards,
  view,
  onView,
  onStartReview,
}: {
  decks: RevisionDeckSummary[];
  cards: RevisionCard[];
  view: WorkspaceView;
  onView(view: WorkspaceView): void;
  onStartReview(notebookId?: string): void;
}) {
  const [query, setQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const normalized = query.trim().toLowerCase();
  const matchingDecks = decks.filter((deck) => {
    if (!normalized || deck.title.toLowerCase().includes(normalized))
      return true;
    return cards.some(
      (card) =>
        card.notebookId === deck.notebookId &&
        prompt(card).toLowerCase().includes(normalized),
    );
  });
  const dueCount = decks.reduce((sum, deck) => sum + deck.dueCount, 0);

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ApplicationSidebar
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Search notebooks and cards",
      }}
    >
      <ApplicationSidebarNav>
        <ApplicationSidebarItem
          active={view.type === "dashboard"}
          icon={<BarChart3 />}
          label="Dashboard"
          onClick={() => onView({ type: "dashboard" })}
        />
        <ApplicationSidebarItem
          active={view.type === "due"}
          icon={<Layers3 />}
          label="Due Cards"
          badge={dueCount}
          onClick={() => onView({ type: "due" })}
        />
      </ApplicationSidebarNav>
      <ApplicationSidebarSection
        label="Notebooks"
        action={
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            title="Review all due cards"
            onClick={() => onStartReview()}
          >
            <Play />
          </Button>
        }
      >
        <div className="revise-deck-list">
        {matchingDecks.map((deck) => {
          const isExpanded =
            expanded.has(deck.notebookId) || normalized.length > 0;
          const deckCards = cards.filter(
            (card) =>
              card.notebookId === deck.notebookId &&
              (!normalized ||
                prompt(card).toLowerCase().includes(normalized) ||
                deck.title.toLowerCase().includes(normalized)),
          );
          return (
            <div className="revise-deck" key={deck.notebookId}>
              <div className="revise-deck-row">
                <button
                  type="button"
                  className="revise-deck-toggle"
                  onClick={() => toggle(deck.notebookId)}
                >
                  {isExpanded ? <ChevronDown /> : <ChevronRight />}
                  <BookOpen />
                  <span>{deck.title}</span>
                </button>
                <span className="revise-deck-count">
                  {deck.dueCount}/{deck.totalCount}
                </span>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={deck.dueCount === 0}
                  title={`Review ${deck.title}`}
                  onClick={() => onStartReview(deck.notebookId)}
                >
                  <Play />
                </Button>
              </div>
              {isExpanded && (
                <div className="revise-card-list">
                  {deckCards.map((card) => (
                    <button
                      type="button"
                      key={card.cardId}
                      data-active={
                        view.type === "card" && view.card.cardId === card.cardId
                      }
                      onClick={() => onView({ type: "card", card })}
                    >
                      <span>{prompt(card)}</span>
                      {card.dueAt <= Date.now() && <i>Due</i>}
                    </button>
                  ))}
                  {deckCards.length === 0 && <p>No matching cards</p>}
                </div>
              )}
            </div>
          );
        })}
        {matchingDecks.length === 0 && (
          <p className="revise-sidebar-empty">
            No notebooks match your search.
          </p>
        )}
        </div>
      </ApplicationSidebarSection>
    </ApplicationSidebar>
  );
}
