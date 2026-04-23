import type { PullRequestItem } from "../../shared/types";
import { formatRelativeTime, reviewGlyph } from "../lib/format";

interface PRItemProps {
  item: PullRequestItem;
  onOpen: (url: string) => void;
}

export function PRItem({ item, onOpen }: PRItemProps) {
  return (
    <button className="pr-item" onClick={() => onOpen(item.url)} type="button">
      <div className="pr-row">
        <span className={`state-glyph state-${item.lastReviewState.toLowerCase()}`}>
          {reviewGlyph(item.lastReviewState)}
        </span>
        <span className="pr-number">#{item.number}</span>
        <span className="pr-repo">{item.repoFullName}</span>
        {item.draft ? <span className="pill">draft</span> : null}
        {item.approvedByMe ? <span className="pill approved-by-me">approved by me</span> : null}
      </div>
      <div className="pr-title">"{item.title}"</div>
      <div className="pr-meta">
        <span>
          +{item.additions ?? 0}/-{item.deletions ?? 0}
        </span>
        <span>
          c:{item.commentCount + item.reviewCommentCount}
        </span>
        <span>{formatRelativeTime(item.updatedAt)}</span>
        <span className={`pill ${item.state}`}>{item.state}</span>
      </div>
    </button>
  );
}
