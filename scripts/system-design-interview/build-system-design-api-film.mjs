/**
 * build-system-design-api-film.mjs
 *
 * Compiles Documentary Explainer Video for:
 *   System Design Interview — Core Design: APIs & Data Models
 *
 * Output: public/ccaf-lessons/system-design-apis-and-data-models.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { SYSTEM_DESIGN_API_BEATS } from './systemDesignApiDataScript.ts';

const OUT_DIR = path.resolve('scratchpad/film_render_sd_api_data');
const FINAL_MP4 = path.resolve('public/ccaf-lessons/system-design-apis-and-data-models.mp4');
const NARRATION_DIR = path.resolve('public/assets/ccaf-narration/sd-api-data/en/chirp-fenrir');
const BACKPLATE_DIR = path.resolve('public/assets/ccaf-backplates');
const BGM_D12_PATH = path.resolve('public/assets/bgm-d12.mp3');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function getWavDurationSeconds(wavPath) {
    if (!fs.existsSync(wavPath)) return 0;
    try {
        const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavPath}"`, { encoding: 'utf8' });
        return parseFloat(out.trim()) || 0;
    } catch {
        return 0;
    }
}

function buildHTML(beat, backplateUrl, progressPercent) {
    const subtitleEn = beat.narration?.en ?? '';
    const subtitleZh = beat.narration?.zh ?? '';

    let mainCardBody = '';

    if (beat.visual.steps) {
        mainCardBody = `
            <div class="steps-container">
                ${beat.visual.steps.map(s => `<div class="step-item">${s}</div>`).join('')}
            </div>
            <div class="compare-grid" style="margin-top: 20px;">
                <div class="compare-box box-red">
                    <div class="box-head">${beat.visual.badOption.head}</div>
                    <div class="box-body">${beat.visual.badOption.body}</div>
                </div>
                <div class="compare-box box-green">
                    <div class="box-head">${beat.visual.goodOption.head}</div>
                    <div class="box-body">${beat.visual.goodOption.body}</div>
                </div>
            </div>
        `;
    } else {
        mainCardBody = `
            <div class="compare-grid">
                <div class="compare-box box-red">
                    <div class="box-head">${beat.visual.badOption.head}</div>
                    <div class="box-body">${beat.visual.badOption.body}</div>
                </div>
                <div class="compare-box box-green">
                    <div class="box-head">${beat.visual.goodOption.head}</div>
                    <div class="box-body">${beat.visual.goodOption.body}</div>
                </div>
            </div>
        `;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8"/>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                width: 1920px; height: 1080px;
                background-color: #0b0f19;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: #ffffff;
                position: relative;
                overflow: hidden;
            }
            .backplate {
                position: absolute;
                inset: 0;
                width: 100%; height: 100%;
                object-fit: cover;
                opacity: 0.90;
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
                padding: 10px 24px;
                border-radius: 30px;
                font-weight: 700;
                font-size: 20px;
                color: #38bdf8;
                letter-spacing: 0.5px;
                backdrop-filter: blur(12px);
            }
            .brand-badge {
                background: rgba(15, 23, 42, 0.90);
                border: 1px solid #334155;
                padding: 8px 20px;
                border-radius: 20px;
                font-size: 18px;
                color: #94a3b8;
                backdrop-filter: blur(12px);
            }
            .center-stage {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 20px;
            }
            .card {
                width: 1140px;
                padding: 38px 48px;
                border-radius: 24px;
                background: rgba(13, 17, 23, 0.92);
                backdrop-filter: blur(16px);
                border: 2px solid #38bdf8;
                box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 40px rgba(56, 189, 248, 0.25);
            }

            .card-badge {
                display: inline-block;
                padding: 6px 18px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 800;
                letter-spacing: 1px;
                margin-bottom: 16px;
                background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid #38bdf8;
            }

            .card-title { font-size: 36px; font-weight: 800; color: #ffffff; margin-bottom: 22px; }

            .steps-container {
                display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;
            }
            .step-item {
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid #334155;
                padding: 10px 18px;
                border-radius: 12px;
                font-size: 18px;
                font-weight: 700;
                color: #7dd3fc;
            }

            .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; margin-top: 10px; }
            .compare-box { padding: 22px; border-radius: 18px; border: 2px solid; }
            .box-red { background: rgba(69, 10, 10, 0.65); border-color: #ef4444; }
            .box-green { background: rgba(6, 78, 59, 0.65); border-color: #10b981; }
            .box-head { font-weight: 800; font-size: 22px; margin-bottom: 10px; }
            .box-red .box-head { color: #fca5a5; }
            .box-green .box-head { color: #6ee7b7; }
            .box-body { font-size: 19px; color: #e2e8f0; line-height: 1.5; }

            .subtitle-container {
                background: rgba(15, 23, 42, 0.94);
                border: 2px solid #334155;
                padding: 16px 36px;
                border-radius: 20px;
                text-align: center;
                backdrop-filter: blur(12px);
                max-width: 1600px;
                margin: 0 auto;
            }
            .sub-en { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 6px; }
            .sub-zh { font-size: 18px; color: #94a3b8; }

            .progress-bar {
                position: absolute; bottom: 0; left: 0; height: 6px;
                background: linear-gradient(90deg, #38bdf8, #10b981, #f59e0b, #ec4899);
                width: ${progressPercent}%;
                transition: width 0.3s linear;
            }
        </style>
    </head>
    <body>
        ${backplateUrl ? `<img class="backplate" src="${backplateUrl}"/>` : ''}
        <div class="overlay-container">
            <div class="top-bar">
                <div class="ch-badge">${beat.title.en}</div>
                <div class="brand-badge">CareerVivid System Design</div>
            </div>
            <div class="center-stage">
                <div class="card">
                    <div class="card-badge">${beat.visual.badge}</div>
                    <div class="card-title">${beat.visual.cardTitle}</div>
                    ${mainCardBody}
                </div>
            </div>
            <div class="subtitle-container">
                <div class="sub-en">${subtitleEn}</div>
                <div class="sub-zh">${subtitleZh}</div>
            </div>
        </div>
        <div class="progress-bar"></div>
    </body>
    </html>
    `;
}

async function buildFilm() {
    console.log('🚀 Rendering Documentary Video: System Design - APIs & Data Models...\n');

    const beatsToProcess = [];
    let totalSeconds = 0;

    for (const beat of SYSTEM_DESIGN_API_BEATS) {
        const audioPath = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const backplateFile = path.join(BACKPLATE_DIR, `sd-api--${beat.id}.png`);

        let hasAudio = fs.existsSync(audioPath);
        let durationSec = hasAudio ? getWavDurationSeconds(audioPath) : 3.5;

        beatsToProcess.push({
            beat,
            durationSec: Math.max(durationSec, 3.5),
            audioPath: hasAudio ? audioPath : null,
            backplatePath: fs.existsSync(backplateFile) ? backplateFile : null,
        });

        totalSeconds += Math.max(durationSec, 3.5);
    }

    console.log(`📹 Total Beats: ${beatsToProcess.length}`);
    console.log(`⏱️ Estimated Video Duration: ${(totalSeconds / 60).toFixed(2)} mins (${totalSeconds.toFixed(1)}s)\n`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const beatVideoFiles = [];
    let accumulatedTime = 0;

    for (let i = 0; i < beatsToProcess.length; i++) {
        const { beat, durationSec, audioPath, backplatePath } = beatsToProcess[i];
        accumulatedTime += durationSec;
        const progressPercent = Math.round((accumulatedTime / totalSeconds) * 100);

        console.log(`🎬 Processing Beat [${i + 1}/${beatsToProcess.length}]: ${beat.id} (${durationSec.toFixed(1)}s)...`);

        let backplateDataUrl = '';
        if (backplatePath) {
            const base64 = fs.readFileSync(backplatePath).toString('base64');
            backplateDataUrl = `data:image/png;base64,${base64}`;
        }

        const html = buildHTML(beat, backplateDataUrl, progressPercent);
        await page.setContent(html, { waitUntil: 'load' });

        const frameImgPath = path.join(OUT_DIR, `beat_${String(i).padStart(2, '0')}.png`);
        await page.screenshot({ path: frameImgPath, type: 'png' });

        const beatMp4 = path.join(OUT_DIR, `beat_${String(i).padStart(2, '0')}.mp4`);

        let ffmpegCmd = '';
        if (audioPath) {
            ffmpegCmd = `ffmpeg -y -loop 1 -i "${frameImgPath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${beatMp4}"`;
        } else {
            ffmpegCmd = `ffmpeg -y -loop 1 -i "${frameImgPath}" -f lavfi -i anullsrc=r=24000:cl=mono -c:v libx264 -tune stillimage -c:a aac -t ${durationSec.toFixed(2)} -pix_fmt yuv420p "${beatMp4}"`;
        }

        execSync(ffmpegCmd, { stdio: 'pipe' });
        beatVideoFiles.push(beatMp4);
    }

    await browser.close();

    console.log('\n🎞️ Concatenating all beat MP4 files into continuous film...');
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
    const finalDuration = getWavDurationSeconds(FINAL_MP4);

    console.log(`\n🎉 System Design Documentary Video Successfully Compiled!`);
    console.log(`📹 Output Video: ${FINAL_MP4}`);
    console.log(`⏱️ Duration: ${(finalDuration / 60).toFixed(2)} mins (${finalDuration.toFixed(1)}s)`);
    console.log(`📦 Size: ${finalSize} MB`);
}

buildFilm().catch(console.error);
