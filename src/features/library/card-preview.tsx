import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@productivity-os/shared-ui/components/ui/button";
import { clozeAnswer, clozePrompt } from "@/lib/cloze";
import type { RevisionCard } from "@/models/revision";

function dateTime(value: number | null) {
  return value == null
    ? "Never"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);
}

export function CardPreview({
  card,
  onBack,
  onEdit,
}: {
  card: RevisionCard;
  onBack(): void;
  onEdit(): void;
}) {
  const question = card.kind === "cloze" ? clozePrompt(card.cloze) : card.front;
  const answer = card.kind === "cloze" ? clozeAnswer(card.cloze) : card.back;
  return (
    <main className="revise-card-preview">
      <Button type="button" size="sm" variant="ghost" onClick={onBack}>
        <ArrowLeft />
        Back to dashboard
      </Button>
      <div className="revise-preview-heading">
        <div>
          <span>
            {card.notebookTitle} · {card.layerName}
          </span>
          <h1>{question || "Untitled question"}</h1>
        </div>
        <Button type="button" size="sm" onClick={onEdit}>
          <ExternalLink />
          Edit in Notes
        </Button>
      </div>
      <article className="revise-preview-card">
        <section>
          <label>Question</label>
          <p>{question || "Untitled question"}</p>
        </section>
        <section>
          <label>Expected answer</label>
          <p>{answer || "No answer yet"}</p>
        </section>
      </article>
      <dl className="revise-schedule-metadata">
        <div>
          <dt>Due</dt>
          <dd>{dateTime(card.dueAt)}</dd>
        </div>
        <div>
          <dt>Last reviewed</dt>
          <dd>{dateTime(card.lastReviewAt)}</dd>
        </div>
        <div>
          <dt>Reviews</dt>
          <dd>{card.reviewCount}</dd>
        </div>
        <div>
          <dt>Lapses</dt>
          <dd>{card.lapses}</dd>
        </div>
        <div>
          <dt>Card type</dt>
          <dd>{card.kind === "cloze" ? "Cloze" : "Basic"}</dd>
        </div>
      </dl>
    </main>
  );
}
