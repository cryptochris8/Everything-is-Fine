// Drive a Genesys dev page in headless Chrome (GPU on) and report what happened.
//   node genesys-probe.cjs <url> <out.png> [settleMs] [--eval "<js expression>"] [--filter "<regex>"] [--keys "KeyW:2000,Space:100"]
// Waits for the engine canvas (cold vite ~70 s, warm ~60 s), settles, optionally presses keys,
// evaluates an expression in the page, screenshots, and prints console lines (filtered).
// Flags: --ready wait for window.__eif.ready · --pre "<js>" run right after ready
//        --net list every failed / 4xx request · --mobile emulate a 390x844 touch phone
//        --throttle <profile> CDP network throttling: fast3g | slow3g | 4g
const { chromium } = require('C:/Users/chris/Fable-5.1-one-shot/node_modules/playwright');

const args = process.argv.slice(2);
const url = args[0] || 'http://127.0.0.1:5199/';
const out = args[1] || 'probe.png';
const settleMs = Number(args[2] && !args[2].startsWith('--') ? args[2] : 15000);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const evalExpr = opt('--eval');
const filter = opt('--filter') ? new RegExp(opt('--filter'), 'i') : null;
const keys = opt('--keys');
const pre = opt('--pre');
const waitReady = args.includes('--ready');
const logNet = args.includes('--net');
const mobile = args.includes('--mobile');
// --viewport 844x390 — override the emulated size (phone landscape, tablets).
const viewportArg = opt('--viewport');
const viewport = viewportArg
  ? { width: Number(viewportArg.split('x')[0]), height: Number(viewportArg.split('x')[1]) }
  : null;
const throttle = opt('--throttle');
// --shots "label=<js>;;label=<js>" — run each js, settle, screenshot to
// <out-dir>/<out-stem>_<label>.png. A cold page load costs ~2 min, so a look
// pass wants every framing out of ONE load, not one load per framing.
const shots = opt('--shots');
const shotSettleMs = Number(opt('--shot-settle') || 1200);

// Chrome DevTools' own presets, so a number here means what it means in the Network panel.
const THROTTLE_PROFILES = {
  fast3g: { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 562.5 },
  slow3g: { downloadThroughput: (500 * 1024) / 8, uploadThroughput: (500 * 1024) / 8, latency: 2000 },
  '4g': { downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (9 * 1024 * 1024) / 8, latency: 170 },
};

// Hoisted so the failure path can still say what the page managed to log and
// can close the browser — a probe that throws mid-run used to leak a whole
// Chrome (and its GPU process) for the rest of the session.
let browser = null;
const logs = [];
const netFails = [];

(async () => {
  browser = await chromium.launch({
    channel: 'chrome', headless: true,
    // --igpu drops --force_high_performance_gpu so Chrome's GPU process sits on the
    // integrated GPU — which is where a hybrid laptop's Chrome lives by default
    // (Chris's chrome://gpu, 09-07: Intel UHD *ACTIVE*, RTX 3050 idle; 76 fps to the
    // probe's 144). Measuring only with the flag was measuring a machine no judge has.
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', ...(args.includes('--igpu') ? [] : ['--force_high_performance_gpu']), '--autoplay-policy=no-user-gesture-required'],
  });
  const context = mobile
    ? await browser.newContext({
        viewport: viewport || { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      })
    : await browser.newContext({ viewport: viewport || { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 400)}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${String(e).slice(0, 400)}`));
  page.on('requestfailed', (r) => netFails.push(`FAILED ${(r.failure() || {}).errorText || '?'} ${r.url().slice(0, 200)}`));
  page.on('response', (r) => { if (r.status() >= 400) netFails.push(`HTTP ${r.status()} ${r.url().slice(0, 200)}`); });
  if (throttle) {
    const profile = THROTTLE_PROFILES[throttle];
    if (!profile) { throw new Error(`unknown --throttle ${throttle}; use ${Object.keys(THROTTLE_PROFILES).join('|')}`); }
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...profile });
    console.log(`throttling: ${throttle}`);
  }
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'commit', timeout: 300000 });
  await page.waitForFunction(() => document.querySelector('canvas') !== null, null, { timeout: 300000 });
  console.log(`canvas after ${Date.now() - t0} ms`);
  if (waitReady) {
    // Same budget as the canvas wait: on a loaded machine the engine can take
    // longer to reach `ready` than it took to put a canvas on screen.
    try {
      await page.waitForFunction(() => (window).__eif && (window).__eif.ready === true, null, { timeout: 300000 });
      console.log(`game ready after ${Date.now() - t0} ms`);
    } catch (e) {
      const seen = await page.evaluate(() => {
        const g = (window).__eif;
        return g ? { present: true, ready: g.ready, state: g.state } : { present: false };
      }).catch(() => ({ present: 'evaluate failed' }));
      console.log(`NOT READY after ${Date.now() - t0} ms — __eif: ${JSON.stringify(seen)}`);
      throw e;
    }
  }
  if (pre) {
    try { const r = await page.evaluate(pre); console.log('pre ->', JSON.stringify(r)); } catch (e) { console.log('PRE ERROR', String(e).slice(0, 300)); }
  }
  console.log(`settling ${settleMs} ms`);
  await page.waitForTimeout(settleMs);
  if (keys) {
    for (const spec of keys.split(',')) {
      const [code, holdMs] = spec.split(':');
      await page.keyboard.down(code);
      await page.waitForTimeout(Number(holdMs || 100));
      await page.keyboard.up(code);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
  }
  if (shots) {
    const path = require('path');
    const dir = path.dirname(out);
    const stem = path.basename(out).replace(/\.png$/i, '');
    for (const spec of shots.split(';;')) {
      const eq = spec.indexOf('=');
      const label = spec.slice(0, eq).trim();
      const js = spec.slice(eq + 1);
      let ret = null;
      try { ret = await page.evaluate(js); } catch (e) { ret = 'ERROR ' + String(e).slice(0, 200); }
      await page.waitForTimeout(shotSettleMs);
      const file = path.join(dir, `${stem}_${label}.png`);
      await page.screenshot({ path: file });
      console.log(`shot ${label} -> ${file}  (${JSON.stringify(ret)})`);
    }
  }
  let evaluated = null;
  if (evalExpr) {
    try { evaluated = await page.evaluate(evalExpr); } catch (e) { evaluated = 'EVAL ERROR: ' + String(e).slice(0, 300); }
  }
  await page.screenshot({ path: out });
  const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  console.log(JSON.stringify({ totalMs: Date.now() - t0, consoleLines: logs.length, errors: errors.length, evaluated }, null, 2));
  const shown = filter ? logs.filter((l) => filter.test(l)) : logs;
  console.log(`--- console (${shown.length} shown of ${logs.length}) ---`);
  console.log(shown.slice(0, 120).join('\n'));
  if (!filter && errors.length) { console.log('--- errors ---'); console.log(errors.slice(0, 40).join('\n')); }
  if (logNet) {
    console.log(`--- network failures (${netFails.length}) ---`);
    console.log(netFails.slice(0, 60).join('\n') || '(none)');
  }
  await browser.close();
})().catch(async (e) => {
  console.error('PROBE FAILED', String(e).slice(0, 400));
  console.log(`--- console at failure (${logs.length}) ---`);
  console.log(logs.slice(-40).join('\n') || '(nothing logged)');
  if (netFails.length) {
    console.log(`--- network failures (${netFails.length}) ---`);
    console.log(netFails.slice(0, 40).join('\n'));
  }
  if (browser) { await browser.close().catch(() => {}); }
  process.exit(1);
});
