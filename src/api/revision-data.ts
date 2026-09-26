import { invoke } from "@tauri-apps/api/core";
import type {
  RevisionCard,
  RevisionRating,
  RevisionScheduleResult,
} from "@/models/revision";

export type DataServiceStatus = { connected: boolean; error?: string | null };
export type InitialRevisionTarget = {
  notebookId: string | null;
  workflowSessionId: string | null;
  goal: RevisionSessionGoal | null;
};

export type RevisionSessionGoal =
  { type: "time"; durationMs: number } | { type: "cards"; cardCount: number };

export type RevisionSessionResult = {
  sequence: number;
  notebookId: string;
  cardId: string;
  question: string;
  expectedAnswer: string;
  answer: RevisionRating;
  correct: boolean;
  answeredAt: number;
};

export type RevisionSession = {
  id: string;
  origin: "workflow" | "standalone";
  workflowId: string | null;
  nodeId: string | null;
  notebookId: string | null;
  goal: RevisionSessionGoal;
  elapsedMs: number;
  status: "idle" | "running" | "paused" | "completed" | "cancelled";
  totalCards: number;
  remainingCards: number;
  reviewedCount: number;
  rightCount: number;
  wrongCount: number;
  startedAt: number | null;
  createdAt: number;
  updatedAt: number;
  results: RevisionSessionResult[];
};

export type RevisionDeckSummary = {
  notebookId: string;
  title: string;
  project: string;
  totalCount: number;
  dueCount: number;
  newCount: number;
};

export type RevisionSessionRun = {
  session: RevisionSession;
  cards: RevisionCard[];
};
export type RevisionDashboardPoint = {
  bucketStart: number;
  reviews: number;
  learned: number;
  correct: number;
  reviewTimeMs: number;
};
export type RevisionActivityDay = { localDate: string; reviews: number };
export type RevisionForecastPoint = { bucketStart: number; dueCards: number };
export type RevisionIntervalBucket = { label: string; cards: number };
export type RevisionDeckProgress = {
  notebookId: string;
  title: string;
  totalCards: number;
  learnedCards: number;
  dueCards: number;
};
export type RevisionDashboard = {
  totalReviews: number;
  activeDays: number;
  learnedCards: number;
  cumulativeLearnedCards: number;
  correctReviews: number;
  reviewTimeMs: number;
  points: RevisionDashboardPoint[];
  activity: RevisionActivityDay[];
  forecast: RevisionForecastPoint[];
  intervals: RevisionIntervalBucket[];
  decks: RevisionDeckProgress[];
};

export type RevisionDashboardQuery = {
  notebookId: string | null;
  startAt: number;
  endAt: number;
  bucket: "day" | "week" | "month";
  utcOffsetMinutes: number;
};

export type RevisionSessionReviewResult = {
  schedule: RevisionScheduleResult;
  session: RevisionSession;
};

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

class RevisionDataSource {
  async status(): Promise<DataServiceStatus> {
    if (!isTauriRuntime())
      return {
        connected: false,
        error: "Revise connects to the local data service in the desktop app.",
      };
    return invoke<DataServiceStatus>("data_service_status");
  }

  async initialTarget(): Promise<InitialRevisionTarget> {
    if (!isTauriRuntime())
      return { notebookId: null, workflowSessionId: null, goal: null };
    return invoke<InitialRevisionTarget>("initial_revision_target");
  }

  async takePendingStandaloneSession(): Promise<string | null> {
    if (!isTauriRuntime()) return null;
    return invoke<string | null>("take_pending_standalone_session");
  }

  async cards(notebookId?: string, dueOnly = false): Promise<RevisionCard[]> {
    if (!isTauriRuntime()) return [];
    return invoke<RevisionCard[]>("list_revision_cards", {
      query: { notebookId: notebookId ?? null, dueOnly },
    });
  }

  async decks(): Promise<RevisionDeckSummary[]> {
    if (!isTauriRuntime()) return [];
    return invoke<RevisionDeckSummary[]>("list_revision_decks");
  }

  async dashboard(query: RevisionDashboardQuery): Promise<RevisionDashboard> {
    return invoke<RevisionDashboard>("get_revision_dashboard", { query });
  }

  async review(
    card: RevisionCard,
    rating: RevisionRating,
  ): Promise<RevisionScheduleResult> {
    return invoke<RevisionScheduleResult>("review_revision_card", {
      input: {
        notebookId: card.notebookId,
        cardId: card.cardId,
        rating,
        expectedLastReviewAt: card.lastReviewAt,
      },
    });
  }

  async reviewSessionCard(input: {
    sessionId: string;
    card: RevisionCard;
    rating: RevisionRating;
    question: string;
    expectedAnswer: string;
  }): Promise<RevisionSessionReviewResult> {
    return invoke<RevisionSessionReviewResult>("review_revision_session_card", {
      input: {
        sessionId: input.sessionId,
        notebookId: input.card.notebookId,
        cardId: input.card.cardId,
        rating: input.rating,
        expectedLastReviewAt: input.card.lastReviewAt,
        question: input.question,
        expectedAnswer: input.expectedAnswer,
      },
    });
  }

  async openSource(card: RevisionCard): Promise<void> {
    await invoke("open_notes_source", {
      notebookId: card.notebookId,
      objectId: card.sources[0]?.objectId ?? card.cardId,
    });
  }

  async session(id: string): Promise<RevisionSession | null> {
    if (!isTauriRuntime()) return null;
    return invoke("get_revision_session", { id });
  }

  async sessionRun(id: string): Promise<RevisionSessionRun> {
    return invoke<RevisionSessionRun>("get_revision_session_run", { id });
  }

  async activeStandaloneSession(): Promise<RevisionSession | null> {
    return invoke<RevisionSession | null>(
      "get_active_standalone_revision_session",
    );
  }

  async startStandaloneSession(
    notebookId?: string,
  ): Promise<RevisionSessionRun> {
    return invoke<RevisionSessionRun>("start_standalone_revision_session", {
      notebookId: notebookId ?? null,
    });
  }

  async initializeSession(
    id: string,
    totalCards: number,
    remainingCards: number,
  ): Promise<RevisionSession> {
    return invoke("initialize_revision_session", {
      input: { id, totalCards, remainingCards },
    });
  }

  async setSessionStatus(
    id: string,
    status: "running" | "paused" | "cancelled",
  ): Promise<RevisionSession> {
    return invoke("set_revision_session_status", { input: { id, status } });
  }

  async saveSession(session: RevisionSession): Promise<RevisionSession> {
    return invoke("save_revision_session", {
      input: {
        id: session.id,
        origin: session.origin,
        workflowId: session.workflowId,
        nodeId: session.nodeId,
        notebookId: session.notebookId,
        goal: session.goal,
        elapsedMs: session.elapsedMs,
        status: session.status,
        totalCards: session.totalCards,
        remainingCards: session.remainingCards,
        reviewedCount: session.reviewedCount,
        rightCount: session.rightCount,
        wrongCount: session.wrongCount,
        startedAt: session.startedAt,
      },
    });
  }
}

export const revisionData = new RevisionDataSource();
