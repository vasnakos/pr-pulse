import { useEffect, useMemo, useState } from "react";

import { Header } from "./components/Header";
import { PRSection } from "./components/PRSection";
import { SettingsPanel } from "./components/SettingsPanel";
import { widgetApi } from "./lib/api";
import type { WidgetConfig, WidgetState } from "../shared/types";

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
  },
};

const initialConfig: WidgetConfig = {
  githubToken: "",
  launchAtLogin: true,
  pollIntervalSec: 60,
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

  useEffect(() => {
    void Promise.all([widgetApi.getState(), widgetApi.getConfig()]).then(([nextState, nextConfig]) => {
      setState(nextState);
      setConfig(nextConfig);
      if (!nextConfig.githubToken.trim()) {
        setSettingsOpen(true);
      }
    });

    const unsubscribeState = widgetApi.onStateChange((nextState) => {
      setState(nextState);
      if (nextState.status.state === "needs_auth") {
        setSettingsOpen(true);
      }
    });
    const unsubscribeConfig = widgetApi.onConfigChange((nextConfig) => {
      setConfig(nextConfig);
    });
    const unsubscribeOpenSettings = widgetApi.onOpenSettings(() => setSettingsOpen(true));

    return () => {
      unsubscribeState();
      unsubscribeConfig();
      unsubscribeOpenSettings();
    };
  }, []);

  const totalCount = useMemo(() => {
    return (
      state.items.assigned.length + state.items.reviewRequested.length + state.items.mine.length
    );
  }, [state.items]);

  const approvedByMeItems = useMemo(() => {
    const unique = new Map<number, (typeof state.items.assigned)[number]>();
    [...state.items.reviewRequested, ...state.items.assigned, ...state.items.mine].forEach((item) => {
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

  return (
    <div className="app-shell">
      <div className="panel">
        <Header
          status={state.status}
          isRefreshing={state.status.state === "loading"}
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
            onOpen={(url) => {
              void widgetApi.openPR(url);
            }}
          />

          {!approvedOnly ? (
            <>
          <PRSection
            bucket="reviewRequested"
            items={state.items.reviewRequested}
            onOpen={(url) => {
              void widgetApi.openPR(url);
            }}
          />
          <PRSection
            bucket="assigned"
            items={state.items.assigned}
            onOpen={(url) => {
              void widgetApi.openPR(url);
            }}
          />
          <PRSection
            bucket="mine"
            items={state.items.mine}
            onOpen={(url) => {
              void widgetApi.openPR(url);
            }}
          />
            </>
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
    </div>
  );
}
