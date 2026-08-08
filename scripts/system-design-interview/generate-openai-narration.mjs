/** Generates the narration for the acquisition cut. */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { SYSTEM_DESIGN_OPENAI_BEATS } from './systemDesignOpenAIScript.ts';

const OUT_DIR = 'public/assets/system-design-narration/sd-openai-v2/en/chirp-fenrir';
const SAMPLE_RATE = 24000;
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const getToken = async () => {
    const auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'firebase-service-account.json',
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    return (await (await auth.getClient()).getAccessToken()).token;
};

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const token = await getToken();
    for (const beat of SYSTEM_DESIGN_OPENAI_BEATS) {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { text: beat.narration.en },
                voice: { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Fenrir' },
                audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SAMPLE_RATE },
            }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(`${beat.id}: ${body?.error?.message || response.status}`);
        fs.writeFileSync(path.join(OUT_DIR, `${beat.id}.wav`), Buffer.from(body.audioContent, 'base64'));
        console.log(`wrote ${beat.id}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
