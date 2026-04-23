import { useEffect, useMemo, useState } from "react";

import type { WidgetConfig, WindowMode } from "../../shared/types";

const WINDOW_MODE_OPTIONS: ReadonlyArray<{
  id: WindowMode;
  label: string;
  hint: string;
}> = [
  {
    id: "desktop",
    label: "desktop",
    hint: "glued to the desktop, behind app windows (macOS)",
  },
  {
    id: "floating",
    label: "floating",
    hint: "always on top of other windows",
  },
  {
    id: "normal",
    label: "normal",
    hint: "regular window in the z-order",
  },
];

interface SettingsPanelProps {
  config: WidgetConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: WidgetConfig) => void;
  isSaving: boolean;
}

export function SettingsPanel({ config, isOpen, onClose, onSave, isSaving }: SettingsPanelProps) {
  const [draft, setDraft] = useState(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const opacityLabel = useMemo(() => `${Math.round(draft.opacity * 100)}%`, [draft.opacity]);

  return (
    <aside className={`settings-panel ${isOpen ? "is-open" : ""}`}>
      <div className="settings-header">
        <span>settings.cfg</span>
        <button className="chrome-button" onClick={onClose} type="button">
          close
        </button>
      </div>

      <label className="field">
        <span>github pat</span>
        <input
          type="password"
          value={draft.githubToken}
          onChange={(event) => setDraft((current) => ({ ...current, githubToken: event.target.value }))}
          placeholder="ghp_xxxxxxxxx"
        />
      </label>

      <label className="field">
        <span>poll interval (sec)</span>
        <input
          type="number"
          min={15}
          max={3600}
          value={draft.pollIntervalSec}
          onChange={(event) =>
            setDraft((current) => ({ ...current, pollIntervalSec: Number(event.target.value) }))
          }
        />
      </label>

      <label className="field">
        <span>opacity {opacityLabel}</span>
        <input
          type="range"
          min={0.45}
          max={1}
          step={0.01}
          value={draft.opacity}
          onChange={(event) => setDraft((current) => ({ ...current, opacity: Number(event.target.value) }))}
        />
      </label>

      <div className="field-group">
        <span className="group-title">window mode</span>
        <div className="mode-selector" role="radiogroup" aria-label="window mode">
          {WINDOW_MODE_OPTIONS.map((option) => {
            const active = draft.windowMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`mode-option ${active ? "is-active" : ""}`}
                onClick={() =>
                  setDraft((current) => ({ ...current, windowMode: option.id }))
                }
              >
                <span className="mode-label">{option.label}</span>
                <span className="mode-hint">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="field-group">
        <span className="group-title">notifications</span>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={draft.notifications.assignments}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                notifications: {
                  ...current.notifications,
                  assignments: event.target.checked,
                },
              }))
            }
          />
          <span>new assignments / review requests</span>
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={draft.notifications.comments}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                notifications: {
                  ...current.notifications,
                  comments: event.target.checked,
                },
              }))
            }
          />
          <span>new comments on my PRs</span>
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={draft.notifications.approvals}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                notifications: {
                  ...current.notifications,
                  approvals: event.target.checked,
                },
              }))
            }
          />
          <span>approvals</span>
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={draft.notifications.stateChanges}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                notifications: {
                  ...current.notifications,
                  stateChanges: event.target.checked,
                },
              }))
            }
          />
          <span>changes requested / merged / closed</span>
        </label>
      </div>

      <div className="settings-actions">
        <button className="chrome-button" onClick={() => setDraft(config)} type="button">
          reset
        </button>
        <button className="chrome-button accent" onClick={() => onSave(draft)} type="button" disabled={isSaving}>
          {isSaving ? "saving..." : "save"}
        </button>
      </div>

      <div className="settings-note">
        token scopes: <code>repo</code>, <code>read:user</code>
      </div>
    </aside>
  );
}
