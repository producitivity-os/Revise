import * as React from "react";
import {
  BookOpen,
  Check,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "@productivity-os/shared-ui/components/sf-symbols";
import { Button } from "@productivity-os/shared-ui/components/ui/button";
import { Kbd } from "@productivity-os/shared-ui/components/ui/kbd";
import type { RevisionCard, RevisionRating } from "@/models/revision";
import {
  nextVisibleTierCount,
  revisionCardTiers,
  revisionExpectedAnswer,
  revisionPrompt,
} from "@/lib/card-tiers";

const ratings: {
  id: RevisionRating;
  label: string;
  key: string;
  icon: typeof X;
}[] = [
  { id: "again", label: "Again", key: "1", icon: X },
  { id: "hard", label: "Hard", key: "2", icon: RotateCcw },
  { id: "good", label: "Good", key: "3", icon: Check },
  { id: "easy", label: "Easy", key: "4", icon: Sparkles },
];

export function ReviewSession({
  cards,
  busy,
  status,
  reviewedCount,
  totalCards,
  onRate,
  onTogglePause,
  onExit,
  onOpenSource,
}: {
  cards: readonly RevisionCard[];
  busy: boolean;
  status?: "running" | "paused" | "completed" | "cancelled" | "idle";
  reviewedCount: number;
  totalCards: number;
  onRate(
    card: RevisionCard,
    rating: RevisionRating,
    question: string,
    expectedAnswer: string,
  ): Promise<boolean>;
  onTogglePause(): void;
  onExit(): void;
  onOpenSource(card: RevisionCard): void;
}) {
  const [visibleTierCount, setVisibleTierCount] = React.useState(1);
  const card = cards[0];
  const tiers = card ? revisionCardTiers(card) : [];
  const fullyRevealed = visibleTierCount >= tiers.length;
  React.useEffect(() => {
    setVisibleTierCount(1);
  }, [card?.cardId]);
  const rate = React.useCallback(
    async (rating: RevisionRating) => {
      if (!card || status === "paused") return;
      const question = revisionPrompt(card);
      const expectedAnswer = revisionExpectedAnswer(card);
      await onRate(card, rating, question, expectedAnswer);
    },
    [card, onRate, status],
  );
  React.useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!card || busy || status === "paused" || status === "completed")
        return;
      if (!fullyRevealed && (event.key === " " || event.key === "ArrowDown")) {
        event.preventDefault();
        setVisibleTierCount((count) =>
          nextVisibleTierCount(count, tiers.length),
        );
        return;
      }
      if (fullyRevealed) {
        const rating = ratings.find((item) => item.key === event.key)?.id;
        if (rating) {
          event.preventDefault();
          void rate(rating);
        }
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [busy, card, fullyRevealed, rate, status, tiers.length]);

  if (!card || status === "completed")
    return (
      <div className="revise-session-complete">
        <span>✓</span>
        <strong>Revision complete</strong>
        <p>You reached this session’s goal.</p>
        <Button type="button" size="sm" onClick={onExit}>
          Close
        </Button>
      </div>
    );
  const progress =
    totalCards <= 0 ? 1 : Math.min(1, reviewedCount / totalCards);
  return (
    <section className="revise-session">
      <div className="revise-session-progress">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <header>
        <Button type="button" variant="ghost" size="xs" onClick={onExit}>
          <X /> Close
        </Button>
        <span>
          {Math.min(reviewedCount + 1, totalCards)} / {totalCards}
        </span>
        {status && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onTogglePause}
          >
            {status === "paused" ? <Play /> : <Pause />}
            {status === "paused" ? "Resume" : "Pause"}
          </Button>
        )}
      </header>
      {status === "paused" && (
        <div className="revise-session-paused">
          <Pause />
          <strong>Review paused</strong>
          <Button type="button" size="sm" onClick={onTogglePause}>
            <Play /> Resume
          </Button>
        </div>
      )}
      <article className={`revise-study-card${fullyRevealed ? " revealed" : ""}`}>
        <div className="revise-study-tiers">
          {tiers.slice(0, visibleTierCount).map((tier, index) => (
            <section className="revise-study-tier" key={tier.id}>
              <span>{tier.name}</span>
              {tier.previewDataUrl ? (
                <img src={tier.previewDataUrl} alt={`${tier.name} preview`} />
              ) : (
                <div>{tier.content || (index === 0 ? "Untitled card" : "Empty tier")}</div>
              )}
            </section>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="revise-study-source"
          onClick={() => onOpenSource(card)}
        >
          <BookOpen /> {card.notebookTitle}
          {card.sources[0] ? ` · ${card.sources[0].label}` : ""}
        </Button>
      </article>
      {!fullyRevealed ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="revise-reveal"
          onClick={() =>
            setVisibleTierCount((count) =>
              nextVisibleTierCount(count, tiers.length),
            )
          }
        >
          Press <Kbd>Space</Kbd> or <Kbd>↓</Kbd> to reveal the next tier
        </Button>
      ) : (
        <div className="revise-ratings">
          {ratings.map(({ id, label, key, icon: Icon }) => (
            <Button
              type="button"
              variant="outline"
              size="sm"
              key={id}
              disabled={busy || status === "paused"}
              data-rating={id}
              onClick={() => void rate(id)}
            >
              <Icon />
              {label}
              <Kbd>{key}</Kbd>
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
