import { app, globalShortcut, ipcMain, shell } from "electron";

import { Poller } from "./poller";
import { getConfig, getMutedPrIds, toggleMutedPr, updateConfig } from "./store";
import {
  applyWindowPreferences,
  resizeWindowHeight,
  restoreExpandedBounds,
  createMainWindow,
  createTray,
  toggleWindowVisibility,
} from "./window";
import type { WidgetConfig } from "../shared/types";

const TOGGLE_SHORTCUT = "CommandOrControl+Alt+G";
const APP_USER_MODEL_ID = "com.vasilisnakos.prpulse";

const poller = new Poller();

let mainWindow: Electron.BrowserWindow | null = null;
let tray: Electron.Tray | null = null;
let expandedBoundsBeforeCompact: Electron.Rectangle | null = null;

function broadcast(channel: string, payload?: unknown): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function normalizeConfigPatch(patch: Partial<WidgetConfig>): Partial<WidgetConfig> {
  return {
    ...patch,
    launchAtLogin: typeof patch.launchAtLogin === "boolean" ? patch.launchAtLogin : undefined,
    pollIntervalSec:
      typeof patch.pollIntervalSec === "number"
        ? Math.max(15, Math.min(3600, Math.round(patch.pollIntervalSec)))
        : undefined,
    opacity:
      typeof patch.opacity === "number" ? Math.max(0.45, Math.min(1, patch.opacity)) : undefined,
  };
}

function applyLaunchAtLogin(config: WidgetConfig): void {
  app.setLoginItemSettings({
    openAtLogin: config.launchAtLogin,
    openAsHidden: true,
    args: ["--hidden"],
  });
}

async function bootstrap(): Promise<void> {
  if (process.platform === "win32") {
    app.setAppUserModelId(APP_USER_MODEL_ID);
  }

  const config = getConfig();
  applyLaunchAtLogin(config);
  const launchedHidden = app.getLoginItemSettings().wasOpenedAtLogin || process.argv.includes("--hidden");

  mainWindow = createMainWindow(launchedHidden);
  tray = createTray(mainWindow, {
    onRefresh: () => {
      void poller.refresh();
    },
    onOpenSettings: () => {
      mainWindow?.show();
      broadcast("widget:open-settings");
    },
    onQuit: () => {
      app.quit();
    },
  });

  poller.subscribe((state) => {
    broadcast("widget:state", state);
  });
  poller.start();

  ipcMain.handle("widget:get-state", () => poller.getState());
  ipcMain.handle("widget:get-config", () => getConfig());
  ipcMain.handle("widget:get-muted", () => getMutedPrIds());
  ipcMain.handle("widget:refresh", async () => {
    return poller.refresh();
  });
  ipcMain.handle("widget:set-config", async (_event, patch: Partial<WidgetConfig>) => {
    const previous = getConfig();
    if (mainWindow && !previous.compactMode && patch.compactMode === true) {
      expandedBoundsBeforeCompact = mainWindow.getBounds();
    }

    const next = updateConfig(normalizeConfigPatch(patch));
    applyLaunchAtLogin(next);
    if (mainWindow) {
      applyWindowPreferences(mainWindow);
      if (!next.compactMode && previous.compactMode) {
        if (expandedBoundsBeforeCompact) {
          restoreExpandedBounds(mainWindow, expandedBoundsBeforeCompact);
        }
        expandedBoundsBeforeCompact = null;
      }
    }
    broadcast("widget:config", next);
    poller.start();
    return next;
  });
  ipcMain.handle("widget:open-pr", async (_event, url: string) => {
    await shell.openExternal(url);
  });
  ipcMain.handle("widget:set-muted", async (_event, payload: { id: number; muted: boolean }) => {
    const mutedIds = toggleMutedPr(payload.id, payload.muted);
    broadcast("widget:muted", mutedIds);
    await poller.refresh();
    return mutedIds;
  });
  ipcMain.handle("widget:open-settings", () => {
    mainWindow?.show();
    broadcast("widget:open-settings");
  });
  ipcMain.handle("widget:hide", () => {
    mainWindow?.hide();
  });
  ipcMain.handle("widget:toggle", () => {
    if (mainWindow) {
      toggleWindowVisibility(mainWindow);
    }
  });
  ipcMain.handle("widget:set-content-height", async (_event, nextHeight: number) => {
    if (!mainWindow || !getConfig().compactMode) {
      return;
    }

    resizeWindowHeight(mainWindow, nextHeight);
  });

  globalShortcut.register(TOGGLE_SHORTCUT, () => {
    if (mainWindow) {
      toggleWindowVisibility(mainWindow);
    }
  });
}

app.whenReady().then(() => {
  void bootstrap();
});

app.on("activate", () => {
  if (!mainWindow) {
    void bootstrap();
    return;
  }

  mainWindow.show();
});

app.on("before-quit", () => {
  poller.stop();
  tray?.destroy();
  globalShortcut.unregisterAll();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});
