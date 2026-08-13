/**
 * extract-system-design-hero-clips.mjs
 *
 * Extracts high-definition System Design & Career Agent hero video clips
 * from real user screen recording:
 * 1) hero_system_design_studio.mp4 (System Design canvas + Career Agent feedback)
 * 2) hero_full_interview_loop.mp4 (Full loop overview & ATS tailoring)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const INPUT_MOV = path.resolve('public/commercial-videos/careervivid-github-style/assets/real_user_recording.mov');
const OUT_DIR = path.resolve('public/commercial-videos/careervivid-system-design/assets/hero');

fs.mkdirSync(OUT_DIR, { recursive: true });

const HERO_CLIPS = [
    {
        name: 'hero_system_design_studio.mp4',
        start: 35,
        duration: 55,
        targetDuration: 18, // 18s clip (approx 3x speed-ramp)
    },
    {
        name: 'hero_full_interview_loop.mp4',
        start: 95,
        duration: 35,
        targetDuration: 8,  // 8s clip (approx 4.3x speed-ramp)
    }
];

function extractHeroClips() {
    console.log('🎥 Extracting Real System Design & Career Agent Hero Clips (Full 16:9 Crop)...\n');

    for (const c of HERO_CLIPS) {
        const outPath = path.join(OUT_DIR, c.name);
        const ptsScale = (c.targetDuration / c.duration).toFixed(3);
        console.log(`🎬 Extracting ${c.name} (start: ${c.start}s, orig: ${c.duration}s -> target: ${c.targetDuration}s)...`);

        // Use scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080 so video fills 100% of 16:9 frame without black bars
        const cmd = `ffmpeg -y -ss ${c.start} -i "${INPUT_MOV}" -t ${c.duration} -vf "setpts=${ptsScale}*PTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=60" -c:v libx264 -preset slow -crf 16 -an "${outPath}"`;
        execSync(cmd, { stdio: 'pipe' });

        const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
        console.log(`   ✅ Saved ${outPath} (${sizeMB} MB)\n`);
    }

    console.log('🎉 SYSTEM DESIGN HERO CLIPS EXTRACTED SUCCESSFULLY!');
}

extractHeroClips();
