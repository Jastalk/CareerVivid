/**
 * build-designx-film.mjs — the Design X series builder.
 *
 * Synthesises narration and assembles the film in one pass. Everything it does
 * is the settled pipeline from SKILL v3: boomerang beds at true speed with a
 * slow drift over them, TikTok-style English captions rendered as a frame
 * sequence, paper concept tags, and nothing else floating over the picture.
 *
 * Run:  npx tsx scripts/ccaf/build-designx-film.mjs [episodeId]
 * Add --skip-tts to reuse narration already on disk.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { execCommandLine } from '../lib/safe-exec.mjs';
import { chromium } from 'playwright';
import { GoogleAuth } from 'google-auth-library';
import { DESIGN_X_EPISODES, CTA_URL } from './designXScript.ts';
import { karaokeChunks, karaokeHTML, KARAOKE_CSS } from './karaokeSubtitles.mjs';
import { boomerangBed } from './paperCollagePromptGrammar.mjs';

const FPS = 24;
const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const BGM = path.resolve('public/assets/bgm-d12.mp3');

/**
 * Beats whose own shot could not be generated reuse another.
 *
 * `crowd-one-cell` was rejected by the safety filter through three rewrites —
 * a crowd packing into one square is crowd-crush imagery, and replacing the
 * people with pins did not clear it either. Per the skill's own rule, stop
 * paying after the third attempt and point the beat at a shot that already
 * works: densely packed jittering pins say "it all landed in one place" fine.
 */
const CLIP_FOR = { 'crowd-one-cell': 'counter-tick' };

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wavSeconds = (p) => (fs.statSync(p).size - 44) / (24000 * 2);

// ── Narration ───────────────────────────────────────────────────────────────

async function synthesise(episode, dir) {
    fs.mkdirSync(dir, { recursive: true });
    // Point at the service account explicitly. Application-default credentials
    // on this machine are a stale user grant and come back `invalid_grant`.
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
    }
    const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    const token = await (await auth.getClient()).getAccessToken();

    for (const beat of episode.beats) {
        const out = path.join(dir, `${beat.id}.wav`);
        if (fs.existsSync(out)) { console.log(`   ⏭  ${beat.id}`); continue; }
        const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token.token ?? token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { text: beat.narration.en },
                voice: { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Fenrir' },
                audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
            }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
        fs.writeFileSync(out, Buffer.from(body.audioContent, 'base64'));
        console.log(`   ✅ ${beat.id.padEnd(16)} ${wavSeconds(out).toFixed(1)}s`);
    }
}

// ── Overlay ─────────────────────────────────────────────────────────────────

