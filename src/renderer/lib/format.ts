import type { PullRequestItem, ReviewState, WidgetStatus } from "../../shared/types";

export function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export function formatStatus(status: WidgetStatus): string {
  if (status.state === "rate_limited" && status.retryAfterSec) {
    return `! rate-limited, retry in ${status.retryAfterSec}s`;
  }

  return status.message;
}

export function reviewGlyph(state: ReviewState): string {
  switch (state) {
    case "APPROVED":
      return "✓";
    case "CHANGES_REQUESTED":
      return "!";
    case "COMMENTED":
      return "●";
    case "PENDING":
      return "…";
    default:
      return "◉";
  }
}

export function sectionTitle(bucket: PullRequestItem["bucket"]): string {
  switch (bucket) {
    case "assigned":
      return "assigned to me";
    case "reviewRequested":
      return "review requested";
    case "mine":
      return "my prs";
    default:
      return "prs";
  }
}
