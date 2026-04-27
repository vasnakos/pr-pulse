import {
  BrowserWindow,
  Menu,
  Rectangle,
  Tray,
  app,
  nativeImage,
  screen,
  shell,
} from "electron";
import { fileURLToPath } from "node:url";

import { getConfig, getWindowBounds, setWindowBounds } from "./store";

const MIN_WINDOW_WIDTH = 380;
const NORMAL_MIN_HEIGHT = 420;
const COMPACT_MIN_HEIGHT = 120;

const traySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <rect width="16" height="16" rx="3" fill="#0b0f0c" />
  <path d="M3 4h10v2H5v2h6v2H5v2h8v-1" stroke="#00ff9c" stroke-width="1.5" fill="none" stroke-linecap="round" />
</svg>
`;

export interface WindowActions {
  onRefresh: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

function createTrayIcon(): Electron.NativeImage {
  return nativeImage
    .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(traySvg).toString("base64")}`)
    .resize({ width: 16, height: 16 });
}

function persistBounds(window: BrowserWindow): void {
  const bounds = window.getBounds();
  setWindowBounds(bounds);
}

export function getMinimumWindowHeight(compactMode: boolean): number {
  return compactMode ? COMPACT_MIN_HEIGHT : NORMAL_MIN_HEIGHT;
}

export function applyMinimumWindowSize(window: BrowserWindow, compactMode: boolean): void {
  window.setMinimumSize(MIN_WINDOW_WIDTH, getMinimumWindowHeight(compactMode));
}

export function resizeWindowHeight(window: BrowserWindow, nextHeight: number): void {
  const { width, x, y } = window.getBounds();
  const config = getConfig();
  const display = screen.getDisplayMatching(window.getBounds());
  const minHeight = getMinimumWindowHeight(config.compactMode);
  const maxHeight = Math.max(minHeight, display.workArea.height - 32);
  const clampedHeight = Math.max(minHeight, Math.min(maxHeight, Math.ceil(nextHeight)));

  if (window.getBounds().height === clampedHeight) {
    return;
  }

  window.setBounds({ x, y, width, height: clampedHeight }, true);
}

export function restoreExpandedBounds(window: BrowserWindow, bounds: Rectangle): void {
  const current = window.getBounds();
  const restoredHeight = Math.max(bounds.height, NORMAL_MIN_HEIGHT);
  window.setBounds(
    {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: restoredHeight,
    },
    true,
  );

  if (current.width !== bounds.width) {
    window.setSize(bounds.width, restoredHeight, true);
  }
}

export function applyWindowPreferences(window: BrowserWindow): void {
  const config = getConfig();
  window.setOpacity(config.opacity);
  applyMinimumWindowSize(window, config.compactMode);

  if (!config.compactMode && window.getBounds().height < NORMAL_MIN_HEIGHT) {
    resizeWindowHeight(window, NORMAL_MIN_HEIGHT);
  }

  // Three-state window mode:
  //   desktop  — best-effort wallpaper-like mode: behind app windows, visible across spaces.
  //   floating — always on top of other windows.
  //   normal   — regular window behavior in the z-order.
  if (process.platform === "darwin") {
    if (config.windowMode === "floating") {
      window.setAlwaysOnTop(true, "floating");
      window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
    } else if (config.windowMode === "desktop") {
      window.setAlwaysOnTop(false);
      window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
    } else {
      window.setAlwaysOnTop(false);
      window.setVisibleOnAllWorkspaces(false);
    }
  } else if (process.platform === "win32") {
    // Electron does not expose a stable HWND-to-Progman desktop-parent API, so
    // on Windows "desktop" degrades to a non-topmost floating window.
    if (config.windowMode === "floating") {
      window.setAlwaysOnTop(true);
    } else {
      window.setAlwaysOnTop(false);
    }
  } else {
    window.setAlwaysOnTop(config.windowMode === "floating");
  }
}

export function createMainWindow(startHidden = false): BrowserWindow {
  const bounds = getWindowBounds();
  const preloadPath = fileURLToPath(new URL("../preload/index.mjs", import.meta.url));
  const rendererPath = fileURLToPath(new URL("../renderer/index.html", import.meta.url));
  const window = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: getMinimumWindowHeight(getConfig().compactMode),
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    skipTaskbar: true,
    show: false,
    title: "PR Pulse",
    backgroundColor: "#00000000",
    acceptFirstMouse: true,
    ...(process.platform === "darwin"
      ? {
          vibrancy: "under-window" as const,
          visualEffectState: "active" as const,
        }
      : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.on("move", () => persistBounds(window));
  window.on("resize", () => persistBounds(window));
  window.once("ready-to-show", () => {
    applyWindowPreferences(window);
    if (!startHidden) {
      window.showInactive();
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    void window.loadURL(rendererUrl);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    void window.loadFile(rendererPath);
  }

  return window;
}

export function toggleWindowVisibility(window: BrowserWindow): void {
  if (window.isVisible() && window.isFocused()) {
    window.hide();
  } else if (window.isVisible()) {
    // Already on screen but sitting behind other apps (e.g. desktop mode).
    // Surface it to the user so the shortcut feels responsive.
    window.showInactive();
    window.focus();
  } else {
    window.show();
  }
}

function describeMode(mode: string): string {
  if (mode === "desktop") return "Desktop";
  if (mode === "floating") return "Floating";
  return "Normal";
}

export function createTray(window: BrowserWindow, actions: WindowActions): Tray {
  const tray = new Tray(createTrayIcon());
  tray.setToolTip("PR Pulse");

  const buildMenu = () =>
    Menu.buildFromTemplate([
      {
        label: window.isVisible() ? "Hide Widget" : "Show Widget",
        click: () => toggleWindowVisibility(window),
      },
      { label: "Refresh", click: actions.onRefresh },
      { label: "Settings", click: actions.onOpenSettings },
      {
        label: `Window Mode: ${describeMode(getConfig().windowMode)}`,
        click: () => actions.onOpenSettings(),
      },
      { type: "separator" },
      { label: "Quit", click: actions.onQuit },
    ]);

  tray.on("click", () => {
    toggleWindowVisibility(window);
  });

  tray.on("right-click", () => {
    tray.popUpContextMenu(buildMenu());
  });

  if (process.platform === "darwin" && app.dock) {
    app.dock.hide();
  }

  return tray;
}