function buildHTML(beat, episode, duration, isLast) {
    const caps = karaokeHTML(karaokeChunks(beat.narration, duration), duration);
    const tags = (beat.labels ?? [])
        .map((l, i) => `<div class="tag" style="left:${l.x}%;top:${l.y}%;animation-delay:${(0.5 + i * 0.45).toFixed(2)}s">${esc(l.text)}</div>`)
        .join('');

    // The end card is the only branded moment in the film, and it is the whole
    // reason the film exists on YouTube — one URL, held long enough to read.
    const endCard = isLast
        ? `<div class="cta"><div class="cta-t">${esc(episode.title)}</div><div class="cta-u">${esc(CTA_URL)}</div></div>`
        : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 1920px; height: 1080px; overflow: hidden; background: transparent; color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .sec { position: absolute; top: 40px; left: 60px; z-index: 10;
            background: rgba(15,23,42,0.72); border: 1px solid rgba(56,189,248,0.55); color: #7dd3fc;
            padding: 9px 22px; border-radius: 24px; font-weight: 800; font-size: 18px; letter-spacing: 1.2px;
            opacity: 0; animation: fadein 0.5s ease-out 0.1s forwards; }
        @keyframes fadein { to { opacity: 1; } }
        .tag { position: absolute; z-index: 15; transform: translate(-50%, -50%) rotate(-0.8deg);
            background: #f6f1e4; color: #14181f; border: 2px solid #14181f; border-bottom-width: 5px;
            border-radius: 4px; padding: 7px 16px; font-size: 25px; font-weight: 900; letter-spacing: 1.2px;
            box-shadow: 0 6px 16px rgba(0,0,0,0.28);
            opacity: 0; animation: tagin 0.32s cubic-bezier(0.34, 1.45, 0.64, 1) forwards; }
        @keyframes tagin {
            from { opacity: 0; transform: translate(-50%, calc(-50% + 14px)) rotate(2deg) scale(0.9); }
            to   { opacity: 1; transform: translate(-50%, -50%) rotate(-0.8deg) scale(1); } }
        .cta { position: absolute; z-index: 18; left: 50%; top: 30%; transform: translateX(-50%);
            text-align: center; opacity: 0; animation: fadein 0.8s ease-out 1.2s forwards; }
        .cta-t { font-size: 40px; font-weight: 900; color: #fff; letter-spacing: 1px;
            text-shadow: 0 0 4px #000, 0 4px 22px rgba(0,0,0,0.9); }
        .cta-u { margin-top: 16px; display: inline-block; background: #f6f1e4; color: #14181f;
            border: 2px solid #14181f; border-bottom-width: 6px; border-radius: 6px;
            padding: 12px 26px; font-size: 30px; font-weight: 900; letter-spacing: 0.5px; }
        ${KARAOKE_CSS}
        ${caps.css}
        .progress { position: absolute; z-index: 12; left: 0; bottom: 0; height: 6px; width: 100%;
            transform-origin: left; transform: scaleX(0);
            background: linear-gradient(90deg, #38bdf8, #34d399, #fbbf24, #f472b6);
            animation: fill ${duration}s linear forwards; }
        @keyframes fill { to { transform: scaleX(1); } }
    </style></head><body>
        <div class="sec">${esc(beat.section)}</div>
        ${tags}${endCard}
        <div class="caps">${caps.html}</div>
        <div class="progress"></div>
    </body></html>`;
}

// ── Build ───────────────────────────────────────────────────────────────────

async function main() {
    const wanted = process.argv.slice(2).find(a => !a.startsWith('-'));
    const episode = wanted
        ? DESIGN_X_EPISODES.find(e => e.id === wanted)
        : DESIGN_X_EPISODES[0];
    if (!episode) throw new Error(`unknown episode: ${wanted}`);

    const OUT_DIR = path.resolve(`scratchpad/film_${episode.id}`);
    const BEDS_DIR = path.join(OUT_DIR, 'beds');
    const NARRATION_DIR = path.resolve(`public/assets/system-design-narration/${episode.id}/en/chirp-fenrir`);
    const FINAL = path.resolve(`public/system-design-lessons/${episode.id}.mp4`);
    fs.mkdirSync(OUT_DIR, { recursive: true });

    if (!process.argv.includes('--skip-tts')) {
        console.log(`🎙  ${episode.title} — narration`);
        await synthesise(episode, NARRATION_DIR);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const parts = [];

    for (const [i, beat] of episode.beats.entries()) {
        const wav = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const duration = Math.max(fs.existsSync(wav) ? wavSeconds(wav) + 0.35 : 4, 3.5);
        const out = path.join(OUT_DIR, `${String(i).padStart(2, '0')}-${beat.id}.mp4`);
        parts.push(out);
        console.log(`🎬 [${i + 1}/${episode.beats.length}] ${beat.id} — ${duration.toFixed(1)}s`);

        const framesDir = path.join(OUT_DIR, `frames-${beat.id}`);
        fs.rmSync(framesDir, { recursive: true, force: true });
        fs.mkdirSync(framesDir, { recursive: true });

        await page.setContent(buildHTML(beat, episode, duration, i === episode.beats.length - 1), { waitUntil: 'load' });
        await page.evaluate(() => document.getAnimations({ subtree: true }).forEach(a => a.pause()));
        const frames = Math.ceil(duration * FPS);
        for (let f = 0; f < frames; f += 1) {
            await page.evaluate((ms) => document.getAnimations({ subtree: true })
                .forEach(a => { a.currentTime = ms; }), (f / FPS) * 1000);
            await page.screenshot({
                path: path.join(framesDir, `f${String(f).padStart(5, '0')}.png`),
                type: 'png', omitBackground: true,
            });
        }

        const clipId = CLIP_FOR[beat.clip] ?? beat.clip;
        const bed = boomerangBed(
            path.join(CLIPS_DIR, `dx-uber--${clipId}.mp4`),
            path.join(BEDS_DIR, `${clipId}.mp4`));
        if (!bed) throw new Error(`missing footage for ${beat.id} (${clipId})`);

        // Drift so repeated passes through the loop are never framed the same.
        const drift = `scale=2208:1242:flags=lanczos,crop=1920:1080:x='(iw-ow)*min(t/${duration.toFixed(2)}\\,1)':y='(ih-oh)/2',fps=${FPS},setsar=1`;
        execCommandLine(
            `ffmpeg -y -stream_loop -1 -i "${bed}" -framerate ${FPS} -i "${framesDir}/f%05d.png" -i "${wav}" ` +
            `-filter_complex "[0:v]${drift}[bg];[bg][1:v]overlay=0:0:shortest=1[v]" ` +
            `-map "[v]" -map 2:a -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${out}"`,
            { stdio: 'pipe' });
        fs.rmSync(framesDir, { recursive: true, force: true });
    }
    await browser.close();

    const list = path.join(OUT_DIR, 'concat.txt');
    fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
    const raw = path.join(OUT_DIR, 'raw.mp4');
    execSync(`ffmpeg -y -f concat -safe 0 -i "${list}" -c copy "${raw}"`, { stdio: 'pipe' });

    execSync(
        `ffmpeg -y -i "${raw}" -i "${BGM}" -filter_complex ` +
        `"[1:a]volume=0.05,afade=t=out:st=3.5:d=3.5[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]" ` +
        `-map 0:v -map "[a]" -r ${FPS} -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p ` +
        `-c:a aac -b:a 128k -movflags +faststart "${FINAL}"`,
        { stdio: 'pipe' });

    const probe = execSync(`ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "${FINAL}"`, { encoding: 'utf8' });
    console.log(`\n🎉 ${FINAL}\n${probe}`);
}

main().catch(e => { console.error(e); process.exit(1); });
