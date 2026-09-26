import { ReviewWindow } from "@/features/review/review-window";
import { StandaloneWorkspace } from "@/features/workspace/standalone-workspace";

export function App() {
  const sessionId = new URLSearchParams(window.location.search).get(
    "sessionId",
  );
  return sessionId ? (
    <ReviewWindow sessionId={sessionId} />
  ) : (
    <StandaloneWorkspace />
  );
}
