import { defineConfig, mergeConfig } from 'vite';

import sdkConfig from './.genesys/sdk/vite.config.js';

/**
 * Spike-only Vite config.
 *
 * The SDK base config installs `vite-plugin-mkcert`, which shells out to
 * `mkcert -install` on first run and pops an interactive Windows
 * certificate-trust dialog. If nobody clicks it the dev server does not start
 * at all ("add cert: failed adding cert: The operation was canceled by the
 * user"), which makes `pnpm dev` unusable from a non-interactive shell.
 *
 * This spike only ever runs on localhost — no LAN device testing, no phone —
 * so https buys nothing here. Drop the plugin and serve plain http.
 * (SPORELING keeps mkcert: it needs https to reach a real phone over the LAN.)
 */
const base = sdkConfig as Record<string, any>;
const plugins = (base.plugins ?? []).flat().filter(
  (p: any) => !String(p?.name ?? '').includes('mkcert'),
);

/**
 * The UI kit fetches its stylesheets as text and injects them into a <style>
 * element. Vite's dev server answers a plain fetch of a .css file with a JS
 * module (HMR wrapper), which lands in the <style> as garbage and leaves every
 * widget unstyled. Appending `?direct` makes vite return the raw CSS. Dev only;
 * the Studio build serves the files verbatim.
 */
const rawWidgetCss = {
  name: 'hayride-raw-widget-css',
  configureServer(server: any) {
    server.middlewares.use((req: any, _res: any, next: () => void) => {
      if (typeof req.url === 'string' && /\/assets\/ui\/styles\/[^?]+\.css$/.test(req.url)) {
        req.url += '?direct';
      }
      next();
    });
  },
};

export default mergeConfig(
  { ...base, plugins: [...plugins, rawWidgetCss], server: { ...(base.server ?? {}), https: false, open: false } },
  defineConfig({}),
);
