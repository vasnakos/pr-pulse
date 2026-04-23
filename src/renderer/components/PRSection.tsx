import type { PullRequestItem } from "../../shared/types";
import { sectionTitle } from "../lib/format";
import { PRItem } from "./PRItem";

interface PRSectionProps {
  bucket: PullRequestItem["bucket"];
  items: PullRequestItem[];
  onOpen: (url: string) => void;
}

export function PRSection({ bucket, items, onOpen }: PRSectionProps) {
  return (
    <section className="section">
      <div className="section-title">--- {sectionTitle(bucket)} ---</div>
      {items.length ? (
        <div className="section-list">
          {items.map((item) => (
            <PRItem key={`${bucket}-${item.id}`} item={item} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="empty-line">no active PRs in this lane</div>
      )}
    </section>
  );
}
