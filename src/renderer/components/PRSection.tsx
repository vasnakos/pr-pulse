import { useState, type MouseEvent } from "react";

import type { PullRequestItem } from "../../shared/types";
import { sectionTitle } from "../lib/format";
import { PRItem } from "./PRItem";

interface PRSectionProps {
  bucket: PullRequestItem["bucket"];
  items: PullRequestItem[];
  onOpen: (url: string) => void;
  title?: string;
  sectionKey?: string;
  onContextMenu?: (item: PullRequestItem, event: MouseEvent<HTMLButtonElement>) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function PRSection({
  bucket,
  items,
  onOpen,
  title,
  sectionKey,
  onContextMenu,
  collapsible = false,
  defaultExpanded = true,
}: PRSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const label = title ?? sectionTitle(bucket);

  return (
    <section className={`section ${bucket === "muted" ? "is-muted" : ""}`}>
      {collapsible ? (
        <button
          className="section-title is-collapsible"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          <span className="section-caret">{isExpanded ? "▾" : "▸"}</span>
          <span>
            --- {label}
            {typeof items.length === "number" ? ` (${items.length})` : ""}
            {" ---"}
          </span>
        </button>
      ) : (
        <div className="section-title">--- {label} ---</div>
      )}
      {(!collapsible || isExpanded) && items.length ? (
        <div className="section-list">
          {items.map((item) => (
            <PRItem
              key={`${sectionKey ?? bucket}-${item.id}`}
              item={item}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      ) : !collapsible || isExpanded ? (
        <div className="empty-line">no active PRs in this lane</div>
      ) : null}
    </section>
  );
}
