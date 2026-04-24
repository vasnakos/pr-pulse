import Store from "electron-store";

import type { WidgetConfig, WindowMode } from "../shared/types";

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

interface PersistedSchema {
  config: WidgetConfig;
  windowBounds: WindowBounds;
  mutedPrIds: number[];
}

const defaultConfig: WidgetConfig = {
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

const defaultBounds: WindowBounds = {
  width: 480,
  height: 700,
};

const store = new Store<PersistedSchema>({
  defaults: {
    config: defaultConfig,
    windowBounds: defaultBounds,
    mutedPrIds: [],
  },
});

type LegacyConfig = Partial<WidgetConfig> & {
  alwaysOnTop?: boolean;
  pinToDesktop?: boolean;
};

function migrate(raw: LegacyConfig): WidgetConfig {
  let windowMode: WindowMode = raw.windowMode ?? "normal";
  if (!raw.windowMode) {
    // Old installs stored two independent booleans; map to the new tri-state.
    if (raw.pinToDesktop) {
      windowMode = "desktop";
    } else if (raw.alwaysOnTop) {
      windowMode = "floating";
    }
  }

  return {
    ...defaultConfig,
    ...raw,
    notifications: {
      ...defaultConfig.notifications,
      ...raw.notifications,
    },
    windowMode,
  };
}

export function getConfig(): WidgetConfig {
  return migrate(store.get("config") as LegacyConfig);
}

export function updateConfig(nextConfig: Partial<WidgetConfig>): WidgetConfig {
  const current = getConfig();
  const merged: WidgetConfig = {
    ...current,
    ...nextConfig,
    notifications: {
      ...current.notifications,
      ...nextConfig.notifications,
    },
  };

  store.set("config", merged);
  return merged;
}

export function getWindowBounds(): WindowBounds {
  return {
    ...defaultBounds,
    ...store.get("windowBounds"),
  };
}

export function setWindowBounds(bounds: WindowBounds): void {
  store.set("windowBounds", bounds);
}

export function getMutedPrIds(): number[] {
  return [...new Set(store.get("mutedPrIds", []))];
}

export function setMutedPrIds(ids: number[]): number[] {
  const uniqueIds = [...new Set(ids)];
  store.set("mutedPrIds", uniqueIds);
  return uniqueIds;
}

export function toggleMutedPr(id: number, muted?: boolean): number[] {
  const next = new Set(getMutedPrIds());
  const shouldMute = muted ?? !next.has(id);

  if (shouldMute) {
    next.add(id);
  } else {
    next.delete(id);
  }

  return setMutedPrIds([...next]);
}
