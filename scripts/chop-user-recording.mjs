/**
 * chop-user-recording.mjs
 *
 * Chops real user screen recording into 5 high-energy 60 FPS feature clips:
 * 1) dashboard_intro.mp4
 * 2) resume_ats_boost.mp4
 * 3) interview_loop_nav.mp4
 * 4) system_design_feedback.mp4
 * 5) final_offer_readiness.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const INPUT_MOV = path.resolve('public/commercial-videos/careervivid-github-style/assets/real_user_recording.mov');
const OUT_DIR = path.resolve('public/commercial-videos/careervivid-github-style/assets/chopped');

fs.mkdirSync(OUT_DIR, { recursive: true });

const CLIPS = [
    { name: 'dashboard_intro.mp4', start: 2, duration: 7 },
    { name: 'resume_ats_boost.mp4', start: 30, duration: 8 },
    { name: 'interview_loop_nav.mp4', start: 70, duration: 8 },
    { name: 'system_design_feedback.mp4', start: 110, duration: 7 },
    { name: 'final_offer_readiness.mp4', start: 150, duration: 7 }
];

async function chopClips() {
    console.log('✂️ Chopping Real User Screen Recording into 5 Feature Clips...\n');

    for (const c of CLIPS) {
        const outPath = path.join(OUT_DIR, c.name);
        console.log(`🎬 Chopping ${c.name} (start: ${c.start}s, duration: ${c.duration}s)...`);
        
        // Apply 1.25x speed ramping (setpts=0.8*PTS) & scale to 1920x1080 @ 60 FPS
        const cmd = `ffmpeg -y -ss ${c.start} -i "${INPUT_MOV}" -t ${c.duration} -vf "setpts=0.8*PTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x060911,fps=60" -c:v libx264 -preset fast -crf 17 -an "${outPath}"`;
        execSync(cmd, { stdio: 'pipe' });
        
        const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
        console.log(`   ✅ Saved ${outPath} (${sizeMB} MB)\n`);
    }

    console.log('🎉 ALL 5 FEATURE CLIPS CHOPPED & READY!');
}

chopClips().catch(console.error);
