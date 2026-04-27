export type PRBucket = "assigned" | "reviewRequested" | "mine" | "muted";

export type ReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING" | "NONE";

export interface PullRequestItem {
  id: number;
  number: number;
  bucket: PRBucket;
  repoFullName: string;
  repoOwner: string;
  repoName: string;
  title: string;
  url: string;
  author: string;
  updatedAt: string;
  additions?: number;
  deletions?: number;
  draft: boolean;
  state: "open" | "closed" | "merged";
  commentCount: number;
  reviewCommentCount: number;
  lastReviewState: ReviewState;
  approvedByMe: boolean;
  headSha: string;
  commitCount: number;
  labels: string[];
}

export type WindowMode = "desktop" | "floating" | "normal";

export interface WidgetConfig {
  githubToken: string;
  launchAtLogin: boolean;
  pollIntervalSec: number;
  compactMode: boolean;
  notifications: {
    assignments: boolean;
    comments: boolean;
    approvals: boolean;
    stateChanges: boolean;
    pushes: boolean;
  };
  /**
   * How the widget window relates to other windows:
   * - "desktop":  glued to the desktop layer, behind all app windows (macOS only; Windows falls back to non-topmost).
   * - "floating": always on top of other windows.
   * - "normal":   a regular window in the z-order.
   */
  windowMode: WindowMode;
  opacity: number;
}

export interface WidgetStatus {
  state: "idle" | "loading" | "error" | "rate_limited" | "needs_auth";
  message: string;
  lastPolledAt: string | null;
  retryAfterSec?: number;
}

export interface WidgetState {
  status: WidgetStatus;
  items: Record<PRBucket, PullRequestItem[]>;
}

export interface StateSnapshot {
  updatedAt: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  commentCount: number;
  reviewCommentCount: number;
  lastReviewState: ReviewState;
  headSha: string;
  commitCount: number;
}
