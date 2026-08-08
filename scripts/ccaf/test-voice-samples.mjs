import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const sampleText = "You are going to build an agency. One agent, then several. Everything that is easy with one breaks the moment there are two!";

const getToken = async () => {
    const auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'firebase-service-account.json',
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    return (await client.getAccessToken()).token;
};

async function testVoices() {
    const token = await getToken();
    const voices = [
        'en-US-Journey-F',
        'en-US-Journey-O',
        'en-US-Journey-D',
        'en-US-Chirp3-HD-Fenrir',
        'en-US-Chirp3-HD-Aoede',
        'en-US-Studio-O'
    ];

    fs.mkdirSync('public/assets/ccaf-narration/samples', { recursive: true });

    for (const v of voices) {
        console.log(`Synthesizing sample with ${v}...`);
        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: sampleText },
                    voice: { languageCode: 'en-US', name: v },
                    audioConfig: { audioEncoding: 'MP3' },
                }),
            });
            const body = await res.json();
            if (body.audioContent) {
                const outPath = `public/assets/ccaf-narration/samples/sample-${v.toLowerCase()}.mp3`;
                fs.writeFileSync(outPath, Buffer.from(body.audioContent, 'base64'));
                console.log(`✅ Saved ${outPath}`);
            } else {
                console.log(`❌ Error ${v}:`, body.error?.message);
            }
        } catch (err) {
            console.log(`❌ Error ${v}:`, err.message);
        }
    }
}

testVoices();
