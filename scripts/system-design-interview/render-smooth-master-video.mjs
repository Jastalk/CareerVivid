/**
 * render-smooth-master-video.mjs
 *
 * Professional Video Editing & Smooth Transition Pipeline for WhatsApp System Design:
 *   1. Prepares 6 clean, watermark-free clips (Hook, WebSockets, Encryption, Queues, Media, Outro CTA).
 *   2. Applies FFmpeg `xfade=transition=fade` video dissolve and `acrossfade` audio crossfade.
 *   3. Strips AI watermark completely via 93% vertical crop + 1080p high-bitrate bicubic scaling.
 *   4. Outputs final 1-minute narrative video to:
 *      /Users/jiawenzhu/Developer/careervivid/public/system-design-lessons/design-whatsapp-omni.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const MASTER_OUTPUT = path.resolve('public/system-design-lessons/design-whatsapp-omni.mp4');

const RAW_CLIPS = [
    { id: 'clean-1', raw: path.join(CLIPS_DIR, 'whatsapp-omni-raw-1.mp4') },
    { id: 'clean-2', raw: path.join(CLIPS_DIR, 'whatsapp-omni-raw-2.mp4') },
    { id: 'clean-3', raw: path.join(CLIPS_DIR, 'whatsapp-omni-raw-3.mp4') },
    { id: 'clean-4', raw: path.join(CLIPS_DIR, 'whatsapp-omni-raw-4.mp4') },
    { id: 'clean-5', raw: path.join(CLIPS_DIR, 'whatsapp-omni-clip-5-media.mp4') },
    { id: 'clean-6', raw: path.join(CLIPS_DIR, 'whatsapp-omni-clip-6-outro.mp4') }
];

async function renderSmoothMasterVideo() {
    console.log(`========================================================`);
    console.log(`🎬 RENDERING SMOOTH & COMPLETE WHATSAPP MASTER VIDEO`);
    console.log(`========================================================\n`);

    const cleanPaths = [];

    // Step 1: Crop watermark & standardize format for all 6 clips
    for (let i = 0; i < RAW_CLIPS.length; i++) {
        const item = RAW_CLIPS[i];
        if (!fs.existsSync(item.raw)) {
            console.warn(`⚠️ Raw file missing for ${item.id}, checking alternative...`);
            continue;
        }

        const cleanFile = path.join(CLIPS_DIR, `whatsapp-smooth-${i + 1}.mp4`);
        console.log(`✂️ Processing Clip ${i + 1}/${RAW_CLIPS.length}: Cropping watermark & normalizing...`);

        // Crop bottom 7% (removes watermark completely), scale to 1920x1080 24fps
        const cropCmd = `ffmpeg -y -i "${item.raw}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanFile}"`;
        execSync(cropCmd, { stdio: 'pipe' });

        cleanPaths.push(cleanFile);
        console.log(`   ✅ Prepared Clip ${i + 1}: ${cleanFile}`);
    }

    console.log(`\n========================================================`);
    console.log(`✨ Applying Smooth Dissolve Transitions (xfade & acrossfade)...`);
    console.log(`========================================================`);

    // Step 2: Build FFmpeg xfade filter complex for smooth transitions
    // Duration of each clip is ~10s. Fade duration = 0.5s.
    // Offset for transition N: offset_N = N * (10 - 0.5) = N * 9.5s
    const offset1 = 9.5;
    const offset2 = 19.0;
    const offset3 = 28.5;
    const offset4 = 38.0;
    const offset5 = 47.5;

    const filterComplex = `
[0:v][1:v] xfade=transition=fade:duration=0.5:offset=${offset1} [v1];
[0:a][1:a] acrossfade=d=0.5 [a1];
[v1][2:v] xfade=transition=fade:duration=0.5:offset=${offset2} [v2];
[a1][2:a] acrossfade=d=0.5 [a2];
[v2][3:v] xfade=transition=fade:duration=0.5:offset=${offset3} [v3];
[a2][3:a] acrossfade=d=0.5 [a3];
[v3][4:v] xfade=transition=fade:duration=0.5:offset=${offset4} [v4];
[a3][4:a] acrossfade=d=0.5 [a4];
[v4][5:v] xfade=transition=fade:duration=0.5:offset=${offset5} [v5];
[a4][5:a] acrossfade=d=0.5 [a5]
`.trim().replace(/\n/g, ' ');

    const inputs = cleanPaths.map(p => `-i "${p}"`).join(' ');
    const renderCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[v5]" -map "[a5]" -c:v libx264 -preset medium -crf 17 -c:a aac -b:a 192k "${MASTER_OUTPUT}"`;

    console.log(`🚀 Executing FFmpeg smooth render...`);
    try {
        execSync(renderCmd, { stdio: 'inherit' });
        const finalSize = fs.statSync(MASTER_OUTPUT).size;
        const durationStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${MASTER_OUTPUT}"`, { encoding: 'utf8' }).trim();

        console.log(`\n========================================================`);
        console.log(`🎉 SMOOTH MASTER FILM RENDER COMPLETE!`);
        console.log(`📁 Master File: ${MASTER_OUTPUT}`);
        console.log(`⏱️ Final Duration: ${parseFloat(durationStr).toFixed(1)} Seconds (~1 Minute)`);
        console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`✨ Features: Smooth Dissolve Transitions + Outro CTA + 0 Watermarks`);
        console.log(`========================================================`);
    } catch (err) {
        console.error(`❌ Smooth render failed, falling back to clean concat:`, err.message);
        // Fallback concatenation if xfade offset differs
        const concatListPath = path.join(CLIPS_DIR, 'whatsapp-smooth-concat.txt');
        fs.writeFileSync(concatListPath, cleanPaths.map(f => `file '${f}'`).join('\n'));
        const fallbackCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${MASTER_OUTPUT}"`;
        execSync(fallbackCmd, { stdio: 'inherit' });
        console.log(`✅ Fallback concat complete: ${MASTER_OUTPUT}`);
    }
}

renderSmoothMasterVideo().catch(console.error);
