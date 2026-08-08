/**
 * generate-english-narration.mjs
 *
 * Synthesizes ultra-realistic, human-like English TTS audio clips (24kHz LINEAR16 WAV)
 * for Domain 1 Film "The One-Person Agency" using Google Cloud TTS Journey & Chirp3-HD voices.
 *
 * Output: public/assets/ccaf-narration/domain-1-overview/en/<voiceId>/<beatId>.wav
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { DOMAIN_1_FILM } from './domain1Script.ts';

const OUT_BASE = 'public/assets/ccaf-narration/domain-1-overview/en';
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

const synthesize = async (token, text, voiceName) => {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text },
            voice: { languageCode: 'en-US', name: voiceName },
            audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SAMPLE_RATE },
        }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error?.message?.slice(0, 160) ?? `HTTP ${res.status}`);
    return Buffer.from(body.audioContent, 'base64');
};

async function generateEnglishNarration() {
    console.log('🎙️ Synthesizing Ultra-Realistic English Voiceover Narration Clips...\n');
    const token = await getToken();

    // Available Ultra-Realistic Voices:
    const voices = [
        { id: 'journey-f', name: 'en-US-Journey-F', label: 'Hyper-realistic Journey Female Voice' },
        { id: 'journey-o', name: 'en-US-Journey-O', label: 'Hyper-realistic Journey Male Storyteller' },
        { id: 'chirp-fenrir', name: 'en-US-Chirp3-HD-Fenrir', label: 'Energetic Chirp3-HD YouTube Narrator' }
    ];

    for (const v of voices) {
        const outDir = path.join(OUT_BASE, v.id);
        fs.mkdirSync(outDir, { recursive: true });
        console.log(`🔊 Voice Profile: ${v.label} (${v.name})`);

        for (const beat of DOMAIN_1_FILM.beats) {
            if (!beat.narration?.en) continue;
            const outFile = path.join(outDir, `${beat.id}.wav`);

            try {
                const wavBuf = await synthesize(token, beat.narration.en, v.name);
                fs.writeFileSync(outFile, wavBuf);
                const duration = (wavDurationMs(wavBuf.length) / 1000).toFixed(1);
                console.log(`   ✅ ${beat.id.padEnd(20)} -> ${duration}s (${(wavBuf.length / 1024).toFixed(1)} KB)`);
            } catch (err) {
                console.error(`   ❌ Failed ${beat.id}:`, err.message);
            }
        }
        console.log('');
    }
    console.log('🎉 English TTS Narration Synthesis Complete!');
}

generateEnglishNarration();
