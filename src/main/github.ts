import { Octokit } from "@octokit/rest";

import type {
  PullRequestItem,
  ReviewState,
  StateSnapshot,
  WidgetState,
} from "../shared/types";

type CacheEntry<T> = {
  etag?: string;
  data: T;
};

type SearchIssueItem = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  updated_at: string;
  user: {
    login: string;
  } | null;
  repository_url: string;
  labels?: Array<{ name?: string }>;
};

const requestCache = new Map<string, CacheEntry<unknown>>();

function createOctokit(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: "pr-pulse",
  });
}

async function cachedRequest<T>(
  octokit: Octokit,
  key: string,
  route: string,
  parameters: Record<string, unknown>,
): Promise<T> {
  const cached = requestCache.get(key) as CacheEntry<T> | undefined;
  const headers = cached?.etag ? { "If-None-Match": cached.etag } : undefined;

  try {
    const response = await octokit.request(route, {
      ...parameters,
      headers,
    });
    const etag = response.headers.etag;
    const entry: CacheEntry<T> = {
      data: response.data as T,
      etag: typeof etag === "string" ? etag : undefined,
    };
    requestCache.set(key, entry);
    return entry.data;
  } catch (error) {
    const maybeStatus = error as { status?: number };
    if (maybeStatus.status === 304 && cached) {
      return cached.data;
    }
    throw error;
  }
}

function parseRepo(repositoryUrl: string): { owner: string; repo: string } {
  const parts = repositoryUrl.split("/");
  return {
    owner: parts[parts.length - 2],
    repo: parts[parts.length - 1],
  };
}

function normalizeReviewState(state?: string): ReviewState {
  switch (state) {
    case "APPROVED":
      return "APPROVED";
    case "CHANGES_REQUESTED":
      return "CHANGES_REQUESTED";
    case "COMMENTED":
      return "COMMENTED";
    case "PENDING":
      return "PENDING";
    default:
      return "NONE";
  }
}

async function fetchSearchItems(
  octokit: Octokit,
  bucket: PullRequestItem["bucket"],
  query: string,
): Promise<SearchIssueItem[]> {
  const response = await cachedRequest<{ items: SearchIssueItem[] }>(
    octokit,
    `search:${query}`,
    "GET /search/issues",
    {
      q: query,
      per_page: 25,
      sort: "updated",
      order: "desc",
    },
  );

  return response.items.map((item) => ({ ...item, bucket })) as SearchIssueItem[];
}

async function fetchDetails(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  viewerLogin: string,
): Promise<{
  additions: number;
  deletions: number;
  draft: boolean;
  state: "open" | "closed";
  mergedAt: string | null;
  headSha: string;
  commitCount: number;
  issueCommentCount: number;
  reviewCommentCount: number;
  lastReviewState: ReviewState;
  approvedByMe: boolean;
}> {
  const [pull, issueComments, reviewComments, reviews] = await Promise.all([
    cachedRequest<{
      additions: number;
      deletions: number;
      draft: boolean;
      state: "open" | "closed";
      merged_at: string | null;
      head: { sha: string };
      commits: number;
    }>(
      octokit,
      `pull:${owner}/${repo}#${pullNumber}`,
      "GET /repos/{owner}/{repo}/pulls/{pull_number}",
      {
        owner,
        repo,
        pull_number: pullNumber,
      },
    ),
    cachedRequest<Array<{ id: number }>>(
      octokit,
      `issue-comments:${owner}/${repo}#${pullNumber}`,
      "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo,
        issue_number: pullNumber,
        per_page: 100,
      },
    ),
    cachedRequest<Array<{ id: number }>>(
      octokit,
      `review-comments:${owner}/${repo}#${pullNumber}`,
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
      {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      },
    ),
    cachedRequest<Array<{ id: number; state?: string; submitted_at?: string; user?: { login?: string } }>>(
      octokit,
      `reviews:${owner}/${repo}#${pullNumber}`,
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
      {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      },
    ),
  ]);

  const submittedReviews = reviews
    .filter((review) => !!review.submitted_at)
    .sort((a, b) => {
      return new Date(a.submitted_at ?? 0).getTime() - new Date(b.submitted_at ?? 0).getTime();
    });
  const latestReview = submittedReviews.at(-1);
  const latestMyReview = submittedReviews.filter((review) => review.user?.login === viewerLogin).at(-1);

  return {
    additions: pull.additions,
    deletions: pull.deletions,
    draft: pull.draft,
    state: pull.state,
    mergedAt: pull.merged_at,
    headSha: pull.head.sha,
    commitCount: pull.commits,
    issueCommentCount: issueComments.length,
    reviewCommentCount: reviewComments.length,
    lastReviewState: normalizeReviewState(latestReview?.state),
    approvedByMe: normalizeReviewState(latestMyReview?.state) === "APPROVED",
  };
}

