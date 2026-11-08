// Verify the Athlete Domains controls + camera in headless Chrome (no real controller or phone needed).
//   node tools/probe-input.cjs [baseUrl] [outDir]
// Gamepad pass: a fake standard gamepad injected through navigator.getGamepads.
// Keyboard + mouse pass: real key presses and a right-button drag (no pointer lock).
// Touch pass: an emulated 390x844 phone; the floating stick and drag-look get synthetic touch pointer events.
// Prints PASS/FAIL per check and exits 1 if anything failed.
const { chromium } = require('C:/Users/chris/Fable-5.1-one-shot/node_modules/playwright');
const path = require('path');

const base = (process.argv[2] || 'http://127.0.0.1:5207/').replace(/\/?$/, '/');
const outDir = process.argv[3] || 'tools/_out';
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  (${JSON.stringify(detail)})` : ''}`);
};
const r2 = (n) => Math.round(n * 100) / 100;

const FAKE_PAD = () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons };
  Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null], configurable: true });
  window.__pad = pad;
  window.__hold = (b, on) => {
    pad.buttons[b].pressed = on;
    pad.buttons[b].value = on ? 1 : 0;
    pad.timestamp = performance.now();
  };
};

async function boot(context, url) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  // The two dev-server 404s on boot are known and not game requests (PROJECT_STATUS known issues).
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(url, { waitUntil: 'commit', timeout: 300000 });
  await page.waitForFunction(() => window.__eif && window.__eif.ready === true, null, { timeout: 300000 });
  // Past the 1.5 s spawn settle and the first-frames shader-compile hitch.
  await page.waitForTimeout(6000);
  return { page, errors };
}

