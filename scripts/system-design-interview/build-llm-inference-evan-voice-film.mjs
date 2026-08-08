/**
 * build-llm-inference-evan-voice-film.mjs
 *
 * Assembles the 1080p LLM Inference Serving System Design Explainer Video
 * using EVAN'S CLONED VOICE (F5-TTS) instead of default Chirp3-HD.
 *
 * Output: public/system-design-lessons/design-llm-inference-evan-voice.mp4
 * (Placed right next to design-llm-inference.mp4 without overwriting it!)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { LLM_INFERENCE_BEATS } from './systemDesignLlmInferenceScript.ts';
import { boomerangBed } from './paperCollagePromptGrammar.mjs';

const FPS = 30;
const WORK_DIR = path.resolve('scratchpad/film_render_llm_inference_evan');
const FINAL_MP4 = path.resolve('public/system-design-lessons/design-llm-inference-evan-voice.mp4');
const NARRATION_DIR = path.resolve('public/assets/system-design-narration/sd-llm-inference/en/evan-voice');
const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const OLD_WORK_DIR = path.resolve('scratchpad/film_render_llm_inference');

fs.mkdirSync(WORK_DIR, { recursive: true });

function getMediaDuration(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return 0;
    try {
        const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' });
        return parseFloat(out.trim()) || 0;
    } catch {
        return 0;
    }
}

async function buildFilm() {
    console.log('🎬 Assembling Master Film with Evan Cloned Voice...\n');

    const beatsToAssemble = [];
    let totalSeconds = 0;

    for (const beat of LLM_INFERENCE_BEATS) {
        const audioPath = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const durationSec = getMediaDuration(audioPath);
        const veoClipPath = path.join(CLIPS_DIR, `sd-llm-inference--${beat.id}.mp4`);
        const diagramFramesDir = path.join(OLD_WORK_DIR, `frames_${beat.id}`);

        beatsToAssemble.push({
            beat,
            durationSec: Math.max(durationSec, 4.0),
            audioPath: fs.existsSync(audioPath) ? audioPath : null,
            veoClipPath: fs.existsSync(veoClipPath) ? veoClipPath : null,
            diagramFramesDir,
        });

        totalSeconds += Math.max(durationSec, 4.0);
    }

    console.log(`📹 Beats: ${beatsToAssemble.length}`);
    console.log(`⏱️ Total Audio-based Film Duration: ${(totalSeconds / 60).toFixed(2)} mins (${totalSeconds.toFixed(1)}s)\n`);

    const beatMp4Files = [];

    for (let i = 0; i < beatsToAssemble.length; i++) {
        const item = beatsToAssemble[i];
        const { beat, durationSec, audioPath, veoClipPath, diagramFramesDir } = item;
        const beatMp4 = path.join(WORK_DIR, `beat_${String(i).padStart(2, '0')}.mp4`);

        console.log(`🎬 Encoding Beat [${i + 1}/${beatsToAssemble.length}]: ${beat.id} (${beat.renderer}, ${durationSec.toFixed(1)}s)...`);

        if (!audioPath) {
            console.warn(`   ⚠️ Warning: Audio file missing for beat ${beat.id}, skipping.`);
            continue;
        }

        if (beat.renderer === 'DIAGRAM') {
            const framesInput = path.join(diagramFramesDir, 'f%05d.png');
            const cmd = `ffmpeg -y -framerate ${FPS} -i "${framesInput}" -i "${audioPath}" -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${beatMp4}"`;
            execSync(cmd, { stdio: 'pipe' });
        } else {
            const bed = veoClipPath ? boomerangBed(veoClipPath, path.join(WORK_DIR, `bed_${beat.id}.mp4`)) : null;
            if (bed) {
                const drift = `scale=1920:1080:flags=lanczos,fps=${FPS},setsar=1`;
                const cmd = `ffmpeg -y -stream_loop -1 -i "${bed}" -i "${audioPath}" -filter_complex "[0:v]${drift}[v]" -map "[v]" -map 1:a -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${beatMp4}"`;
                execSync(cmd, { stdio: 'pipe' });
            } else {
                const cmd = `ffmpeg -y -f lavfi -i color=c=0x0f172a:s=1920x1080:r=${FPS} -i "${audioPath}" -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${beatMp4}"`;
                execSync(cmd, { stdio: 'pipe' });
            }
        }

        beatMp4Files.push(beatMp4);
    }

    console.log('\n🎞️ Concatenating all beats into final Evan-voice master film...');
    const rawConcatMp4 = path.join(WORK_DIR, 'raw_concat.mp4');
    const concatListPath = path.join(WORK_DIR, 'concat_list.txt');
    fs.writeFileSync(concatListPath, beatMp4Files.map(f => `file '${f}'`).join('\n'));

    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${rawConcatMp4}"`, { stdio: 'pipe' });

    console.log('🔊 Adding BGM and exporting final MP4...');
    const bgmPath = path.resolve('public/assets/bgm-d12.mp3');
    if (fs.existsSync(bgmPath)) {
        const cmd = `ffmpeg -y -i "${rawConcatMp4}" -i "${bgmPath}" -filter_complex "[1:a]volume=0.05[bgm];[0:a][bgm]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${FINAL_MP4}"`;
        execSync(cmd, { stdio: 'pipe' });
    } else {
        fs.copyFileSync(rawConcatMp4, FINAL_MP4);
    }

    const finalSize = (fs.statSync(FINAL_MP4).size / (1024 * 1024)).toFixed(2);
    console.log(`\n🎉 MASTER FILM SUCCESSFULLY GENERATED WITH EVAN'S CLONED VOICE!`);
    console.log(`📹 Path: ${FINAL_MP4}`);
    console.log(`💾 Size: ${finalSize} MB`);
}

buildFilm().catch(console.error);
