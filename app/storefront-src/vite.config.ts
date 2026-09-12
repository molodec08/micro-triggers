import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Builds the theme app extension's storefront script. core.ts is the only
// real entry point; it dynamically import()s one module per trigger, so
// Vite/Rollup automatically splits each trigger (and the shared utilities
// they have in common) into its own chunk — the browser only ever fetches a
// trigger's chunk when that trigger is enabled in the merchant's settings.
//
// This package deliberately lives outside extensions/micro-triggers-storefront/
// (in app/storefront-src/) rather than next to its assets/ output: Shopify
// CLI only tolerates assets/, blocks/, snippets/ and locales/ directly under
// a theme app extension directory and errors ("Only assets, blocks, snippets,
// locales directories are allowed") on anything else — a sibling
// package.json/src/ broke `shopify app dev`. Output is instead pointed
// across at the extension's assets/ directory, which is what Shopify CLI
// picks up as-is when deploying/serving the extension — there is no build
// step on the CLI side for this.
const EXTENSION_ASSETS_DIR = resolve(
  __dirname,
  "../../extensions/micro-triggers-storefront/assets",
);

export default defineConfig({
  // Theme app extension assets are served from a per-shop CDN path that
  // only Liquid's asset_url filter knows at runtime — there's no fixed root
  // to build absolute URLs against. Returning a bare relative filename here
  // keeps Vite's chunk-preload <link> hrefs (and any other built-in URL
  // building) relative to core.js's own location instead of "/" + filename.
  experimental: {
    renderBuiltUrl() {
      return { relative: true };
    },
  },
  build: {
    outDir: EXTENSION_ASSETS_DIR,
    emptyOutDir: false,
    assetsInlineLimit: 0,
    minify: "esbuild",
    // Vite's modulepreload polyfill resolves chunk URLs as absolute paths
    // from the site root ("/" + filename), but theme app extension assets
    // are served from a per-shop CDN path via Liquid's asset_url filter —
    // there is no fixed root path to resolve against at build time. Native
    // browsers already resolve a module's relative import() calls against
    // that module's own URL correctly without this polyfill, so it's off.
    modulePreload: false,
    rollupOptions: {
      input: {
        core: "src/core.ts",
      },
      output: {
        format: "es",
        entryFileNames: "[name].js",
        // Chunk names are derived from the dynamically-imported trigger
        // module's own filename (e.g. src/triggers/blinking-tab.ts ->
        // blinking-tab-[hash].js), which keeps them readable without
        // needing them to be listed as entries.
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
