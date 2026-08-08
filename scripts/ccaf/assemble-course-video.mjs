/**
 * assemble-course-video.mjs
 *
 * Assembles the final domain-1.mp4 by combining:
 *   - Real Veo 2.0 generated video clips (from public/ccaf-lessons/clips/)
 *   - Playwright-rendered diagram/code/compare/card slides with TTS audio
 *
 * The `veo` beats use the actual AI-generated MP4 clips.
 * The `diagram`, `code`, `compare`, `card` beats use Playwright screenshots + TTS wav.
 *
 * Output: public/ccaf-lessons/domain-1.mp4
 *
 * Usage:
 *   node scripts/ccaf/assemble-course-video.mjs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const VEO_CLIPS_DIR  = path.resolve('public/ccaf-lessons/clips');
const FRAMES_DIR     = path.resolve('scratchpad/assemble_frames');
const FINAL_MP4      = path.resolve('public/ccaf-lessons/domain-1.mp4');
const NARRATION_DIR  = path.resolve('public/assets/ccaf-narration/contract-breakdown/zh/charon');
const BACKPLATE_IMG  = path.resolve('public/assets/ccaf-backplates/contract-breakdown--open.png');

fs.mkdirSync(FRAMES_DIR, { recursive: true });

// ── Slide HTML builder ────────────────────────────────────────────────────────
const backplateBase64 = fs.readFileSync(BACKPLATE_IMG).toString('base64');
const backplateUrl    = `data:image/png;base64,${backplateBase64}`;

const SLIDE_CSS = `
  * { box-sizing:border-box; margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  body { width:1920px; height:1080px; background:#0f1117; color:#fff; overflow:hidden; display:flex; flex-direction:column; }
  .header { padding:40px 60px; display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid rgba(255,255,255,0.1); }
  .tag    { background:#625bd5; color:#fff; font-weight:800; padding:8px 20px; border-radius:30px; font-size:20px; letter-spacing:1px; }
  .title  { font-size:36px; font-weight:900; color:#f3f4f6; }
  .body   { flex:1; display:flex; align-items:center; justify-content:center; padding:60px; position:relative; }
  .bg-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0.3; filter:blur(2px) brightness(0.6); }

  .flow-container { display:flex; align-items:center; gap:30px; z-index:10; flex-wrap:wrap; justify-content:center; }
  .flow-node { background:rgba(30,41,59,0.9); border:3px solid #3b82f6; padding:24px 40px; border-radius:20px; font-size:28px; font-weight:700; color:#60a5fa; box-shadow:0 10px 30px rgba(0,0,0,0.5); }
  .arrow { font-size:40px; color:#94a3b8; font-weight:900; }

  .compare-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:40px; width:100%; max-width:1600px; z-index:10; }
  .card-bad  { background:rgba(239,68,68,0.12); border:3px solid #ef4444; padding:40px; border-radius:24px; text-align:center; }
  .card-good { background:rgba(34,197,94,0.15); border:4px solid #22c55e; padding:40px; border-radius:24px; text-align:center; box-shadow:0 0 40px rgba(34,197,94,0.3); }
  .card-title { font-size:32px; font-weight:900; margin-bottom:20px; }
  .card-note  { font-size:24px; color:#cbd5e1; line-height:1.5; }

  .code-box { background:#1e1e2e; border:3px solid #45475a; border-radius:24px; padding:50px; width:100%; max-width:1400px; font-family:monospace; font-size:32px; line-height:1.8; z-index:10; box-shadow:0 20px 50px rgba(0,0,0,0.6); }
  .code-line { padding:8px 16px; border-radius:8px; color:#cdd6f4; }
  .highlight { background:rgba(137,180,250,0.2); border-left:6px solid #89b4fa; color:#89b4fa; font-weight:bold; }
  .dim       { color:#6c7086; }

  .takeaway-card { background:linear-gradient(135deg,#625bd5,#8b5cf6); border-radius:36px; padding:80px; text-align:center; max-width:1300px; box-shadow:0 20px 60px rgba(98,91,213,0.5); z-index:10; }
  .takeaway-text { font-size:48px; font-weight:900; color:#fff; line-height:1.4; }
`;

function slideHtml(bodyContent) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${SLIDE_CSS}</style></head>
<body>
  <div class="header">
    <span class="tag">CCAF · DOMAIN 1</span>
    <span class="title">03. 拆解合约 (Contract Breakdown)</span>
  </div>
  <div class="body">${bodyContent}</div>
</body></html>`;
}

// ── Beat definitions ──────────────────────────────────────────────────────────
// kind: 'veo'    → use pre-generated Veo MP4 clip (no audio)
// kind: 'slide'  → render HTML slide + attach TTS wav
const beats = [
    {
        id: 'open',
        kind: 'veo',
        clip: path.join(VEO_CLIPS_DIR, 'contract-breakdown--open.mp4'),
        durationSec: 8,
    },
    {
        id: 'problem',
        kind: 'slide',
        durationSec: 9.3,
        audio: path.join(NARRATION_DIR, 'problem.wav'),
        html: slideHtml(`
          <img class="bg-img" src="${backplateUrl}" />
          <div class="flow-container">
            <div class="flow-node">📄 Pull Request</div>
            <div class="arrow">➔</div>
            <div class="flow-node">🎨 代码风格</div>
            <div class="arrow">➔</div>
            <div class="flow-node" style="border-color:#ef4444;color:#fca5a5;">🛡️ 安全漏洞</div>
            <div class="arrow">➔</div>
            <div class="flow-node">📝 文档准确性</div>
          </div>`),
    },
    {
        id: 'trap',
        kind: 'slide',
        durationSec: 10.1,
        audio: path.join(NARRATION_DIR, 'trap.wav'),
        html: slideHtml(`
          <img class="bg-img" src="${backplateUrl}" />
          <div class="compare-grid">
            <div class="card-bad">
              <div class="card-title" style="color:#ef4444;">❌ 路由模式</div>
              <div class="card-note">只分发给单个专家<br/>无法全量覆盖三重关卡</div>
            </div>
            <div class="card-bad">
              <div class="card-title" style="color:#ef4444;">❌ 巨型 Prompt</div>
              <div class="card-note">注意力被大幅稀释<br/>安全检查被悄悄遗漏</div>
            </div>
            <div class="card-good">
              <div class="card-title" style="color:#22c55e;">✅ Prompt Chaining</div>
              <div class="card-note">拆成 3 个独立环节<br/>各司其职，最后汇总</div>
            </div>
          </div>`),
    },
    {
        id: 'switch',
        kind: 'veo',
        clip: path.join(VEO_CLIPS_DIR, 'contract-breakdown--switch.mp4'),
        durationSec: 8,
    },
    {
        id: 'the-code',
        kind: 'slide',
        durationSec: 10.7,
        audio: path.join(NARRATION_DIR, 'the-code.wav'),
        html: slideHtml(`
          <div class="code-box">
            <div class="code-line dim">// 顺序串联（Prompt Chaining）实战代码</div>
            <div class="code-line highlight">const step1 = await checkStyle(prCode);</div>
            <div class="code-line highlight">const step2 = await checkSecurity(prCode);</div>
            <div class="code-line highlight">const step3 = await checkDocs(prCode);</div>
            <div class="code-line" style="color:#a6e3a1;font-weight:bold;margin-top:15px;">return synthesize([step1, step2, step3]);</div>
          </div>`),
    },
    {
        id: 'takeaway',
        kind: 'slide',
        durationSec: 5.0,
        audio: path.join(NARRATION_DIR, 'takeaway.wav'),
        html: slideHtml(`
          <div class="takeaway-card">
            <div class="takeaway-text">
              💡 核心考点：<br/>固定步骤 + 独立视角 = Prompt Chaining
            </div>
          </div>`),
    },
];

// ── Main assembly ─────────────────────────────────────────────────────────────
async function assemble() {
    console.log('🚀 Assembling course video with real Veo clips + rendered slides...\n');

    const browser = await chromium.launch();
    const page    = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const clips = [];

    for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        const clipOut = path.join(FRAMES_DIR, `clip_${String(i).padStart(2,'0')}_${beat.id}.mp4`);
        clips.push(clipOut);

        if (beat.kind === 'veo') {
            // ── Use real Veo video, mux silent audio track so concat works ──
            console.log(`🎬 [${i+1}/${beats.length}] VEO clip: ${beat.id}`);
            if (!fs.existsSync(beat.clip)) {
                throw new Error(`Missing Veo clip: ${beat.clip}. Run generate-veo-clips.mjs first.`);
            }
            execSync(
                `ffmpeg -i "${beat.clip}" ` +
                `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 ` +
                `-c:v libx264 -c:a aac -b:a 128k ` +
                `-t ${beat.durationSec} -shortest ` +
                `-pix_fmt yuv420p -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" ` +
                `-y "${clipOut}"`,
                { stdio: 'ignore' }
            );
        } else {
            // ── Render HTML slide → screenshot → video + TTS audio ──
            console.log(`🖼  [${i+1}/${beats.length}] Slide: ${beat.id}  (${beat.durationSec}s)`);
            const imgPath = path.join(FRAMES_DIR, `slide_${i}_${beat.id}.png`);
            await page.setContent(beat.html, { waitUntil: 'networkidle' });
            await page.screenshot({ path: imgPath });

            const hasAudio = beat.audio && fs.existsSync(beat.audio);
            if (hasAudio) {
                execSync(
                    `ffmpeg -loop 1 -i "${imgPath}" -i "${beat.audio}" ` +
                    `-c:v libx264 -tune stillimage -c:a aac -b:a 192k ` +
                    `-pix_fmt yuv420p -t ${beat.durationSec} -shortest ` +
                    `-y "${clipOut}"`,
                    { stdio: 'ignore' }
                );
            } else {
                execSync(
                    `ffmpeg -loop 1 -i "${imgPath}" ` +
                    `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 ` +
                    `-c:v libx264 -tune stillimage -c:a aac -b:a 128k ` +
                    `-pix_fmt yuv420p -t ${beat.durationSec} ` +
                    `-y "${clipOut}"`,
                    { stdio: 'ignore' }
                );
            }
        }
        console.log(`   ✓ → ${path.basename(clipOut)}`);
    }

    await browser.close();

    // ── Concat all clips ──
    const listFile = path.join(FRAMES_DIR, 'concat_list.txt');
    fs.writeFileSync(listFile, clips.map(c => `file '${c}'`).join('\n'));

    console.log('\n🎞  Concatenating all clips...');
    execSync(
        `ffmpeg -f concat -safe 0 -i "${listFile}" ` +
        `-c:v libx264 -c:a aac -pix_fmt yuv420p ` +
        `-y "${FINAL_MP4}"`,
        { stdio: 'inherit' }
    );

    console.log(`\n✅ Final video: ${FINAL_MP4}`);
    const stat = fs.statSync(FINAL_MP4);
    console.log(`   Size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
}

assemble().catch(err => { console.error('❌', err.message); process.exit(1); });
