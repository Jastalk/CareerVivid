/**
 * generate-3-aug8-narration.mjs
 *
 * Synthesizes 24 kHz LINEAR16 Chirp3-HD Fenrir voiceover WAV files for 3 fresh Aug 8 topics:
 *   1. TikTok Live Gifting & Real-Time Leaderboard System Architecture (sd-tiktok-gifting)
 *   2. OpenAI Realtime Voice WebRTC Gateway & Audio Streaming Architecture (sd-openai-realtime)
 *   3. Uber H3 Hexagonal Geospatial Indexing & Dynamic Fleet Pricing (sd-uber-h3)
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { TIKTOK_GIFTING_SCRIPT } from './systemDesignTikTokGiftingScript.ts';
import { OPENAI_REALTIME_SCRIPT } from './systemDesignOpenAIRealtimeScript.ts';
import { UBER_H3_SCRIPT } from './systemDesignUberH3Script.ts';

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const SAMPLE_RATE = 24000;

const SCRIPTS = [
    TIKTOK_GIFTING_SCRIPT,
    OPENAI_REALTIME_SCRIPT,
    UBER_H3_SCRIPT
];

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

async function synthesizeVoiceovers() {
    console.log('🎙️ Synthesizing 24 kHz Chirp3-HD Fenrir Voiceovers for 3 Aug 8 Topics...\n');
    const token = await getToken();

    for (const spec of SCRIPTS) {
        const topicDir = path.resolve(`public/assets/system-design-narration/${spec.id}/en/chirp-fenrir`);
        fs.mkdirSync(topicDir, { recursive: true });

        console.log(`========================================================`);
        console.log(`🚀 Synthesizing Audio for Topic: [${spec.id}] - ${spec.title}`);
        console.log(`========================================================`);

        for (const beat of spec.beats) {
            const outFile = path.join(topicDir, `${beat.id}.wav`);

            console.log(`🎙️ Synthesizing beat: ${beat.id}`);
            console.log(`   Text: "${beat.narration}"`);

            try {
                const wavBuf = await synthesize(token, beat.narration);
                fs.writeFileSync(outFile, wavBuf);
                const duration = ((wavBuf.length - 44) / (SAMPLE_RATE * 2)).toFixed(1);
                console.log(`   ✅ Saved: ${outFile} (${duration}s, ${(wavBuf.length / 1024).toFixed(1)} KB)\n`);
            } catch (err) {
                console.error(`   ❌ Failed to synthesize ${beat.id}:`, err.message);
            }
        }
    }

    console.log('🎉 ALL 24 CHIRP3-HD FENRIR VOICEOVER CLIPS SYNTHESIZED SUCCESSFULLY!');
}

synthesizeVoiceovers().catch(console.error);