const stats = (page) => page.evaluate(() => window.__eif.stats());
const look = (page) => page.evaluate(() => window.__eif.look());
const press = async (page, b, holdMs = 200) => {
  await page.evaluate((b) => window.__hold(b, true), b);
  await page.waitForTimeout(holdMs);
  await page.evaluate((b) => window.__hold(b, false), b);
  await page.waitForTimeout(200);
};
/** Highest y over ~1 s while something makes the athlete jump. */
async function apex(page) {
  const y0 = (await stats(page)).player.y;
  let yMax = y0;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(60);
    yMax = Math.max(yMax, (await stats(page)).player.y);
  }
  return yMax - y0;
}

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force_high_performance_gpu', '--autoplay-policy=no-user-gesture-required'],
  });
  try {
    // ---------------------------------------------------------------- gamepad
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await context.addInitScript(FAKE_PAD);
      const { page, errors } = await boot(context, `${base}?seed=21&reset=1`);
      check('pad: title screen up', (await stats(page)).phase === 'title');
      await press(page, 0); // A
      await page.waitForTimeout(400);
      check('pad: A starts the day', (await stats(page)).phase === 'playing');
      check('pad: HUD switched to controller labels', await page.evaluate(() => document.querySelector('.eif-root')?.classList.contains('dev-pad')));
      const l0 = await look(page);
      check('camera: Athlete Domains resting pitch, behind the athlete', Math.abs(l0.pitch - Math.atan2(1.65, 6.5)) < 1e-6 && Math.abs(l0.yaw) < 1e-6, l0);

      // Left stick up for 1.5 s: walks AWAY from the camera (+Z at camera yaw 0) at 4.2 m/s.
      const p0 = (await stats(page)).player;
      await page.evaluate(() => { window.__pad.axes[1] = -1; });
      await page.waitForTimeout(1500);
      const pMid = (await stats(page)).player;
      await page.evaluate(() => { window.__pad.axes[1] = 0; });
      await page.waitForTimeout(300);
      const p1 = (await stats(page)).player;
      const walked = Math.hypot(p1.x - p0.x, p1.z - p0.z);
      check('pad: left stick walks away from the camera', p1.z - p0.z > 3 && Math.abs(p1.x - p0.x) < 0.6, { dx: r2(p1.x - p0.x), dz: r2(p1.z - p0.z) });
      check('pad: athlete turns to face the walk (yaw ≈ 0 = +Z)', Math.abs(Math.atan2(Math.sin(pMid.yaw), Math.cos(pMid.yaw))) < 0.2, { yaw: pMid.yaw });
      // Full tilt runs (Athlete Domains: > 0.92 tilt); compare a half-tilt walk with a full-tilt run over the same time.
      const q0 = (await stats(page)).player;
      await page.evaluate(() => { window.__pad.axes[1] = 0.8; }); // stick down: back toward the camera, not running
      await page.waitForTimeout(1000);
      await page.evaluate(() => { window.__pad.axes[1] = 0; });
      await page.waitForTimeout(250);
      const q1 = (await stats(page)).player;
      await press(page, 1, 10); // B tap is not a run on its own
      await page.evaluate(() => { window.__hold(1, true); window.__pad.axes[1] = -0.8; });
      await page.waitForTimeout(1000);
      await page.evaluate(() => { window.__hold(1, false); window.__pad.axes[1] = 0; });
      await page.waitForTimeout(250);
      const q2 = (await stats(page)).player;
      const slow = Math.hypot(q1.x - q0.x, q1.z - q0.z);
      const fast = Math.hypot(q2.x - q1.x, q2.z - q1.z);
      check('pad: B held runs (~7 vs 4.2 m/s)', fast > slow * 1.4, { slow: r2(slow), fast: r2(fast) });

      // A jumps about 1.25 m.
      await page.evaluate(() => window.__hold(0, true));
      const rise = await apex(page);
      await page.evaluate(() => window.__hold(0, false));
      await page.waitForTimeout(600);
      check('pad: A jumps ~1.25 m (Athlete Domains jump)', rise > 0.95 && rise < 1.6, { rise: r2(rise) });

      // Right stick turns the camera; then stick up walks the new "away" direction.
      const ly0 = (await look(page)).yaw;
      await page.evaluate(() => { window.__pad.axes[2] = 1; });
      await page.waitForTimeout(600);
      await page.evaluate(() => { window.__pad.axes[2] = 0; });
      await page.waitForTimeout(200);
      const lk = await look(page);
      check('pad: right stick right turns the camera right', lk.yaw < ly0 - 0.8, { from: r2(ly0), to: r2(lk.yaw) });
      const s0 = (await stats(page)).player;
      await page.evaluate(() => { window.__pad.axes[1] = -1; });
      await page.waitForTimeout(800);
      await page.evaluate(() => { window.__pad.axes[1] = 0; });
      await page.waitForTimeout(250);
      const s1 = (await stats(page)).player;
      const mv = { x: s1.x - s0.x, z: s1.z - s0.z };
      const want = { x: Math.sin(lk.yaw), z: Math.cos(lk.yaw) };
      const cos = (mv.x * want.x + mv.z * want.z) / Math.max(1e-6, Math.hypot(mv.x, mv.z));
      check('pad: walking is camera-relative after turning', cos > 0.95, { cos: r2(cos), mv: { x: r2(mv.x), z: r2(mv.z) } });

      // Replies on the D-pad (only while replies show).
      await page.evaluate(() => window.__eif.tp(-11, 0.8, 4));
      let choices = null;
      for (let i = 0; i < 60 && !choices; i++) {
        await page.waitForTimeout(500);
        choices = await page.evaluate(() => window.__eif.sim().choices?.options.length ?? null);
      }
      const badges = await page.evaluate(() => Array.from(document.querySelectorAll('.eif-choice .eif-key')).map((e) => e.textContent));
      check('pad: reply badges show D-pad arrows', choices === 2 && badges.join('') === '↑↓', { choices, badges });
      await page.screenshot({ path: path.join(outDir, 'input_pad_reply.png') });
      await press(page, 12);
      await page.waitForTimeout(300);
      const st = await stats(page);
      check('pad: D-pad Up answers the first reply', st.running.some((r) => r.startsWith('BBQ@') && !r.endsWith('@offer')), { running: st.running });
      await press(page, 9);
      check('pad: Start pauses', (await stats(page)).phase === 'paused');
      await page.screenshot({ path: path.join(outDir, 'input_pad_pause.png') });
      await press(page, 1);
      check('pad: B resumes', (await stats(page)).phase === 'playing');
      check('pad: no page errors', errors.length === 0, errors.slice(0, 3));
      await context.close();
    }

    // ---------------------------------------------------------------- keyboard + mouse
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const { page, errors } = await boot(context, `${base}?seed=21&reset=1&autostart=1`);
      await page.mouse.click(900, 400); // a left click on the right half: must NOT grab the pointer
      await page.waitForTimeout(300);
      check('kb: no pointer lock (Athlete Domains drags to look)', await page.evaluate(() => document.pointerLockElement === null));
      const a0 = (await stats(page)).player;
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(1000);
      await page.keyboard.up('KeyW');
      await page.waitForTimeout(250);
      const a1 = (await stats(page)).player;
      await page.keyboard.down('ShiftLeft');
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(1000);
      await page.keyboard.up('KeyW');
      await page.keyboard.up('ShiftLeft');
      await page.waitForTimeout(250);
      const a2 = (await stats(page)).player;
      const walk = a1.z - a0.z;
      const run = a2.z - a1.z;
      check('kb: W walks ~4.2 m/s away from the camera', walk > 3.4 && walk < 5, { walk: r2(walk) });
      check('kb: Shift+W runs ~7 m/s', run > 5.8 && run < 8.2, { run: r2(run) });
      await page.keyboard.down('Space');
      const rise = await apex(page);
      await page.keyboard.up('Space');
      await page.waitForTimeout(600);
      check('kb: Space jumps ~1.25 m', rise > 0.95 && rise < 1.6, { rise: r2(rise) });
      const y0 = (await look(page)).yaw;
      await page.keyboard.down('KeyQ');
      await page.waitForTimeout(500);
      await page.keyboard.up('KeyQ');
      const y1 = (await look(page)).yaw;
      check('kb: Q turns the camera left', y1 - y0 > 0.6, { turned: r2(y1 - y0) });
      const pBefore = (await look(page)).pitch;
      await page.keyboard.down('KeyR');
      await page.waitForTimeout(300);
      await page.keyboard.up('KeyR');
      check('kb: R looks up', (await look(page)).pitch < pBefore - 0.2);
      // Right-button drag anywhere turns the view: 100 px right → yaw −0.8.
      const d0 = await look(page);
      await page.mouse.move(400, 400);
      await page.mouse.down({ button: 'right' });
      await page.mouse.move(450, 400, { steps: 5 });
      await page.mouse.move(500, 380, { steps: 5 });
      await page.mouse.up({ button: 'right' });
      const d1 = await look(page);
      check('mouse: right-drag 100 px right turns 0.8 rad right; up looks up', Math.abs(d1.yaw - d0.yaw + 0.8) < 0.05 && d1.pitch < d0.pitch, { dyaw: r2(d1.yaw - d0.yaw), dpitch: r2(d1.pitch - d0.pitch) });
      // Left-drag on the LEFT half does nothing to the camera.
      await page.mouse.move(200, 400);
      await page.mouse.down();
      await page.mouse.move(300, 400, { steps: 5 });
      await page.mouse.up();
      const d2 = await look(page);
      check('mouse: left-drag on the left half leaves the camera alone', Math.abs(d2.yaw - d1.yaw) < 1e-6);
      await page.screenshot({ path: path.join(outDir, 'input_kb.png') });
      check('kb: no page errors', errors.length === 0, errors.slice(0, 3));
      await context.close();
    }

    // ---------------------------------------------------------------- touch
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      });
      const { page, errors } = await boot(context, `${base}?seed=21&reset=1&autostart=1`);
      const visible = await page.evaluate(() => {
        const t = document.querySelector('.eif-touch');
        return {
          touch: t ? getComputedStyle(t).display : null,
          labels: t ? Array.from(t.querySelectorAll('button')).map((b) => b.textContent) : [],
          pause: getComputedStyle(document.querySelector('.eif-tpause')).display,
          engineSticks: document.querySelectorAll('[class*="joystick" i], [id*="joystick" i]').length,
        };
      });
      check('touch: USE / THROW / JUMP + pause, no RUN button, no engine sticks', visible.touch === 'grid' && visible.labels.join(',') === 'USE,THROW,JUMP' && visible.pause === 'block', visible);
      const touch = (type, id, x, y) =>
        page.evaluate(
          ([type, id, x, y]) => {
            const host = document.querySelector('canvas').parentElement.closest('[id], div') || document.body;
            const target = window.__eifHost || document.querySelector('canvas');
            target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
            void host;
          },
          [type, id, x, y],
        );
      // Floating stick: thumb down on the left side, push up past the rim (full tilt → runs).
      const t0 = (await stats(page)).player;
      await touch('pointerdown', 1, 100, 650);
      await touch('pointermove', 1, 100, 600);
      await touch('pointermove', 1, 100, 560);
      const stickShown = await page.evaluate(() => getComputedStyle(document.querySelector('.eif-stick')).display === 'block');
      await page.screenshot({ path: path.join(outDir, 'input_touch.png') });
      await page.waitForTimeout(1000);
      const lk = await look(page);
      await touch('pointerup', 1, 100, 560);
      await page.waitForTimeout(250);
      const t1 = (await stats(page)).player;
      const moved = t1.z - t0.z;
      check('touch: floating stick appears under the thumb', stickShown);
      check('touch: stick pushed to the rim walks away from the camera and runs', moved > 5 && lk.run === true, { moved: r2(moved), run: lk.run });
      // Drag on the right half looks round.
      const l0 = await look(page);
      await touch('pointerdown', 2, 300, 500);
      await touch('pointermove', 2, 340, 500);
      await touch('pointerup', 2, 340, 500);
      const l1 = await look(page);
      check('touch: drag on the right side turns the camera', Math.abs(l1.yaw - l0.yaw + 0.32) < 0.03, { dyaw: r2(l1.yaw - l0.yaw) });
      await page.tap('.eif-touch button.jump');
      const rise = await apex(page);
      check('touch: JUMP jumps', rise > 0.6, { rise: r2(rise) });
      await page.waitForTimeout(500);
      await page.tap('.eif-tpause');
      await page.waitForTimeout(300);
      check('touch: pause button pauses', (await stats(page)).phase === 'paused');
      await page.tap("text=I'm stuck!");
      await page.waitForTimeout(500);
      check("touch: I'm stuck! resumes", (await stats(page)).phase === 'playing');
      check('touch: no page errors', errors.length === 0, errors.slice(0, 3));
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
