/**
 * build-system-design-ytlive-film.mjs
 *
 * Assembles 1080p YouTube Explainer Gemini Omni AI Video for:
 *   System Design: How to Design YouTube Live Streaming at Scale (Low-Latency HLS & CDN Origin Shielding)
 *
 * Output: public/system-design-lessons/design-youtube-live.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { execCommandLine } from '../lib/safe-exec.mjs';
import { chromium } from 'playwright';
import { SYSTEM_DESIGN_YOUTUBE_LIVE_BEATS } from './systemDesignYouTubeLiveScript.ts';
import { karaokeChunks, karaokeHTML, KARAOKE_CSS } from './karaokeSubtitles.mjs';
import { boomerangBed } from './paperCollagePromptGrammar.mjs';

const FPS = 24;
const OUT_DIR = path.resolve('scratchpad/film_render_sd_ytlive');
const FINAL_MP4 = path.resolve('public/system-design-lessons/design-youtube-live.mp4');
const NARRATION_DIR = path.resolve('public/assets/system-design-narration/sd-ytlive/en/chirp-fenrir');
const OMNI_CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const BGM_D12_PATH = path.resolve('public/assets/bgm-d12.mp3');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function getMediaDurationSeconds(filePath) {
    if (!fs.existsSync(filePath)) return 0;
    try {
        const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' });
        return parseFloat(out.trim()) || 0;
    } catch {
        return 0;
    }
}

const SELECTIVE_BADGES = {
    'sd-ytlive-intro': {
        tag: '📡 5M CONCURRENT VIEWERS: THUNDERING HERD AT LIVE ORIGIN',
        color: '#f87171',
        bg: 'rgba(127, 29, 29, 0.75)',
        border: '#ef4444',
    },
    'sd-ytlive-ingest-gateway': {
        tag: '⚡ RTMP & SRT INGEST: 200MS MICRO-CHUNK SEGMENTATION',
        color: '#34d399',
        bg: 'rgba(6, 78, 59, 0.75)',
        border: '#10b981',
    },
    'sd-ytlive-llhls-webrtc': {
        tag: '🚀 LOW-LATENCY HLS: HTTP/2 PARTIAL CHUNK PUSH (<2S LATENCY)',
        color: '#7dd3fc',
        bg: 'rgba(12, 74, 110, 0.75)',
        border: '#38bdf8',
    },
    'sd-ytlive-cdn-shield': {
        tag: '🛡️ CDN ORIGIN SHIELDING: 1M EDGE REQUESTS ➔ 1 ORIGIN FETCH',
        color: '#fde047',
        bg: 'rgba(113, 63, 18, 0.75)',
        border: '#eab308',
    },
    'sd-ytlive-live-chat': {
        tag: '💬 CHAT FAN-OUT: REDIS PUB/SUB + SLIDING WINDOW LIMITERS',
        color: '#f472b6',
        bg: 'rgba(131, 24, 67, 0.75)',
        border: '#ec4899',
    },
};

function buildHTML(beat, progressPercent, durationSec) {
    const caps = karaokeHTML(karaokeChunks(beat.narration, durationSec), durationSec);
    const selectiveBadge = SELECTIVE_BADGES[beat.id];

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8"/>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                width: 1920px; height: 1080px;
                background: transparent;
                font-family: -apple-system, BlinkMacSystemFont, "Montserrat", "Arial Black", sans-serif;
                color: #ffffff;
                position: relative;
                overflow: hidden;
            }
            .overlay-container {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 40px 60px 50px 60px;
                z-index: 10;
            }
            .top-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ch-badge {
                background: rgba(15, 23, 42, 0.90);
                border: 2px solid #38bdf8;
                padding: 12px 28px;
                border-radius: 30px;
                font-weight: 800;
                font-size: 22px;
                color: #38bdf8;
                letter-spacing: 0.5px;
                backdrop-filter: blur(12px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            .brand-badge {
                background: rgba(15, 23, 42, 0.90);
                border: 1px solid #334155;
                padding: 10px 24px;
                border-radius: 20px;
                font-size: 19px;
                font-weight: 700;
                color: #94a3b8;
                backdrop-filter: blur(12px);
            }
            .selective-callout-rail {
                position: absolute;
                top: 130px; right: 60px;
                z-index: 20;
            }
            .concept-pill {
                padding: 12px 26px;
                border-radius: 16px;
                font-size: 20px;
                font-weight: 800;
                letter-spacing: 0.8px;
                backdrop-filter: blur(16px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
            }
            .progress-bar {
                position: absolute; bottom: 0; left: 0; height: 6px;
                background: linear-gradient(90deg, #38bdf8, #10b981, #f59e0b, #ec4899);
                width: ${progressPercent}%;
                transition: width 0.3s linear;
            }
        ${KARAOKE_CSS}
        ${caps.css}
        </style>
    </head>
    <body>
        <div class="caps">${caps.html}</div>
        <div class="overlay-container">
            <div class="top-bar">
                <div class="ch-badge">${beat.title.en}</div>
                <div class="brand-badge">CareerVivid System Design</div>
            </div>

            ${selectiveBadge ? `
            <div class="selective-callout-rail">
                <div class="concept-pill" style="background: ${selectiveBadge.bg}; color: ${selectiveBadge.color}; border: 2px solid ${selectiveBadge.border};">
                    ${selectiveBadge.tag}
                </div>
            </div>
            ` : ''}
        </div>
        <div class="progress-bar"></div>
    </body>
    </html>
    `;
}

async function assembleFilm() {
    console.log('🎬 Assembling Gemini Omni AI Video for Design YouTube Live...\n');

    const beatsToProcess = [];
    let totalSeconds = 0;

    for (const beat of SYSTEM_DESIGN_YOUTUBE_LIVE_BEATS) {
        const audioPath = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const omniVideoFile = path.join(OMNI_CLIPS_DIR, `sd-ytlive--${beat.id}.mp4`);

        let hasAudio = fs.existsSync(audioPath);
        let durationSec = hasAudio ? getMediaDurationSeconds(audioPath) : 8.0;
        let omniSec = fs.existsSync(omniVideoFile) ? getMediaDurationSeconds(omniVideoFile) : 8.0;

        beatsToProcess.push({
            beat,
            durationSec: Math.max(durationSec, 3.5),
            omniSec: omniSec || 8.0,
            audioPath: hasAudio ? audioPath : null,
            omniVideoPath: fs.existsSync(omniVideoFile) ? omniVideoFile : null,
        });

        totalSeconds += Math.max(durationSec, 3.5);
    }

    console.log(`📹 Beats to Assemble: ${beatsToProcess.length}`);
    console.log(`⏱️ Total Video Duration: ${(totalSeconds / 60).toFixed(2)} mins (${totalSeconds.toFixed(1)}s)\n`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const beatVideoFiles = [];
    let accumulatedTime = 0;

    for (let i = 0; i < beatsToProcess.length; i++) {
        const { beat, durationSec, omniSec, audioPath, omniVideoPath } = beatsToProcess[i];
        accumulatedTime += durationSec;
        const progressPercent = Math.round((accumulatedTime / totalSeconds) * 100);

        console.log(`🎬 Assembling Beat [${i + 1}/${beatsToProcess.length}]: ${beat.id} (${durationSec.toFixed(1)}s narration, ${omniSec.toFixed(1)}s Omni clip)...`);

        const html = buildHTML(beat, progressPercent, durationSec);
        await page.setContent(html, { waitUntil: 'load' });

        const overlayPngPath = path.join(OUT_DIR, `overlay_${String(i).padStart(2, '0')}.png`);
        const framesDir = path.join(OUT_DIR, `frames_${String(i).padStart(2, '0')}`);
        fs.rmSync(framesDir, { recursive: true, force: true });
        fs.mkdirSync(framesDir, { recursive: true });

        await page.evaluate(() => document.getAnimations({ subtree: true }).forEach(a => a.pause()));
        const frameCount = Math.ceil(durationSec * FPS);
        for (let f = 0; f < frameCount; f += 1) {
            await page.evaluate((ms) => document.getAnimations({ subtree: true })
                .forEach(a => { a.currentTime = ms; }), (f / FPS) * 1000);
            const framePath = path.join(framesDir, `f${String(f).padStart(5, '0')}.png`);
            await page.screenshot({ path: framePath, type: 'png', omitBackground: true, timeout: 0 });
            if (f === 0) fs.copyFileSync(framePath, overlayPngPath);
        }
        const overlayIn = `-framerate ${FPS} -i "${framesDir}/f%05d.png"`;

        const bed = omniVideoPath ? boomerangBed(omniVideoPath, path.join(OUT_DIR, 'beds', `${beat.id}.mp4`)) : null;
        const drift = `scale=2208:1242:flags=lanczos,crop=1920:1080:x='(iw-ow)*min(t/${durationSec.toFixed(2)}\\,1)':y='(ih-oh)/2',fps=${FPS},setsar=1`;
        const beatMp4 = path.join(OUT_DIR, `beat_${String(i).padStart(2, '0')}.mp4`);

        let ffmpegCmd = '';
        if (bed) {
            if (audioPath) {
                ffmpegCmd = `ffmpeg -y -stream_loop -1 -i "${bed}" ${overlayIn} -i "${audioPath}" -filter_complex "[0:v]${drift}[bg];[bg][1:v]overlay=0:0:shortest=1[v]" -map "[v]" -map 2:a -c:v libx264 -preset medium -crf 21 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${beatMp4}"`;
            } else {
                ffmpegCmd = `ffmpeg -y -stream_loop -1 -i "${bed}" ${overlayIn} -f lavfi -i anullsrc=r=24000:cl=mono -filter_complex "[0:v]${drift}[bg];[bg][1:v]overlay=0:0:shortest=1[v]" -map "[v]" -map 2:a -c:v libx264 -preset medium -crf 21 -c:a aac -t ${durationSec.toFixed(2)} -pix_fmt yuv420p "${beatMp4}"`;
            }
        } else {
            if (audioPath) {
                ffmpegCmd = `ffmpeg -y -loop 1 -i "${overlayPngPath}" -i "${audioPath}" -r 30 -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 256k -pix_fmt yuv420p -shortest "${beatMp4}"`;
            } else {
                ffmpegCmd = `ffmpeg -y -loop 1 -i "${overlayPngPath}" -f lavfi -i anullsrc=r=24000:cl=mono -r 30 -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 256k -t ${durationSec.toFixed(2)} -pix_fmt yuv420p "${beatMp4}"`;
            }
        }

        execCommandLine(ffmpegCmd, { stdio: 'pipe' });
        fs.rmSync(framesDir, { recursive: true, force: true });
        beatVideoFiles.push(beatMp4);
    }

    await browser.close();

    console.log('\n🎞️ Concatenating beat MP4 files into continuous film...');
    const rawConcatMp4 = path.join(OUT_DIR, 'raw_concat.mp4');
    const concatListPath = path.join(OUT_DIR, 'concat_list.txt');
    const concatContent = beatVideoFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${rawConcatMp4}"`, { stdio: 'pipe' });

    console.log('\n🎵 Muxing soft intro BGM (bgm-d12.mp3, volume=0.05, fading out by sec 7.0)...');

    if (fs.existsSync(BGM_D12_PATH)) {
        const muxCmd = `ffmpeg -y -i "${rawConcatMp4}" -i "${BGM_D12_PATH}" -filter_complex "[1:a]volume=0.05,afade=t=out:st=3.5:d=3.5[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${FINAL_MP4}"`;
        execSync(muxCmd, { stdio: 'pipe' });
    } else {
        fs.copyFileSync(rawConcatMp4, FINAL_MP4);
    }

    const finalSize = fs.existsSync(FINAL_MP4) ? (fs.readFileSync(FINAL_MP4).length / (1024 * 1024)).toFixed(2) : 0;
    const finalDuration = getMediaDurationSeconds(FINAL_MP4);

    console.log(`\n🎉 Design YouTube Live Video Successfully Compiled!`);
    console.log(`📹 Output Video: ${FINAL_MP4}`);
    console.log(`⏱️ Duration: ${(finalDuration / 60).toFixed(2)} mins (${finalDuration.toFixed(1)}s)`);
    console.log(`📦 Size: ${finalSize} MB`);
}

assembleFilm().catch(console.error);
