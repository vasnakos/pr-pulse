import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

const DEV_CSP =
  "default-src 'self' http://localhost:* ws://localhost:*; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
  "connect-src 'self' http://localhost:* ws://localhost:* https://api.github.com; " +
  "img-src 'self' data: https:;";

const PROD_CSP =
  "default-src 'self'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "script-src 'self'; " +
  "connect-src 'self' https://api.github.com; " +
  "img-src 'self' data: https:;";

function cspPlugin(): Plugin {
  return {
    name: "inject-csp",
    transformIndexHtml(html, ctx) {
      const csp = ctx.server ? DEV_CSP : PROD_CSP;
      return html.replace(
        "<!--CSP-PLACEHOLDER-->",
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      );
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
    },
  },
  renderer: {
    plugins: [react(), cspPlugin()],
    server: {
      port: 5174,
      strictPort: true,
    },
    build: {
      outDir: "out/renderer",
    },
  },
});
