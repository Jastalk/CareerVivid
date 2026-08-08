/**
 * generate-uber-narration.mjs
 *
 * Synthesizes Chirp3-HD-Fenrir English voiceover narration clips
 * for System Design: How to Design Uber.
 *
 * Output: public/assets/system-design-narration/sd-uber/en/chirp-fenrir/<beatId>.wav
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { SYSTEM_DESIGN_UBER_BEATS } from './systemDesignUberScript.ts';

const OUT_DIR = 'public/assets/system-design-narration/sd-uber/en/chirp-fenrir';
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const SAMPLE_RATE = 24000;

fs.mkdirSync(OUT_DIR, { recursive: true });

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

async function generateUberNarration() {
    console.log('⚡ Synthesizing How to Design Uber Chirp3-HD Fenrir Narration Clips...\n');
    const token = await getToken();

    for (const beat of SYSTEM_DESIGN_UBER_BEATS) {
        if (!beat.narration?.en) continue;
        const outFile = path.join(OUT_DIR, `${beat.id}.wav`);

        try {
            const wavBuf = await synthesize(token, beat.narration.en);
            fs.writeFileSync(outFile, wavBuf);
            const duration = (wavDurationMs(wavBuf.length) / 1000).toFixed(1);
            console.log(`   ✅ ${beat.id.padEnd(30)} -> ${duration}s (${(wavBuf.length / 1024).toFixed(1)} KB)`);
        } catch (err) {
            console.error(`   ❌ Failed ${beat.id}:`, err.message);
        }
    }
    console.log('\n🎉 Audio Synthesis Complete!');
}

generateUberNarration();
