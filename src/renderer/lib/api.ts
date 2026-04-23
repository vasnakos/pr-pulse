import type { WidgetConfig, WidgetState } from "../../shared/types";

export const widgetApi = {
  getState: (): Promise<WidgetState> => window.widgetApi.getState(),
  getConfig: (): Promise<WidgetConfig> => window.widgetApi.getConfig(),
  refresh: (): Promise<WidgetState> => window.widgetApi.refresh(),
  setConfig: (patch: Partial<WidgetConfig>): Promise<WidgetConfig> => window.widgetApi.setConfig(patch),
  openPR: (url: string): Promise<void> => window.widgetApi.openPR(url),
  openSettings: (): Promise<void> => window.widgetApi.openSettings(),
  hide: (): Promise<void> => window.widgetApi.hide(),
  onStateChange: (listener: (state: WidgetState) => void): (() => void) =>
    window.widgetApi.onStateChange(listener),
  onConfigChange: (listener: (config: WidgetConfig) => void): (() => void) =>
    window.widgetApi.onConfigChange(listener),
  onOpenSettings: (listener: () => void): (() => void) => window.widgetApi.onOpenSettings(listener),
};
