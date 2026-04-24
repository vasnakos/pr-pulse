import { contextBridge, ipcRenderer } from "electron";

import type { WidgetConfig, WidgetState } from "../shared/types";

const api = {
  getState: (): Promise<WidgetState> => ipcRenderer.invoke("widget:get-state"),
  getConfig: (): Promise<WidgetConfig> => ipcRenderer.invoke("widget:get-config"),
  getMuted: (): Promise<number[]> => ipcRenderer.invoke("widget:get-muted"),
  refresh: (): Promise<WidgetState> => ipcRenderer.invoke("widget:refresh"),
  setConfig: (patch: Partial<WidgetConfig>): Promise<WidgetConfig> =>
    ipcRenderer.invoke("widget:set-config", patch),
  setMuted: (payload: { id: number; muted: boolean }): Promise<number[]> =>
    ipcRenderer.invoke("widget:set-muted", payload),
  openPR: (url: string): Promise<void> => ipcRenderer.invoke("widget:open-pr", url),
  openSettings: (): Promise<void> => ipcRenderer.invoke("widget:open-settings"),
  hide: (): Promise<void> => ipcRenderer.invoke("widget:hide"),
  onStateChange: (listener: (state: WidgetState) => void): (() => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, state: WidgetState) => listener(state);
    ipcRenderer.on("widget:state", wrapped);
    return () => ipcRenderer.removeListener("widget:state", wrapped);
  },
  onConfigChange: (listener: (config: WidgetConfig) => void): (() => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, config: WidgetConfig) => listener(config);
    ipcRenderer.on("widget:config", wrapped);
    return () => ipcRenderer.removeListener("widget:config", wrapped);
  },
  onMutedChange: (listener: (mutedIds: number[]) => void): (() => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, mutedIds: number[]) => listener(mutedIds);
    ipcRenderer.on("widget:muted", wrapped);
    return () => ipcRenderer.removeListener("widget:muted", wrapped);
  },
  onOpenSettings: (listener: () => void): (() => void) => {
    const wrapped = () => listener();
    ipcRenderer.on("widget:open-settings", wrapped);
    return () => ipcRenderer.removeListener("widget:open-settings", wrapped);
  },
};

contextBridge.exposeInMainWorld("widgetApi", api);

export type WidgetApi = typeof api;
