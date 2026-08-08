/**
 * generate-journey-voice-sample.mjs
 *
 * Synthesizes an ultra-realistic Google Cloud TTS Journey-O voice sample clip
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const SAMPLE_RATE = 24000;
const OUT_PATH = path.resolve('public/assets/system-design-narration/journey-o-sample.wav');

const getToken = async () => {
    const auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'firebase-service-account.json',
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    return (await client.getAccessToken()).token;
};

async function generateSample() {
    console.log('🎙️ Synthesizing Journey-O Ultra-Realistic Voice Sample...\n');
    const token = await getToken();

    const sampleText = "How does YouTube Content ID scan 500 hours of uploaded video every single minute to detect copyright infringement instantly? Let us design Content ID at global scale.";

    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text: sampleText },
            voice: { languageCode: 'en-US', name: 'en-US-Journey-O' },
            audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SAMPLE_RATE },
        }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);

    const wavBuf = Buffer.from(body.audioContent, 'base64');
    fs.writeFileSync(OUT_PATH, wavBuf);
    console.log(`✅ Saved Journey-O Audio Sample: ${OUT_PATH} (${(wavBuf.length / 1024).toFixed(1)} KB)`);
}

generateSample().catch(console.error);
