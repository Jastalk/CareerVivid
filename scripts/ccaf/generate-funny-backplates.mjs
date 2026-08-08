/**
 * generate-funny-backplates.mjs
 *
 * Generates ultra-expressive, funny, Sam O'Nella style stick figure illustrations
 * for Domain 1 Film "一个人的事务所" using Vertex AI Gemini 2.5 Flash Image.
 * Paced with 12-second delays to respect Vertex AI quota limits.
 *
 * Output: public/assets/ccaf-backplates/domain-1-overview--<beatId>.png
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

const STYLE = `
Minimalist 2D stick figure comic illustration, Sam O'Nella art style.
Bold black hand-drawn ink outlines, simple flat color fills, clean white background, high contrast 2D cartoon layout.
Expressive comical wobbly dot eyes, funny exaggerated body language.
Absolutely no text, no letters, no words, no numbers, no signage, no labels anywhere in the image.
`.trim().replace(/\s+/g, ' ');

const FUNNY_PROMPTS = {
    'two-numbers':
        `${STYLE} A stick figure sitting at a desk with a balance scale. On one pan of the scale is a giant stack of dollar bills, on the other is a medium stack with a magnifying glass. The figure holds a calculator looking completely baffled with sweat droplets.`,

    'citation-id':
        `${STYLE} A line of three cartoon stick figures handing a golden key down the chain. The first stick figure in line stamps a bright yellow label onto the key before passing it to the second figure.`,

    'tell-it-what-changed':
        `${STYLE} A stick figure standing in front of 12 paper folders. 3 of the folders are glowing bright neon green, while the other 9 are dim gray. The figure points happily at the 3 glowing folders.`,

    'checkpoint':
        `${STYLE} A stick figure slamming a large red emergency button marked with a checkered flag on an industrial control desk, while a computer terminal beside it resets cleanly.`,

    'go-find-out':
        `${STYLE} A stick figure wearing a graduation cap, pointing excitedly toward a desk with a quiz paper and pencil under a golden spotlight.`
};

async function generateFunnyBackplates() {
    console.log(`🎨 Paced Image Generation (5 new funny backplates with Gemini 2.5 Flash Image)...\n`);

    for (const [beatId, promptText] of Object.entries(FUNNY_PROMPTS)) {
        const outFile = path.join(OUT_DIR, `domain-1-overview--${beatId}.png`);
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

        // Delay to respect rate limits
        await new Promise(r => setTimeout(r, 8000));
    }
    console.log('\n🎉 Image generation complete!');
}

generateFunnyBackplates();
