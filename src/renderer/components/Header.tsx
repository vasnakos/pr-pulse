import type { WidgetStatus } from "../../shared/types";
import { formatStatus } from "../lib/format";

interface HeaderProps {
  status: WidgetStatus;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onHide: () => void;
  onExitCompact?: () => void;
  compact?: boolean;
}

export function Header({
  status,
  isRefreshing,
  onRefresh,
  onOpenSettings,
  onHide,
  onExitCompact,
  compact = false,
}: HeaderProps) {
  if (compact) {
    return (
      <header className="header drag-region is-compact">
        <div className="header-actions no-drag">
          <button
            className="chrome-button chrome-button-icon"
            onClick={onExitCompact}
            type="button"
            aria-label="Expand widget"
            title="Expand widget"
          >
            ⤢
          </button>
          <button
            className="chrome-button chrome-button-icon"
            onClick={onHide}
            type="button"
            aria-label="Hide widget"
            title="Hide (toggle with ⌥⌘G)"
          >
            :q
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="header drag-region">
      <div className="title-block">
        <div className="title-row">
          <span className="prompt">&gt;</span>
          <span className="title">gh-pulse</span>
          <span className={`pulse ${isRefreshing ? "is-active" : ""}`}>[{isRefreshing ? "●●●" : "···"}]</span>
        </div>
        <div className="status-line">
          <span className="caret">{isRefreshing ? "_" : " "}</span>
          <span>{formatStatus(status)}</span>
        </div>
      </div>
      <div className="header-actions no-drag">
        <button className="chrome-button" onClick={onRefresh} type="button">
          refresh
        </button>
        <button className="chrome-button" onClick={onOpenSettings} type="button">
          settings
        </button>
        <button
          className="chrome-button chrome-button-icon"
          onClick={onHide}
          type="button"
          aria-label="Hide widget"
          title="Hide (toggle with ⌥⌘G)"
        >
          :q
        </button>
      </div>
    </header>
  );
}
