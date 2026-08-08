/**
 * Assemble the acquisition cut of "Design a ChatGPT-like streaming LLM".
 *
 * The render uses new Veo 3.1 Lite clips and TTS narration. It only replaces
 * the public video after the full local render has completed and passed a
 * basic duration check.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { chromium } from 'playwright';
import { SYSTEM_DESIGN_OPENAI_BEATS } from './systemDesignOpenAIScript.ts';
import { karaokeChunks, karaokeHTML, KARAOKE_CSS } from './karaokeSubtitles.mjs';
import { boomerangBed } from './paperCollagePromptGrammar.mjs';

const FPS = 24;
const OUT_DIR = path.resolve('scratchpad/film_render_sd_openai_v2');
const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const NARRATION_DIR = path.resolve('public/assets/system-design-narration/sd-openai-v2/en/chirp-fenrir');
const BGM_PATH = path.resolve('public/assets/bgm-d12.mp3');
const REVIEW_MP4 = path.join(OUT_DIR, 'design-openai.mp4');
const FINAL_MP4 = path.resolve('public/system-design-lessons/design-openai.mp4');

fs.mkdirSync(OUT_DIR, { recursive: true });

function mediaDuration(file) {
    if (!fs.existsSync(file)) return 0;
    try {
        return Number.parseFloat(execFileSync('ffprobe', [
            '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', file,
        ], { encoding: 'utf8' }).trim()) || 0;
    } catch {
        return 0;
    }
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character]));
}

function practiceMarkup() {
    return `
        <aside class="practice-card">
            <div class="practice-eyebrow">CAREERVIVID / SYSTEM DESIGN INTERVIEW</div>
            <h2>Core Design</h2>
            <p>Build the answer, then defend each decision.</p>
            <ol>
                <li><b>01</b><span>Change real system inputs</span></li>
                <li><b>02</b><span>Step through request flow</span></li>
                <li><b>03</b><span>Draw and explain your design</span></li>
            </ol>
            <div class="mini-blueprint" aria-hidden="true">
                <i></i><i></i><i></i><i></i><em></em><em></em><em></em>
            </div>
            <div class="practice-footer">
                <span>Core Design is free to start</span>
                <strong>careervivid.app/learning/system-design-interview</strong>
            </div>
        </aside>`;
}

function overlayHtml(beat, duration) {
    const captions = karaokeHTML(karaokeChunks(beat.narration, duration), duration);
    const isPractice = beat.productMoment === 'practice';
    const concepts = beat.concepts
        .map((concept) => `<span>${escapeHtml(concept)}</span>`)
        .join('');
    const steps = SYSTEM_DESIGN_OPENAI_BEATS
        .map((item) => `<i class="${item.section === beat.section ? 'active' : ''}"></i>`)
        .join('');

    return `<!doctype html>
    <html><head><meta charset="utf-8" />
    <style>
        * { box-sizing: border-box; }
        html, body { width: 1920px; height: 1080px; margin: 0; overflow: hidden; }
        body { position: relative; color: #211c17; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(34, 28, 21, .73) 0%, rgba(34, 28, 21, .25) 43%, rgba(34, 28, 21, .02) 72%); }
        .chapter { position: absolute; top: 52px; left: 58px; display: inline-flex; gap: 12px; align-items: center; border: 1px solid rgba(255, 250, 241, .68); border-radius: 999px; padding: 10px 16px; background: rgba(40, 31, 20, .40); color: #fffaf1; font-size: 18px; font-weight: 800; letter-spacing: .12em; }
        .chapter b { color: #efd39d; }
        .title-card { position: absolute; top: 154px; left: 58px; width: 620px; color: #fffaf1; }
        .title-card .kicker { margin: 0 0 14px; color: #efd39d; font-size: 21px; font-weight: 800; letter-spacing: .12em; }
        .title-card h1 { margin: 0; max-width: 600px; font-size: 61px; line-height: 1.04; letter-spacing: 0; }
        .concepts { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 25px; }
        .concepts span { border: 1px solid rgba(255, 250, 241, .50); border-radius: 5px; padding: 8px 12px; background: rgba(47, 37, 27, .45); color: #fffaf1; font-size: 18px; font-weight: 700; }
        .brand { position: absolute; top: 56px; right: 58px; color: #fffaf1; font-size: 20px; font-weight: 800; letter-spacing: .02em; text-shadow: 0 2px 12px rgba(0,0,0,.35); }
        .progress { position: absolute; bottom: 53px; left: 58px; display: flex; gap: 10px; align-items: center; }
        .progress i { width: 13px; height: 13px; border: 2px solid rgba(255, 250, 241, .72); border-radius: 50%; }
        .progress i.active { background: #d9a651; border-color: #d9a651; box-shadow: 0 0 0 5px rgba(217, 166, 81, .20); }
        .practice-card { position: absolute; inset: 112px 190px 116px 190px; display: flex; flex-direction: column; padding: 52px 62px; border: 1px solid rgba(166, 121, 53, .55); border-radius: 12px; background: rgba(255, 250, 241, .92); box-shadow: 0 28px 100px rgba(30, 22, 12, .28); }
        .practice-eyebrow { color: #a97935; font-size: 19px; font-weight: 850; letter-spacing: .16em; }
        .practice-card h2 { margin: 16px 0 8px; font-size: 68px; line-height: 1; }
        .practice-card p { margin: 0; color: #665a4a; font-size: 27px; font-weight: 600; }
        .practice-card ol { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; list-style: none; margin: 48px 0 34px; padding: 0; }
        .practice-card li { min-height: 120px; padding: 22px; border: 1px solid #e7d8c3; border-radius: 8px; background: #fffdf8; }
        .practice-card li b { display: block; color: #a97935; font-size: 18px; letter-spacing: .10em; }
        .practice-card li span { display: block; margin-top: 12px; font-size: 24px; font-weight: 800; line-height: 1.17; }
        .mini-blueprint { position: relative; width: 530px; height: 125px; margin: 0 auto 26px; }
        .mini-blueprint i { position: absolute; top: 35px; width: 55px; height: 55px; border: 4px solid #211c17; border-radius: 50%; background: #f3d59f; }
        .mini-blueprint i:nth-child(1) { left: 0; } .mini-blueprint i:nth-child(2) { left: 150px; background: #a9d6d1; } .mini-blueprint i:nth-child(3) { left: 300px; background: #f5b2a7; } .mini-blueprint i:nth-child(4) { left: 450px; background: #b9c8f4; }
        .mini-blueprint em { position: absolute; top: 60px; width: 95px; height: 4px; background: #211c17; transform-origin: left; } .mini-blueprint em:nth-child(5) { left: 55px; } .mini-blueprint em:nth-child(6) { left: 205px; } .mini-blueprint em:nth-child(7) { left: 355px; }
        .practice-footer { display: flex; justify-content: space-between; gap: 20px; align-items: end; padding-top: 26px; border-top: 1px solid #e7d8c3; color: #635848; font-size: 22px; font-weight: 750; }
        .practice-footer strong { color: #211c17; }
        ${KARAOKE_CSS}
        ${captions.css}
        .caps { z-index: 5; }
        .practice-card + .caps { display: none; }
    </style></head>
    <body>
        ${isPractice ? practiceMarkup() : `<div class="scrim"></div><div class="chapter"><b>${String(beat.section).padStart(2, '0')}</b> / 06</div><div class="brand">CareerVivid</div><section class="title-card"><p class="kicker">${escapeHtml(beat.kicker.toUpperCase())}</p><h1>${escapeHtml(beat.title)}</h1><div class="concepts">${concepts}</div></section><div class="progress">${steps}</div>`}
        <div class="caps">${captions.html}</div>
    </body></html>`;
}

function runFfmpeg(args) {
    execFileSync('ffmpeg', ['-y', ...args], { stdio: 'pipe' });
}

async function makeOverlayFrames(page, beat, duration, index) {
    const frameDir = path.join(OUT_DIR, `frames-${String(index).padStart(2, '0')}`);
    fs.rmSync(frameDir, { recursive: true, force: true });
    fs.mkdirSync(frameDir, { recursive: true });

    await page.setContent(overlayHtml(beat, duration), { waitUntil: 'load' });
    await page.evaluate(() => document.getAnimations({ subtree: true }).forEach((animation) => animation.pause()));

    const frames = Math.ceil(duration * FPS);
    for (let frame = 0; frame < frames; frame += 1) {
        await page.evaluate((time) => document.getAnimations({ subtree: true })
            .forEach((animation) => { animation.currentTime = time; }), (frame / FPS) * 1000);
        await page.screenshot({
            path: path.join(frameDir, `f${String(frame).padStart(5, '0')}.png`),
            type: 'png',
            omitBackground: true,
            timeout: 0,
        });
    }
    return frameDir;
}

async function render() {
    const beats = SYSTEM_DESIGN_OPENAI_BEATS.map((beat) => {
        const audio = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const clip = path.join(CLIPS_DIR, `sd-openai-v3--${beat.id}.mp4`);
        if (!fs.existsSync(audio)) throw new Error(`Missing narration: ${audio}`);
        if (!fs.existsSync(clip)) throw new Error(`Missing Veo clip: ${clip}`);
        const duration = mediaDuration(audio);
        if (duration < 2) throw new Error(`Invalid narration duration for ${beat.id}`);
        return { beat, audio, clip, duration: duration + 0.35 };
    });

    const totalDuration = beats.reduce((sum, item) => sum + item.duration, 0);
    console.log(`Rendering ${beats.length} beats (${totalDuration.toFixed(1)} seconds).`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const beatFiles = [];

    try {
        for (const [index, item] of beats.entries()) {
            const frameDir = await makeOverlayFrames(page, item.beat, item.duration, index);
            const bed = boomerangBed(item.clip, path.join(OUT_DIR, 'beds', `${item.beat.id}.mp4`));
            if (!bed) throw new Error(`Could not build a background bed for ${item.beat.id}`);
            const output = path.join(OUT_DIR, `beat-${String(index).padStart(2, '0')}.mp4`);
            const duration = item.duration.toFixed(3);
            const drift = `scale=2208:1242:flags=lanczos,crop=1920:1080:x='(iw-ow)*min(t/${duration}\\,1)':y='(ih-oh)/2',fps=${FPS},setsar=1,fade=t=in:st=0:d=0.16,fade=t=out:st=${Math.max(0, item.duration - 0.22).toFixed(3)}:d=0.22`;
            runFfmpeg([
                '-stream_loop', '-1', '-i', bed,
                '-framerate', String(FPS), '-i', path.join(frameDir, 'f%05d.png'),
                '-i', item.audio,
                '-filter_complex', `[0:v]${drift}[background];[background][1:v]overlay=0:0:shortest=1[video]`,
                '-map', '[video]', '-map', '2:a',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
                '-c:a', 'aac', '-b:a', '192k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                '-shortest', output,
            ]);
            fs.rmSync(frameDir, { recursive: true, force: true });
            beatFiles.push(output);
            console.log(`  ${String(index + 1).padStart(2, '0')}/${beats.length} ${item.beat.title}`);
        }
    } finally {
        await browser.close();
    }

    const concatList = path.join(OUT_DIR, 'concat.txt');
    fs.writeFileSync(concatList, beatFiles.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'));
    const combined = path.join(OUT_DIR, 'combined.mp4');
    runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', combined]);

    if (fs.existsSync(BGM_PATH)) {
        runFfmpeg([
            '-i', combined, '-stream_loop', '-1', '-i', BGM_PATH,
            '-filter_complex', `[1:a]volume=0.035,afade=t=in:st=0:d=1,afade=t=out:st=${Math.max(1, totalDuration - 2.2).toFixed(3)}:d=2.2[bed];[0:a][bed]amix=inputs=2:duration=first:dropout_transition=1[audio]`,
            '-map', '0:v', '-map', '[audio]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', REVIEW_MP4,
        ]);
    } else {
        fs.copyFileSync(combined, REVIEW_MP4);
    }

    const finalDuration = mediaDuration(REVIEW_MP4);
    if (finalDuration < 35) throw new Error(`Rendered video is unexpectedly short: ${finalDuration.toFixed(2)}s`);

    fs.copyFileSync(REVIEW_MP4, FINAL_MP4);
    console.log(`Replaced ${FINAL_MP4}`);
    console.log(`Duration: ${finalDuration.toFixed(2)}s`);
}

render().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
