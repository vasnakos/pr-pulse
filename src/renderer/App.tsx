import { useEffect, useMemo, useState, type MouseEvent } from "react";

import { ContextMenu } from "./components/ContextMenu";
import { Header } from "./components/Header";
import { PRSection } from "./components/PRSection";
import { SettingsPanel } from "./components/SettingsPanel";
import { widgetApi } from "./lib/api";
import type { PullRequestItem, WidgetConfig, WidgetState } from "../shared/types";

const initialState: WidgetState = {
  status: {
    state: "loading",
    message: "Booting widget...",
    lastPolledAt: null,
  },
  items: {
    assigned: [],
    reviewRequested: [],
    mine: [],
    muted: [],
  },
};

const initialConfig: WidgetConfig = {
  githubToken: "",
  launchAtLogin: true,
  pollIntervalSec: 60,
  compactMode: false,
  notifications: {
    assignments: true,
    comments: true,
    approvals: true,
    stateChanges: true,
    pushes: true,
  },
  windowMode: "normal",
  opacity: 0.94,
};

export default function App() {
  const [state, setState] = useState<WidgetState>(initialState);
  const [config, setConfig] = useState<WidgetConfig>(initialConfig);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [mutedIds, setMutedIds] = useState<Set<number>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    item: PullRequestItem;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    void Promise.all([widgetApi.getState(), widgetApi.getConfig(), widgetApi.getMuted()]).then(
      ([nextState, nextConfig, nextMutedIds]) => {
        setState(nextState);
        setConfig(nextConfig);
        setMutedIds(new Set(nextMutedIds));
        if (!nextConfig.githubToken.trim()) {
          setSettingsOpen(true);
        }
      },
    );

    const unsubscribeState = widgetApi.onStateChange((nextState) => {
      setState(nextState);
      if (nextState.status.state === "needs_auth") {
        setSettingsOpen(true);
      }
    });
    const unsubscribeConfig = widgetApi.onConfigChange((nextConfig) => {
      setConfig(nextConfig);
    });
    const unsubscribeMuted = widgetApi.onMutedChange((nextMutedIds) => {
      setMutedIds(new Set(nextMutedIds));
    });
    const unsubscribeOpenSettings = widgetApi.onOpenSettings(() => setSettingsOpen(true));

    return () => {
      unsubscribeState();
      unsubscribeConfig();
      unsubscribeMuted();
      unsubscribeOpenSettings();
    };
  }, []);

  useEffect(() => {
    if (!config.compactMode) {
      return;
    }

    let frame = 0;

    const syncCompactHeight = () => {
      frame = 0;
      const appShell = document.querySelector(".app-shell") as HTMLElement | null;
      const compactPanel = document.querySelector(".panel.is-compact") as HTMLElement | null;
      const settingsPanel = document.querySelector(".settings-panel.is-open") as HTMLElement | null;

      if (!appShell || !compactPanel) {
        return;
      }

      const shellHeight = Math.ceil(appShell.getBoundingClientRect().height);
      const panelHeight = Math.ceil(compactPanel.getBoundingClientRect().height + 24);
      const settingsHeight = settingsPanel
        ? Math.ceil(settingsPanel.getBoundingClientRect().height + 24)
        : 0;
      const targetHeight = Math.max(shellHeight, panelHeight, settingsHeight);

      void widgetApi.setContentHeight(targetHeight);
    };

    const scheduleSync = () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(syncCompactHeight);
    };

    const observer = new ResizeObserver(() => {
      scheduleSync();
    });

    const appShell = document.querySelector(".app-shell");
    const compactPanel = document.querySelector(".panel.is-compact");
    const settingsPanel = document.querySelector(".settings-panel");

    if (appShell) {
      observer.observe(appShell);
    }
    if (compactPanel) {
      observer.observe(compactPanel);
    }
    if (settingsPanel) {
      observer.observe(settingsPanel);
    }

    scheduleSync();
    window.addEventListener("resize", scheduleSync);

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      observer.disconnect();
      window.removeEventListener("resize", scheduleSync);
    };
  }, [config.compactMode, settingsOpen, state]);

  const totalCount = useMemo(() => {
    return (
      state.items.assigned.length +
      state.items.reviewRequested.length +
      state.items.mine.length +
      state.items.muted.length
    );
  }, [state.items]);

  const approvedByMeItems = useMemo(() => {
    const unique = new Map<number, (typeof state.items.assigned)[number]>();
    [
      ...state.items.reviewRequested,
      ...state.items.assigned,
      ...state.items.mine,
      ...state.items.muted,
    ].forEach((item) => {
      if (item.approvedByMe) {
        unique.set(item.id, item);
      }
    });
    return [...unique.values()].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [state.items]);

  const handleSaveConfig = async (nextConfig: WidgetConfig) => {
    setSaving(true);
    try {
      const saved = await widgetApi.setConfig(nextConfig);
      setConfig(saved);
      setSettingsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleContextMenu = (item: PullRequestItem, event: MouseEvent<HTMLButtonElement>) => {
    setContextMenu({
      item,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleToggleMute = async (item: PullRequestItem) => {
    await widgetApi.setMuted({
      id: item.id,
      muted: !mutedIds.has(item.id),
    });
  };

  const handleExitCompactMode = async () => {
    const saved = await widgetApi.setConfig({ compactMode: false });
    setConfig(saved);
  };

  return (
    <div className={`app-shell ${config.compactMode ? "is-compact" : ""}`}>
      <div className={`panel ${config.compactMode ? "is-compact" : ""}`}>
        <Header
          status={state.status}
          isRefreshing={state.status.state === "loading"}
          compact={config.compactMode}
          onExitCompact={handleExitCompactMode}
          onRefresh={() => {
            void widgetApi.refresh();
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onHide={() => {
            void widgetApi.hide();
          }}
        />

        {state.status.state === "needs_auth" ? (
          <button className="warning-banner" onClick={() => setSettingsOpen(true)} type="button">
            ! no token - open settings
          </button>
        ) : null}

        <div className="body">
          {!config.compactMode ? (
            <>
              <div className="meta-bar">
                <span>tracked items: {totalCount}</span>
                <span>
                  last poll: {state.status.lastPolledAt ? new Date(state.status.lastPolledAt).toLocaleTimeString() : "--"}
                </span>
                <button
                  className={`chrome-button meta-button ${approvedOnly ? "accent" : ""}`}
                  type="button"
                  onClick={() => setApprovedOnly((current) => !current)}
                >
                  {approvedOnly ? "approved-only: on" : "approved-only: off"}
                </button>
              </div>

              <PRSection
                bucket="reviewRequested"
                sectionKey="approved-by-me"
                title="approved by me"
                items={approvedByMeItems}
                onContextMenu={handleContextMenu}
                onOpen={(url) => {
                  void widgetApi.openPR(url);
                }}
              />
            </>
          ) : null}

          {!approvedOnly || config.compactMode ? (
            <>
              <PRSection
                bucket="reviewRequested"
                items={state.items.reviewRequested}
                onContextMenu={handleContextMenu}
                onOpen={(url) => {
                  void widgetApi.openPR(url);
                }}
              />
              <PRSection
                bucket="assigned"
                items={state.items.assigned}
                onContextMenu={handleContextMenu}
                onOpen={(url) => {
                  void widgetApi.openPR(url);
                }}
              />
              <PRSection
                bucket="mine"
                items={state.items.mine}
                onContextMenu={handleContextMenu}
                onOpen={(url) => {
                  void widgetApi.openPR(url);
                }}
              />
            </>
          ) : null}

          {!config.compactMode ? (
            <PRSection
              bucket="muted"
              collapsible
              defaultExpanded={false}
              items={state.items.muted}
              onContextMenu={handleContextMenu}
              onOpen={(url) => {
                void widgetApi.openPR(url);
              }}
            />
          ) : null}
        </div>
      </div>

      <SettingsPanel
        config={config}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveConfig}
        isSaving={saving}
      />

      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          label={mutedIds.has(contextMenu.item.id) ? "unmute PR" : "mute PR"}
          onClose={() => setContextMenu(null)}
          onSelect={() => {
            void handleToggleMute(contextMenu.item);
          }}
        />
      ) : null}
    </div>
  );
}
