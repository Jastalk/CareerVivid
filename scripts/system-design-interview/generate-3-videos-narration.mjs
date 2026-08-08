/**
 * generate-3-videos-narration.mjs
 *
 * Synthesizes Chirp3-HD-Fenrir English voiceover narration clips for:
 *   1. Vector DB Index Sharding & Hybrid RAG (sd-vector-rag)
 *   2. AI Agent Orchestration & Subagent Swarms (sd-agent-swarms)
 *   3. GPU Fleet Scheduling & Kubernetes Operator (sd-gpu-fleet)
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { VECTOR_RAG_BEATS } from './systemDesignVectorRagScript.ts';
import { AGENT_SWARMS_BEATS } from './systemDesignAgentSwarmsScript.ts';
import { GPU_FLEET_BEATS } from './systemDesignGpuFleetScript.ts';

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const SAMPLE_RATE = 24000;

const wavDurationMs = (bytes) => Math.round(((bytes - 44) / (SAMPLE_RATE * 2)) * 1000);

const getToken = async () => {
    const auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'firebase-service-account.json',
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    return (await client.getAccessToken()).token;
};

const synthesize = async (token, text) => {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text },
            voice: { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Fenrir' },
            audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SAMPLE_RATE },
        }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error?.message?.slice(0, 160) ?? `HTTP ${res.status}`);
    return Buffer.from(body.audioContent, 'base64');
};

const VIDEO_CONFIGS = [
    { id: 'sd-vector-rag', beats: VECTOR_RAG_BEATS },
    { id: 'sd-agent-swarms', beats: AGENT_SWARMS_BEATS },
    { id: 'sd-gpu-fleet', beats: GPU_FLEET_BEATS },
];

async function generateAllNarration() {
    console.log('⚡ Synthesizing Chirp3-HD Fenrir Narration Clips for 3 System Design Videos...\n');
    const token = await getToken();

    for (const vc of VIDEO_CONFIGS) {
        const outDir = path.resolve(`public/assets/system-design-narration/${vc.id}/en/chirp-fenrir`);
        fs.mkdirSync(outDir, { recursive: true });

        console.log(`🎙️ Synthesizing Narration for [${vc.id}]...`);
        for (const beat of vc.beats) {
            if (!beat.narration?.en) continue;
            const outFile = path.join(outDir, `${beat.id}.wav`);

            try {
                const wavBuf = await synthesize(token, beat.narration.en);
                fs.writeFileSync(outFile, wavBuf);
                const duration = (wavDurationMs(wavBuf.length) / 1000).toFixed(1);
                console.log(`   ✅ ${beat.id.padEnd(30)} -> ${duration}s (${(wavBuf.length / 1024).toFixed(1)} KB)`);
            } catch (err) {
                console.error(`   ❌ Failed ${beat.id}:`, err.message);
            }
        }
        console.log('');
    }
    console.log('🎉 All 3 Video Narrations Synthesized Successfully!');
}

generateAllNarration().catch(console.error);
