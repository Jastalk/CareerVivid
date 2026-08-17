/**
 * Frame renderer for the showcase timeline.
 *
 * The previous cut rendered 376 frames for 188 seconds — 2 fps, then held each
 * frame 15x to reach 30 fps. That is the entire cause of the judder. This walks
 * the timeline at a real frame rate and pipes every frame straight into ffmpeg,
 * so nothing touches disk and no frame is ever duplicated.
 *
 *   node render.mjs                 # full render
 *   node render.mjs --probe         # 10 stills at key beats, for eyeballing
 *   node render.mjs --fps 30        # override frame rate
 *   node render.mjs --from 50 --to 70   # render a slice only
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const has  = n => argv.includes('--' + n);

const CHROME = '/Applications/Google Chrome 2.app/Contents/MacOS/Google Chrome';
const PAGE   = 'file://' + resolve(HERE, 'showcase_timeline_v2.html');
const FPS    = Number(flag('fps', 60));
const FROM   = Number(flag('from', 0));
const TO     = Number(flag('to', 200));
const OUT    = resolve(HERE, flag('out', 'video_v2.mp4'));
const PROBE  = has('probe');

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--font-render-hinting=none',      // consistent glyph rasterisation frame to frame
    '--disable-font-subpixel-positioning',
    '--allow-file-access-from-files',
    '--disable-background-timer-throttling',
  ],
});

const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

await page.goto(PAGE, { waitUntil: 'networkidle' });
// Webfonts and the large PNGs must be decoded before frame 0 or the first
// second of every section renders in a fallback face / with blank images.
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => i.complete ? null : i.decode().catch(() => {})));
});
await page.waitForTimeout(600);

/* ---------- probe mode: a handful of stills at the beats that matter ---------- */
if (PROBE) {
  const dir = resolve(HERE, 'probe');
  mkdirSync(dir, { recursive: true });
  const beats = [
    [2.5,  '01-photos-a'],
    [9.5,  '02-photos-b'],
    [13.0, '02b-photos-full'],
    [22.5, '02c-founder-card'],
    [27.0, '02d-founder-stats'],
    [36.0, '03-resume-enter'],
    [46.0, '04-strike-drawing'],
    [58.0, '05-score-midsurge'],
    [60.5, '06-score-settled'],
    [90.0, '07-packet-travel'],
    [112.0,'08-whiteboard-punch'],
    [140.0,'09-report-pushin'],
    [75.0, '10-board-new'],
    [149.0,'11-tracks-in'],
    [154.0,'12-export-rise'],
    [163.0,'13-studio-proof'],
    [174.0,'14-cta'],
    [190.0,'15-community-proof'],
  ];
  for (const [t, name] of beats) {
    await page.evaluate(tt => window.setSeekTime(tt), t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    writeFileSync(resolve(dir, `${name}.jpg`), buf);
    console.log('probe', name, '@', t + 's');
  }
  await browser.close();
  process.exit(0);
}

/* ---------- full render: frames piped into ffmpeg ---------- */
const total = Math.round((TO - FROM) * FPS);
console.log(`rendering ${total} frames @ ${FPS}fps  (${FROM}s -> ${TO}s)  -> ${OUT}`);

const ff = spawn('ffmpeg', [
  '-y', '-v', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
  '-an',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '17',                 // the old master was 776 kbps, which mushed
  '-pix_fmt', 'yuv420p',        // every gradient, screenshot and grain field
  '-profile:v', 'high', '-level', '4.2',
  '-x264-params', 'ref=5:bframes=4:aq-mode=3:aq-strength=1.0',
  '-movflags', '+faststart',
  OUT,
], { stdio: ['pipe', 'inherit', 'inherit'] });

ff.on('error', e => { console.error('ffmpeg failed:', e.message); process.exit(1); });

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const t = FROM + i / FPS;
  await page.evaluate(tt => window.setSeekTime(tt), t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));

  if (i % (FPS * 10) === 0 || i === total - 1) {
    const el = (Date.now() - t0) / 1000;
    const rate = (i + 1) / el;
    const eta = (total - i - 1) / rate;
    console.log(
      `  ${String(i + 1).padStart(6)}/${total}  t=${t.toFixed(1)}s  ` +
      `${rate.toFixed(1)} fps  eta ${Math.round(eta)}s`
    );
  }
}

ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log(`done in ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min -> ${OUT}`);
