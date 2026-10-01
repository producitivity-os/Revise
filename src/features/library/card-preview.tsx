import { ArrowLeft, ExternalLink } from "@productivity-os/shared-ui/components/sf-symbols";
import { Button } from "@productivity-os/shared-ui/components/ui/button";
import { revisionCardTiers, revisionPrompt } from "@/lib/card-tiers";
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
  const tiers = revisionCardTiers(card);
  const question = revisionPrompt(card);
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
        {tiers.map((tier) => (
          <section key={tier.id}>
            <label>{tier.name}</label>
            {tier.previewDataUrl ? (
              <img src={tier.previewDataUrl} alt={`${tier.name} preview`} />
            ) : (
              <p>{tier.content || "Empty tier"}</p>
            )}
          </section>
        ))}
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
          <dd>{tiers.length} {tiers.length === 1 ? "tier" : "tiers"}</dd>
        </div>
      </dl>
    </main>
  );
}
