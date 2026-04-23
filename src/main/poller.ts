import { Notification, shell } from "electron";

import { fetchWidgetState, normalizeError } from "./github";
import { getConfig } from "./store";
import type { PullRequestItem, StateSnapshot, WidgetState } from "../shared/types";

type StateListener = (state: WidgetState) => void;

const emptyState: WidgetState = {
  status: {
    state: "needs_auth",
    message: "No token configured. Open settings to start syncing.",
    lastPolledAt: null,
  },
  items: {
    assigned: [],
    reviewRequested: [],
    mine: [],
  },
};

export class Poller {
  private readonly listeners = new Set<StateListener>();
  private intervalId: NodeJS.Timeout | null = null;
  private state: WidgetState = emptyState;
  private snapshot = new Map<number, StateSnapshot>();
  private initialized = false;

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): WidgetState {
    return this.state;
  }

  start(): void {
    this.stop();
    void this.refresh();

    const pollIntervalMs = Math.max(getConfig().pollIntervalSec, 15) * 1000;
    this.intervalId = setInterval(() => {
      void this.refresh();
    }, pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async refresh(): Promise<WidgetState> {
    const config = getConfig();
    if (!config.githubToken.trim()) {
      this.snapshot.clear();
      this.initialized = false;
      this.updateState(emptyState);
      return this.state;
    }

    this.updateState({
      ...this.state,
      status: {
        ...this.state.status,
        state: "loading",
        message: "Polling GitHub...",
      },
    });

    try {
      const result = await fetchWidgetState(config.githubToken);
      if (this.initialized) {
        this.emitNotifications(this.snapshot, result.snapshot, result.state);
      }

      this.snapshot = result.snapshot;
      this.initialized = true;
      this.updateState(result.state);
      return this.state;
    } catch (error) {
      const normalized = normalizeError(error);
      this.updateState({
        ...this.state,
        status: {
          state: normalized.state,
          message: normalized.message,
          lastPolledAt: this.state.status.lastPolledAt,
          retryAfterSec: normalized.retryAfterSec,
        },
      });
      return this.state;
    }
  }

  private updateState(state: WidgetState): void {
    this.state = state;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private emitNotifications(
    previous: Map<number, StateSnapshot>,
    next: Map<number, StateSnapshot>,
    nextState: WidgetState,
  ): void {
    const config = getConfig();
    const byId = this.flattenItems(nextState.items);

    byId.forEach((item, id) => {
      const prev = previous.get(id);
      const current = next.get(id);

      if (!current) {
        return;
      }

      if (!prev && config.notifications.assignments) {
        this.notify("New PR for you", `${item.repoFullName} #${item.number} ${item.title}`, item.url);
        return;
      }

      if (!prev) {
        return;
      }

      if (
        config.notifications.comments &&
        item.bucket === "mine" &&
        current.commentCount + current.reviewCommentCount >
          prev.commentCount + prev.reviewCommentCount
      ) {
        this.notify(
          "New comments on your PR",
          `${item.repoFullName} #${item.number} now has more discussion.`,
          item.url,
        );
      }

      if (
        config.notifications.approvals &&
        prev.lastReviewState !== "APPROVED" &&
        current.lastReviewState === "APPROVED"
      ) {
        this.notify(
          "PR approved",
          `${item.repoFullName} #${item.number} was approved.`,
          item.url,
        );
      }

      if (
        config.notifications.stateChanges &&
        prev.lastReviewState !== "CHANGES_REQUESTED" &&
        current.lastReviewState === "CHANGES_REQUESTED"
      ) {
        this.notify(
          "Changes requested",
          `${item.repoFullName} #${item.number} needs updates.`,
          item.url,
        );
      }

      if (config.notifications.stateChanges && prev.state !== current.state) {
        const noun = current.state === "merged" ? "merged" : "closed";
        this.notify(
          `PR ${noun}`,
          `${item.repoFullName} #${item.number} was ${noun}.`,
          item.url,
        );
      }
    });
  }

  private flattenItems(items: WidgetState["items"]): Map<number, PullRequestItem> {
    const map = new Map<number, PullRequestItem>();
    [...items.reviewRequested, ...items.assigned, ...items.mine].forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }

  private notify(title: string, body: string, url: string): void {
    const notification = new Notification({
      title,
      body,
      silent: false,
    });
    notification.on("click", () => {
      void shell.openExternal(url);
    });
    notification.show();
  }
}
