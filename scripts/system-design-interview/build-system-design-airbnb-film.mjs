/**
 * build-system-design-airbnb-film.mjs
 *
 * Assembles the beginner-friendly, hilarious, high-converting YouTube Explainer Gemini Omni AI Video
 * for System Design: How to Design Airbnb (Booking Engine & Double-Booking Prevention).
 * Specs:
 *   1. Double-Booked Snow Cabin Conflict (Two families arriving with keys).
 *   2. Front Desk Master Key Lock (10-minute Redlock Distributed Mutex).
 *   3. Geohash Spatial Index + ElasticSearch Amenity Search (<20ms).
 *   4. Ski Season Dynamic Pricing Engine ($100 in May -> $800 in Dec).
 *   5. Blob Storage + PostgreSQL Transactional ACID Receipts.
 *   6. Non-looping smooth video speed stretch (setpts) + Chirp3-HD Fenrir voiceover + soft BGM fade out.
 *
 * Output: public/system-design-lessons/design-airbnb.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { execCommandLine } from '../lib/safe-exec.mjs';
import { chromium } from 'playwright';
import { SYSTEM_DESIGN_AIRBNB_BEATS } from './systemDesignAirbnbScript.ts';
import { karaokeChunks, karaokeHTML, KARAOKE_CSS } from './karaokeSubtitles.mjs';
import { boomerangBed } from './paperCollagePromptGrammar.mjs';

const FPS = 24;
import { generateTikTokCaptionHTMLCSS } from './tiktokKaraokeEngine.mjs';

const OUT_DIR = path.resolve('scratchpad/film_render_sd_airbnb');
const FINAL_MP4 = path.resolve('public/system-design-lessons/design-airbnb.mp4');
const NARRATION_DIR = path.resolve('public/assets/system-design-narration/sd-airbnb/en/chirp-fenrir');
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

// Beginner-friendly humorous floating concept badges
const SELECTIVE_BADGES = {
    'sd-airbnb-intro': {
        tag: '❄️ DOUBLE-BOOKED SNOW CABIN: RACE CONDITION CONFLICT',
        color: '#f87171',
        bg: 'rgba(127, 29, 29, 0.75)',
        border: '#ef4444',
    },
    'sd-airbnb-redlock-mutex': {
        tag: '🔑 FRONT DESK MASTER KEY LOCK: REDLOCK MUTEX (10 MINS)',
        color: '#34d399',
        bg: 'rgba(6, 78, 59, 0.75)',
        border: '#10b981',
    },
    'sd-airbnb-spatial-search': {
        tag: '🗺️ GEOHASH + ELASTICSEARCH: LAKE TAHOE CABIN SEARCH (<20ms)',
        color: '#7dd3fc',
        bg: 'rgba(12, 74, 110, 0.75)',
        border: '#38bdf8',
    },
    'sd-airbnb-dynamic-pricing': {
        tag: '🎿 SKI SEASON DYNAMIC PRICING: $100 (MAY) ➔ $800 (DEC)',
        color: '#fde047',
        bg: 'rgba(113, 63, 18, 0.75)',
        border: '#eab308',
    },
    'sd-airbnb-storage-acid': {
        tag: '📜 ACID RESERVATION RECEIPTS + S3 PHOTO VAULT',
        color: '#f472b6',
        bg: 'rgba(131, 24, 67, 0.75)',
        border: '#ec4899',
    },
};

function buildHTML(beat, progressPercent, durationSec) {
    // Captions come from the script's own narration — never reworded,
    // only chunked and timed against the measured beat duration.
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

const CLIP_FALLBACKS = {
    'sd-airbnb-photo-vault': path.resolve('public/system-design-lessons/clips/sd-airbnb--sd-airbnb-storage-acid.mp4'),
    'sd-airbnb-call-to-action': path.resolve('public/system-design-lessons/clips/sd-airbnb--sd-airbnb-outro.mp4'),
};

async function assembleAirbnbFilm() {
    console.log('🎬 Assembling Humorous & High-Converting Gemini Omni AI Video for Design Airbnb...\n');

    const beatsToProcess = [];
    let totalSeconds = 0;

    for (const beat of SYSTEM_DESIGN_AIRBNB_BEATS) {
        const audioPath = path.join(NARRATION_DIR, `${beat.id}.wav`);
        let omniVideoFile = path.join(OMNI_CLIPS_DIR, `sd-airbnb--${beat.id}.mp4`);
        if (!fs.existsSync(omniVideoFile) && CLIP_FALLBACKS[beat.id]) {
            omniVideoFile = CLIP_FALLBACKS[beat.id];
        }

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
        // A frame sequence, not one still: the captions change across the beat.
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

        // True speed, looped — never stretched. boomerangBed also scales to
        // 1080p and trims 4% off each edge, removing the border lettering.
        const bed = omniVideoPath
            ? boomerangBed(omniVideoPath, path.join(OUT_DIR, 'beds', `${beat.id}.mp4`))
            : null;
        const drift = `scale=2208:1242:flags=lanczos,crop=1920:1080:x='(iw-ow)*min(t/${durationSec.toFixed(2)}\\,1)':y='(ih-oh)/2',fps=${FPS},setsar=1`;

        const beatMp4 = path.join(OUT_DIR, `beat_${String(i).padStart(2, '0')}.mp4`);
        const setptsFactor = (durationSec / omniSec).toFixed(4);

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

    console.log('\n🎞️ Concatenating all Design Airbnb beat MP4 files into continuous film...');
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

    console.log(`\n🎉 Design Airbnb Gemini Omni AI Video Successfully Compiled!`);
    console.log(`📹 Output Video: ${FINAL_MP4}`);
    console.log(`⏱️ Duration: ${(finalDuration / 60).toFixed(2)} mins (${finalDuration.toFixed(1)}s)`);
    console.log(`📦 Size: ${finalSize} MB`);
}

assembleAirbnbFilm().catch(console.error);
