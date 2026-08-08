/**
 * generate-sd-api-backplates.mjs
 *
 * Generates documentary paper-collage animation backplates for "System Design: APIs and Data Models"
 * using Vertex AI Gemini 2.5 Flash Image.
 *
 * Output: public/assets/ccaf-backplates/sd-api--<beatId>.png
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const OUT_DIR = 'public/assets/ccaf-backplates';
fs.mkdirSync(OUT_DIR, { recursive: true });

const project = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project, location });

const COLLAGE_STYLE = `
documentary documentary motion design, paper-collage animation aesthetic.
Aged off-white newsprint paper backdrop with subtle grid lines, faint photocopy grain, soft vignette.
Halftone dot texture photo cut-outs of vintage technology, credit cards, computer monitors, and database servers.
Crisp drop-shadowed torn paper edges on every element.
Hand-drawn black ink scribble arrows and red accent circles.
Absolutely no text, no letters, no words, no numbers, no signage anywhere in the image.
`.trim().replace(/\s+/g, ' ');

const BACKPLATE_PROMPTS = {
    'sd-intro':
        `${COLLAGE_STYLE} A central halftone vintage computer screen sitting on an aged newsprint desk. Torn paper fragments of credit cards and network wires float around it with visible drop shadows.`,

    'sd-idempotency-story':
        `${COLLAGE_STYLE} A halftone credit card cut-out torn in half, with a hand-drawn red scribble lightning bolt between the two halves over an aged grid-paper background.`,

    'sd-idempotency-solution':
        `${COLLAGE_STYLE} A golden paper receipt cut-out with a glowing checkmark stamp, sitting beside a neat stack of halftone database servers.`,

    'sd-expand-contract':
        `${COLLAGE_STYLE} A two-stage paper blueprint layout. On the left, an old paper folder is unfolding; on the right, two new clean paper folders slide in alongside it.`,

    'sd-read-model':
        `${COLLAGE_STYLE} Split view on paper. A heavy iron vault database on the left, sending paper streams to a fast high-speed paper conveyor belt on the right.`,

    'sd-outro':
        `${COLLAGE_STYLE} A vintage chalkboard background with paper graduation cap cut-outs, golden trophy badge, and pencils arranged neatly on newsprint.`,
};

async function generateSdApiBackplates() {
    console.log(`🎨 Generating Documentary Backplates for System Design (Gemini 2.5 Flash Image)...\n`);

    for (const [beatId, promptText] of Object.entries(BACKPLATE_PROMPTS)) {
        const outFile = path.join(OUT_DIR, `sd-api--${beatId}.png`);
        if (fs.existsSync(outFile) && !process.env.FORCE) {
            console.log(`   ✓ Skip (exists): ${beatId}`);
            continue;
        }

        console.log(`🖌️  Generating: ${beatId}`);

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: [{ role: 'user', parts: [{ text: promptText }] }],
                config: {
                    responseModalities: ['IMAGE', 'TEXT'],
                },
            });

            const candidates = response.candidates;
            if (candidates && candidates[0]?.content?.parts) {
                for (const part of candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                        const imgBuffer = Buffer.from(part.inlineData.data, 'base64');
                        fs.writeFileSync(outFile, imgBuffer);
                        console.log(`   ✅ Saved ${outFile} (${(imgBuffer.length / 1024).toFixed(1)} KB)`);
                    }
                }
            }
        } catch (e) {
            console.error(`   ❌ Failed ${beatId}:`, e.message);
        }

        await new Promise(r => setTimeout(r, 8000));
    }
    console.log('\n🎉 Backplate generation complete!');
}

generateSdApiBackplates();
