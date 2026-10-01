export type RevisionCardKind = "basic" | "cloze";
export type RevisionRating = "again" | "hard" | "good" | "easy";

export type RevisionSourceReference = { objectId: string; label: string };
export type RevisionCardTier = {
  id: string;
  name: string;
  content: string;
  previewDataUrl: string | null;
};

export type RevisionCard = {
  notebookId: string;
  notebookTitle: string;
  layerId: string;
  layerName: string;
  cardId: string;
  kind: RevisionCardKind;
  front: string;
  back: string;
  cloze: string;
  tiers: RevisionCardTier[];
  sources: RevisionSourceReference[];
  dueAt: number;
  lastReviewAt: number | null;
  reviewCount: number;
  lapses: number;
};

export type RevisionScheduleResult = {
  notebookId: string;
  cardId: string;
  dueAt: number;
  lastReviewAt: number;
  intervalDays: number;
  stability: number;
  difficulty: number;
  reviewCount: number;
  lapses: number;
};
