import type { RevisionCard, RevisionCardTier } from "../models/revision.ts";
import { clozeAnswer, clozePrompt } from "./cloze.ts";

export function revisionCardTiers(card: RevisionCard): RevisionCardTier[] {
  if (card.tiers?.length) return card.tiers;
  const front = card.kind === "cloze" ? clozePrompt(card.cloze) : card.front;
  const back = card.kind === "cloze" ? clozeAnswer(card.cloze) : card.back;
  return [
    { id: "front", name: "Front", content: front, previewDataUrl: null },
    ...(back
      ? [{ id: "back", name: "Back", content: back, previewDataUrl: null }]
      : []),
  ];
}

export function revisionPrompt(card: RevisionCard): string {
  return revisionCardTiers(card)[0]?.content ?? "";
}

export function revisionExpectedAnswer(card: RevisionCard): string {
  return revisionCardTiers(card)
    .slice(1)
    .map((tier) => tier.content)
    .join("\n\n");
}

export function nextVisibleTierCount(visible: number, total: number): number {
  return Math.min(Math.max(1, total), Math.max(1, visible) + 1);
}
