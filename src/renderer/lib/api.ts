import type { WidgetConfig, WidgetState } from "../../shared/types";

export const widgetApi = {
  getState: (): Promise<WidgetState> => window.widgetApi.getState(),
  getConfig: (): Promise<WidgetConfig> => window.widgetApi.getConfig(),
  getMuted: (): Promise<number[]> => window.widgetApi.getMuted(),
  refresh: (): Promise<WidgetState> => window.widgetApi.refresh(),
  setConfig: (patch: Partial<WidgetConfig>): Promise<WidgetConfig> => window.widgetApi.setConfig(patch),
  setMuted: (payload: { id: number; muted: boolean }): Promise<number[]> => window.widgetApi.setMuted(payload),
  openPR: (url: string): Promise<void> => window.widgetApi.openPR(url),
  openSettings: (): Promise<void> => window.widgetApi.openSettings(),
  setContentHeight: (height: number): Promise<void> => window.widgetApi.setContentHeight(height),
  hide: (): Promise<void> => window.widgetApi.hide(),
  onStateChange: (listener: (state: WidgetState) => void): (() => void) =>
    window.widgetApi.onStateChange(listener),
  onConfigChange: (listener: (config: WidgetConfig) => void): (() => void) =>
    window.widgetApi.onConfigChange(listener),
  onMutedChange: (listener: (mutedIds: number[]) => void): (() => void) =>
    window.widgetApi.onMutedChange(listener),
  onOpenSettings: (listener: () => void): (() => void) => window.widgetApi.onOpenSettings(listener),
};
