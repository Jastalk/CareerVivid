/**
 * build-3-aug11-films.mjs
 *
 * Compiles 1080p Master Explainer Films in unified 16:9 horizontal format for YouTube & TikTok:
 *   1. YouTube Content ID & Automated Copyright Matching (design-yt-contentid.mp4)
 *   2. TikTok Live Gifting & Real-Time Leaderboard System (design-tiktok-gifting.mp4)
 *   3. OpenAI Realtime Voice WebRTC Gateway & Audio Streaming (design-openai-realtime.mp4)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { YOUTUBE_CONTENT_ID_SCRIPT } from './systemDesignYtContentIdScript.ts';
import { TIKTOK_GIFTING_SCRIPT } from './systemDesignTikTokGiftingScript.ts';
import { OPENAI_REALTIME_SCRIPT } from './systemDesignOpenAIRealtimeScript.ts';
import { boomerangBed } from './paperCollagePromptGrammar.mjs';

const FPS = 30;
const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const BGM_PATH = path.resolve('public/assets/bgm-d12.mp3');

const VIDEO_CONFIGS = [
    {
        id: YOUTUBE_CONTENT_ID_SCRIPT.id,
        slug: 'design-yt-contentid',
        title: 'How to Design YouTube Content ID & Automated Copyright Matching',
        beats: YOUTUBE_CONTENT_ID_SCRIPT.beats,
        thumbnail: path.resolve('public/system-design-lessons/design-yt-contentid-thumbnail.jpg')
    },
    {
        id: TIKTOK_GIFTING_SCRIPT.id,
        slug: 'design-tiktok-gifting',
        title: 'How to Design TikTok Live Gifting & Real-Time Leaderboard System',
        beats: TIKTOK_GIFTING_SCRIPT.beats,
        thumbnail: path.resolve('public/system-design-lessons/design-tiktok-gifting-thumbnail.jpg')
    },
    {
        id: OPENAI_REALTIME_SCRIPT.id,
        slug: 'design-openai-realtime',
        title: 'How to Design OpenAI Realtime Voice WebRTC Gateway & Audio Streaming',
        beats: OPENAI_REALTIME_SCRIPT.beats,
        thumbnail: path.resolve('public/system-design-lessons/design-openai-realtime-thumbnail.jpg')
    }
];

function getMediaDuration(filePath) {
    if (!fs.existsSync(filePath)) return 0;
    try {
        const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' });
        return parseFloat(out.trim()) || 0;
    } catch {
        return 0;
    }
}

async function buildFilmForConfig(vc) {
    console.log(`\n========================================================`);
    console.log(`🎬 Compiling 1080p 16:9 Film for [${vc.id}]: ${vc.title}`);
    console.log(`========================================================\n`);

    const workDir = path.resolve(`scratchpad/film_render_${vc.id}`);
    const narrationDir = path.resolve(`public/assets/system-design-narration/${vc.id}/en/chirp-fenrir`);
    const masterMp4 = path.resolve(`public/system-design-lessons/${vc.slug}.mp4`);

    fs.mkdirSync(workDir, { recursive: true });

    const beatsToAssemble = [];
    let totalSeconds = 0;

    for (const beat of vc.beats) {
        const audioPath = path.join(narrationDir, `${beat.id}.wav`);
        const durationSec = getMediaDuration(audioPath);
        const veoClipPath = path.join(CLIPS_DIR, `${vc.id}--${beat.id}.mp4`);
        const paddedDuration = Math.max(durationSec + 1.5, 6.0);

        beatsToAssemble.push({
            beat,
            durationSec: paddedDuration,
            rawDurationSec: durationSec,
            audioPath: fs.existsSync(audioPath) ? audioPath : null,
            veoClipPath: fs.existsSync(veoClipPath) ? veoClipPath : null,
            diagramFramesDir: path.join(workDir, `frames_${beat.id}`),
        });

        totalSeconds += paddedDuration;
    }

    console.log(`📹 Beats: ${beatsToAssemble.length}`);
    console.log(`⏱️ Total Duration: ${(totalSeconds / 60).toFixed(2)} mins (${totalSeconds.toFixed(1)}s)\n`);

    const beatMp4Files = [];

    for (let i = 0; i < beatsToAssemble.length; i++) {
        const item = beatsToAssemble[i];
        const { beat, durationSec, audioPath, veoClipPath, diagramFramesDir } = item;
        const beatMp4 = path.join(workDir, `beat_${String(i).padStart(2, '0')}.mp4`);

        console.log(`🎬 Encoding Beat [${i + 1}/${beatsToAssemble.length}]: ${beat.id} (${beat.renderer}, ${durationSec.toFixed(1)}s)...`);

        if (beat.renderer === 'DIAGRAM') {
            // Programmatic Diagram Beat (Beats 2-7)
            const framesInput = path.join(diagramFramesDir, 'f%05d.png');
            const cmd = `ffmpeg -y -framerate ${FPS} -i "${framesInput}" -i "${audioPath}" -filter_complex "[1:a]apad=pad_len=48000[aout]" -map 0:v -map "[aout]" -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 192k -pix_fmt yuv420p -t ${durationSec.toFixed(2)} "${beatMp4}"`;
            execSync(cmd, { stdio: 'pipe' });
        } else {
            // Veo Beat (Beats 1 & 8)
            const bed = veoClipPath ? boomerangBed(veoClipPath, path.join(workDir, `bed_${beat.id}.mp4`)) : null;
            if (bed && audioPath) {
                const drift = `scale=1920:1080:flags=lanczos,fps=${FPS},setsar=1`;
                const cmd = `ffmpeg -y -stream_loop -1 -i "${bed}" -i "${audioPath}" -filter_complex "[0:v]${drift}[v];[1:a]apad=pad_len=48000[aout]" -map "[v]" -map "[aout]" -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 192k -pix_fmt yuv420p -t ${durationSec.toFixed(2)} "${beatMp4}"`;
                execSync(cmd, { stdio: 'pipe' });
            } else {
                const cmd = `ffmpeg -y -f lavfi -i color=c=0x0f172a:s=1920x1080:r=${FPS} -i "${audioPath}" -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 192k -pix_fmt yuv420p -t ${durationSec.toFixed(2)} "${beatMp4}"`;
                execSync(cmd, { stdio: 'pipe' });
            }
        }

        beatMp4Files.push(beatMp4);
    }

    console.log('\n🎞️ Concatenating all 8 beats into master film...');
    const rawConcatMp4 = path.join(workDir, 'raw_concat.mp4');
    const concatListPath = path.join(workDir, 'concat_list.txt');
    fs.writeFileSync(concatListPath, beatMp4Files.map(f => `file '${f}'`).join('\n'));

    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${rawConcatMp4}"`, { stdio: 'pipe' });

    console.log('\n🎵 Muxing soft background music (bgm-d12.mp3, volume=0.05, fade out)...');
    if (fs.existsSync(BGM_PATH)) {
        const fadeStart = Math.max(totalSeconds - 5, 0);
        const muxCmd = `ffmpeg -y -i "${rawConcatMp4}" -i "${BGM_PATH}" -filter_complex "[1:a]volume=0.05,afade=t=out:st=${fadeStart.toFixed(1)}:d=4.0[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${masterMp4}"`;
        execSync(muxCmd, { stdio: 'pipe' });
    } else {
        fs.copyFileSync(rawConcatMp4, masterMp4);
    }

    const finalDuration = getMediaDuration(masterMp4);
    const finalSizeMB = (fs.statSync(masterMp4).size / (1024 * 1024)).toFixed(2);

    console.log('\n--------------------------------------------------------');
    console.log(`🎉 [COMPLETED] ${vc.title}`);
    console.log(`📹 Master 1080p Film (Unified 16:9 Format): ${masterMp4}`);
    console.log(`⏱️ Duration: ${(finalDuration / 60).toFixed(2)} mins (${finalDuration.toFixed(1)}s) | Size: ${finalSizeMB} MB`);
    console.log(`🖼️ High-CTR Thumbnail: ${vc.thumbnail}`);
    console.log('--------------------------------------------------------\n');
}

async function main() {
    for (const vc of VIDEO_CONFIGS) {
        await buildFilmForConfig(vc);
    }
    console.log('🎉 ALL 3 AUG 11 1080P MASTER FILMS COMPILED SUCCESSFULLY!');
}

main().catch(console.error);
