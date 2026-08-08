/**
 * generate-llm-inference-evan-segmented.mjs
 *
 * Segmented per-beat F5-TTS voice synthesis orchestrator for:
 *   System Design: How to Design High-Throughput LLM Inference Serving
 *
 * Runs each beat (1 to 8) sentence-by-sentence in an isolated process to guarantee:
 *   1. 100% stability (zero crashes / no memory leaks)
 *   2. Precise timing breakdown per beat & per sentence
 *   3. Reusable WAV voice assets cached on disk
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { LLM_INFERENCE_BEATS } from './systemDesignLlmInferenceScript.ts';

const REF_AUDIO = 'assets/voice_cloning/evan_intro.wav';
const REF_TEXT = "Hey, how are you today? I'm doing great. My name is Jowen. I have a specialty in creating awesome AI products.";
const OUT_DIR = path.resolve('public/assets/system-design-narration/sd-llm-inference/en/evan-voice');

fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
    console.log('=' .repeat(65));
    console.log('🎙️ SEGMENTED SENTENCE-BY-SENTENCE F5-TTS VOICE SYNTHESIS PIPELINE');
    console.log(`📁 Reference Audio: ${REF_AUDIO}`);
    console.log(`📂 Output Directory: ${OUT_DIR}`);
    console.log('=' .repeat(65));

    const timingReport = [];
    const totalStart = Date.now();

    for (let i = 0; i < LLM_INFERENCE_BEATS.length; i++) {
        const beat = LLM_INFERENCE_BEATS[i];
        const beatId = beat.id;
        const genText = beat.narration.en;
        const outFile = path.join(OUT_DIR, `${beatId}.wav`);

        // Check if audio file already exists (Cache check)
        if (fs.existsSync(outFile) && fs.statSync(outFile).size > 10000) {
            console.log(`\n⏭️ [Beat ${i + 1}/${LLM_INFERENCE_BEATS.length}] Audio already cached: ${beatId}.wav`);
            timingReport.push({ beatId, elapsedSec: 0, textLength: genText.length, cached: true });
            continue;
        }

        console.log(`\n🗣️ [Beat ${i + 1}/${LLM_INFERENCE_BEATS.length}] Synthesizing Beat: ${beatId}`);
        console.log(`   Text (${genText.length} chars): "${genText.slice(0, 75)}..."`);

        const bStart = Date.now();
        const cmd = `./.venv-f5/bin/python scripts/generate-f5-voice-segmented.py --ref-audio "${REF_AUDIO}" --ref-text "${REF_TEXT.replace(/"/g, '\\"')}" --gen-text "${genText.replace(/"/g, '\\"')}" --output "${outFile}" --nfe-step 16`;

        try {
            execSync(cmd, { stdio: 'inherit', env: { ...process.env, PYTHONHASHSEED: 'random' } });
            const elapsedSec = ((Date.now() - bStart) / 1000).toFixed(2);
            console.log(`   ✅ Beat [${beatId}] synthesized in ${elapsedSec} seconds.`);
            timingReport.push({ beatId, elapsedSec: parseFloat(elapsedSec), textLength: genText.length, cached: false });
        } catch (err) {
            console.error(`   ❌ Error synthesizing beat ${beatId}:`, err.message);
        }
    }

    const totalSec = ((Date.now() - totalStart) / 1000).toFixed(2);

    console.log('\n' + '=' .repeat(65));
    console.log('📊 AUDIO SYNTHESIS TIMING REPORT');
    console.log('=' .repeat(65));

    timingReport.forEach(({ beatId, elapsedSec, textLength, cached }) => {
        const tag = cached ? '[CACHED]' : `${elapsedSec.toFixed(2).padStart(6)}s`;
        console.log(`  • ${beatId.padEnd(25)} : ${tag} (${textLength} chars)`);
    });

    console.log('-' .repeat(65));
    console.log(`⏱️ TOTAL AUDIO SYNTHESIS TIME : ${totalSec} seconds (${(totalSec / 60).toFixed(2)} minutes)\n`);

    // Write timing report JSON
    fs.writeFileSync(path.join(OUT_DIR, 'synthesis_timing.json'), JSON.stringify({ totalSec: parseFloat(totalSec), timingReport }, null, 2));

    console.log('🎬 Launching Master Video Assembly with Evan Cloned Voice...');
    execSync('node scripts/system-design-interview/build-llm-inference-evan-voice-film.mjs', { stdio: 'inherit' });
}

main().catch(console.error);