export function normalizeError(error: unknown): {
  state: WidgetState["status"]["state"];
  message: string;
  retryAfterSec?: number;
} {
  const maybeError = error as {
    status?: number;
    message?: string;
    response?: {
      headers?: Record<string, string>;
      data?: { message?: string };
    };
  };

  if (maybeError.status === 401) {
    return {
      state: "needs_auth",
      message: "401 from GitHub. Check your personal access token.",
    };
  }

  if (maybeError.status === 403) {
    const retryAfter = maybeError.response?.headers?.["x-ratelimit-reset"];
    const retryAt = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : NaN;
    const retryAfterSec =
      Number.isFinite(retryAt) && retryAt > Date.now()
        ? Math.ceil((retryAt - Date.now()) / 1000)
        : undefined;

    return {
      state: retryAfterSec ? "rate_limited" : "error",
      message:
        maybeError.response?.data?.message ??
        maybeError.message ??
        "GitHub rejected the request.",
      retryAfterSec,
    };
  }

  return {
    state: "error",
    message: maybeError.message ?? "Unexpected GitHub API error.",
  };
}

export async function fetchWidgetState(token: string): Promise<{
  state: WidgetState;
  snapshot: Map<number, StateSnapshot>;
}> {
  const octokit = createOctokit(token);
  const viewer = await cachedRequest<{ login: string }>(octokit, "viewer", "GET /user", {});

  const [assigned, reviewRequested, mine] = await Promise.all([
    fetchSearchItems(octokit, "assigned", "is:open is:pr assignee:@me"),
    fetchSearchItems(octokit, "reviewRequested", "is:open is:pr review-requested:@me"),
    fetchSearchItems(octokit, "mine", "is:open is:pr author:@me"),
  ]);

  const uniqueById = new Map<number, SearchIssueItem>();
  [...assigned, ...reviewRequested, ...mine].forEach((item) => {
    uniqueById.set(item.id, item);
  });

  const detailedItems = new Map<number, PullRequestItem>();
  await Promise.all(
    [...uniqueById.values()].map(async (item) => {
      const { owner, repo } = parseRepo(item.repository_url);
      const details = await fetchDetails(octokit, owner, repo, item.number, viewer.login);

      detailedItems.set(item.id, {
        id: item.id,
        number: item.number,
        bucket: "assigned",
        repoFullName: `${owner}/${repo}`,
        repoOwner: owner,
        repoName: repo,
        title: item.title,
        url: item.html_url,
        author: item.user?.login ?? "unknown",
        updatedAt: item.updated_at,
        additions: details.additions,
        deletions: details.deletions,
        draft: details.draft,
        state: details.mergedAt ? "merged" : details.state,
        commentCount: details.issueCommentCount,
        reviewCommentCount: details.reviewCommentCount,
        lastReviewState: details.lastReviewState,
        approvedByMe: details.approvedByMe,
        headSha: details.headSha,
        commitCount: details.commitCount,
        labels: (item.labels ?? []).map((label) => label.name).filter(Boolean) as string[],
      });
    }),
  );

  const buckets: WidgetState["items"] = {
    assigned: [],
    reviewRequested: [],
    mine: [],
    muted: [],
  };

  const populateBucket = (items: SearchIssueItem[], bucket: PullRequestItem["bucket"]) => {
    items.forEach((item) => {
      const detailed = detailedItems.get(item.id);
      if (!detailed) {
        return;
      }
      buckets[bucket].push({
        ...detailed,
        bucket,
      });
    });
  };

  populateBucket(assigned, "assigned");
  populateBucket(reviewRequested, "reviewRequested");
  populateBucket(mine, "mine");

  const snapshot = new Map<number, StateSnapshot>();
  detailedItems.forEach((item, id) => {
    snapshot.set(id, {
      updatedAt: item.updatedAt,
      state: item.state,
      draft: item.draft,
      commentCount: item.commentCount,
      reviewCommentCount: item.reviewCommentCount,
      lastReviewState: item.lastReviewState,
      headSha: item.headSha,
      commitCount: item.commitCount,
    });
  });

  return {
    state: {
      status: {
        state: "idle",
        message: "Watching GitHub for PR activity.",
        lastPolledAt: new Date().toISOString(),
      },
      items: buckets,
    },
    snapshot,
  };
}
