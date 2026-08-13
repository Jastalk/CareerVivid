/**
 * generate-commercial-narration.mjs
 *
 * Synthesizes 24 kHz LINEAR16 Chirp3-HD Fenrir voiceover WAV clips
 * for the CareerVivid System Design & Career Coach Agent Commercial (6 Beats).
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const SAMPLE_RATE = 24000;
const OUT_DIR = path.resolve('public/commercial-videos/careervivid-system-design/assets/narration');

fs.mkdirSync(OUT_DIR, { recursive: true });

const BEATS = [
    {
        id: 'beat1-hook',
        text: 'Designing distributed systems for tech interviews feels overwhelming. One wrong architectural choice costs you the offer.'
    },
    {
        id: 'beat2-solution',
        text: 'Meet CareerVivid — your personal AI Career Agent built to guide you through system design mastery.'
    },
    {
        id: 'beat3-prompting',
        text: 'Ask your Career Coach Agent anything. Submit system design prompts and get instant architectural guidance.'
    },
    {
        id: 'beat4-coaching',
        text: 'Your AI Coach analyzes load balancers, caching layers, and database trade-offs in real time — scoring your design against FAANG standards.'
    },
    {
        id: 'beat5-interviewloop',
        text: 'Master real 6-stage company interview loops with live AI feedback every step of the way.'
    },
    {
        id: 'beat6-outro',
        text: 'Master System Design. Land your dream tech offer. Practice interactive scenarios today on CareerVivid dot app!'
    }
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

async function main() {
    console.log('🎙️ Synthesizing 24 kHz Chirp3-HD Voiceover for Career Coach Agent Commercial...\n');
    const token = await getToken();

    for (const b of BEATS) {
        const outFile = path.join(OUT_DIR, `${b.id}.wav`);
        console.log(`🎙️ Synthesizing ${b.id}: "${b.text}"`);
        try {
            const wavBuf = await synthesize(token, b.text);
            fs.writeFileSync(outFile, wavBuf);
            const duration = ((wavBuf.length - 44) / (SAMPLE_RATE * 2)).toFixed(1);
            console.log(`   ✅ Saved ${outFile} (${duration}s, ${(wavBuf.length / 1024).toFixed(1)} KB)\n`);
        } catch (err) {
            console.error(`   ❌ Failed to synthesize ${b.id}:`, err.message);
        }
    }

    console.log('🎉 COMMERCIAL VOICEOVERS SYNTHESIZED SUCCESSFULLY!');
}

main().catch(console.error);
