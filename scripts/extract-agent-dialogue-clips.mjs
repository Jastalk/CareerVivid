/**
 * extract-agent-dialogue-clips.mjs
 *
 * Extracts extended, high-definition Human <-> Career Coach Agent interaction clips WITH UNMUTED LIVE AUDIO:
 * 1) human_prompts_agent.mp4 (Human selecting scenario, typing prompts, sending to Career Agent - 20s)
 * 2) agent_evaluates_system.mp4 (Career Agent step-by-step architecture analysis & FAANG scorecard - 30s)
 * 3) agent_coaching_dialogue.mp4 (Human <-> Agent live interview quest dialogue loop - 20s)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const INPUT_MOV = path.resolve('public/commercial-videos/careervivid-github-style/assets/real_user_recording.mov');
const OUT_DIR = path.resolve('public/commercial-videos/careervivid-system-design/assets/agent_dialogue');

fs.mkdirSync(OUT_DIR, { recursive: true });

const CLIPS = [
    {
        name: 'human_prompts_agent.mp4',
        start: 35,
        duration: 25,
        targetDuration: 20, // 20s clip (natural 1.25x speed)
        label: 'Human Scenario Setup & Prompting'
    },
    {
        name: 'agent_evaluates_system.mp4',
        start: 60,
        duration: 40,
        targetDuration: 30, // 30s clip (in-depth Career Agent architecture analysis)
        label: 'Career Agent Architectural Analysis & Scorecard'
    },
    {
        name: 'agent_coaching_dialogue.mp4',
        start: 110,
        duration: 25,
        targetDuration: 20, // 20s clip (Human <-> Agent interview dialogue)
        label: 'Career Coach Agent Live Quest Dialogue'
    }
];

function extractDialogueClips() {
    console.log('🤖 Extracting EXTENDED Human & Career Coach Agent Dialogue Clips...\n');

    for (const c of CLIPS) {
        const outPath = path.join(OUT_DIR, c.name);
        const ptsScale = (c.targetDuration / c.duration).toFixed(3);
        const atempo = (c.duration / c.targetDuration).toFixed(3);
        console.log(`🎬 Extracting ${c.name} (${c.label}, start: ${c.start}s, target: ${c.targetDuration}s, audio boost: +20dB)...`);

        // Natural speed-ramp with boosted unmuted audio
        const cmd = `ffmpeg -y -ss ${c.start} -i "${INPUT_MOV}" -t ${c.duration} -filter_complex "[0:v]setpts=${ptsScale}*PTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=60[v];[0:a]atempo=${atempo},volume=20dB,loudnorm[a]" -map "[v]" -map "[a]" -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -preset fast -crf 16 -c:a aac -ar 48000 -ac 2 -b:a 192k "${outPath}"`;
        execSync(cmd, { stdio: 'pipe' });

        const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
        console.log(`   ✅ Saved ${outPath} (${sizeMB} MB)\n`);
    }

    console.log('🎉 EXTENDED CAREER COACH AGENT DIALOGUE CLIPS EXTRACTED SUCCESSFULLY!');
}

extractDialogueClips();
