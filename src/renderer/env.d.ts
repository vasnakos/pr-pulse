import type { WidgetApi } from "../preload";

declare global {
  interface Window {
    widgetApi: WidgetApi;
  }
}

export {};
