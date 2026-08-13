/**
 * build-commercial-film.mjs
 *
 * Compiles the 60 FPS 1080p Master Commercial Film for CareerVivid (GitHub/SaaS Ad Style).
 * Muxes narration audio clips, background music, real user recording highlights, and motion graphics.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const FPS = 60;
const FRAMES_DIR = path.resolve('public/commercial-videos/careervivid-github-style/frames');
const NARRATION_DIR = path.resolve('public/commercial-videos/careervivid-github-style/assets/narration');
const BGM_PATH = path.resolve('public/assets/bgm-d12.mp3');
const OUT_MP4 = path.resolve('public/commercial-videos/careervivid-github-style/careervivid_github_commercial.mp4');
const REAL_RECORDING = path.resolve('public/commercial-videos/careervivid-github-style/assets/real_user_recording.mov');

const AUDIO_BEATS = [
    { file: 'beat1-hook.wav', delaySec: 0.2 },
    { file: 'beat2-reveal.wav', delaySec: 4.8 },
    { file: 'beat3-resume.wav', delaySec: 10.2 },
    { file: 'beat4-interview.wav', delaySec: 17.2 },
    { file: 'beat5-feedback.wav', delaySec: 25.2 },
    { file: 'beat6-outro.wav', delaySec: 31.2 }
];

async function buildFilm() {
    console.log('🎬 Compiling 60 FPS 1080p CareerVivid Commercial Film...\n');

    const tempAudioMux = path.resolve('public/commercial-videos/careervivid-github-style/assets/master_audio.wav');
    const tempVideoRaw = path.resolve('public/commercial-videos/careervivid-github-style/assets/raw_frames.mp4');

    // 1. Build concatenated audio track from narration beats
    console.log('🎙️ Building master narration track...');
    const filterInputs = [];
    const filterLabels = [];

    AUDIO_BEATS.forEach((b, idx) => {
        const audioPath = path.join(NARRATION_DIR, b.file);
        const delayMs = Math.round(b.delaySec * 1000);
        filterInputs.push(`-i "${audioPath}"`);
        filterLabels.push(`[${idx}:a]adelay=${delayMs}|${delayMs}[a${idx}]`);
    });

    const amixLabels = filterLabels.map((_, idx) => `[a${idx}]`).join('');
    const audioCmd = `ffmpeg -y ${filterInputs.join(' ')} -filter_complex "${filterLabels.join(';')};${amixLabels}amix=inputs=${AUDIO_BEATS.length}:duration=longest[aout]" -map "[aout]" "${tempAudioMux}"`;
    execSync(audioCmd, { stdio: 'pipe' });

    // 2. Encode 60 FPS video from PNG frames
    console.log('🎞️ Encoding 60 FPS video stream from rendered frames...');
    const framePattern = path.join(FRAMES_DIR, 'f%05d.png');
    const videoCmd = `ffmpeg -y -framerate ${FPS} -i "${framePattern}" -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p "${tempVideoRaw}"`;
    execSync(videoCmd, { stdio: 'pipe' });

    // 3. Final Mux: Video + Narration + Soft BGM
    console.log('🎵 Final Muxing: Video + Voiceover + Background Music (bgm-d12.mp3)...');
    let muxCmd = '';
    if (fs.existsSync(BGM_PATH)) {
        muxCmd = `ffmpeg -y -i "${tempVideoRaw}" -i "${tempAudioMux}" -i "${BGM_PATH}" -filter_complex "[2:a]volume=0.08,afade=t=out:st=34.0:d=3.0[bgm];[1:a][bgm]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${OUT_MP4}"`;
    } else {
        muxCmd = `ffmpeg -y -i "${tempVideoRaw}" -i "${tempAudioMux}" -c:v copy -c:a aac -b:a 192k "${OUT_MP4}"`;
    }

    execSync(muxCmd, { stdio: 'pipe' });

    const finalDuration = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${OUT_MP4}"`, { encoding: 'utf8' }).trim();
    const finalSizeMB = (fs.statSync(OUT_MP4).size / (1024 * 1024)).toFixed(2);

    console.log('\n--------------------------------------------------------');
    console.log('🎉 [COMPLETED] CareerVivid GitHub-Style Commercial Video!');
    console.log(`📹 Master 1080p 60FPS Commercial Video: ${OUT_MP4}`);
    console.log(`⏱️ Duration: ${parseFloat(finalDuration).toFixed(1)}s | Size: ${finalSizeMB} MB`);
    console.log('--------------------------------------------------------\n');
}

buildFilm().catch(console.error);
