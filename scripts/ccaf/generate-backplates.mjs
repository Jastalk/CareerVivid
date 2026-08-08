/**
 * Generates the miniature-diorama backplates for every `veo` beat.
 *
 * These are the atmosphere layer only: no text, no diagrams, no labels. Every
 * teaching element is drawn by code on top, which is why the same image can
 * serve both the English and the Chinese cut of a lesson.
 *
 *   npx vite-node scripts/ccaf/generate-backplates.mjs -- [outDir]
 *
 * Env:  LESSONS=read-the-signal,two-truncations   FORCE=1 to regenerate
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { VIDEO_LESSONS } from './lessonScripts.ts';

const OUT_DIR = process.argv[2] || 'scratchpad/backplates';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/** Courtesy pause after a transient failure. */
const BASE_RETRY_MS = 4_000;
/** A 429 needs a real wait; multiplied by the attempt number. */
const RATE_LIMIT_RETRY_MS = 20_000;
/** Gap between consecutive shots, so a lesson does not burst the quota. */
const PACE_MS = 8_000;
const MODELS = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];

/**
 * Appended verbatim to every prompt — this is what keeps 26 separate images
 * looking like one course. Changing it invalidates the whole look.
 */
const STYLE = `
Minimalist 2D stick figure comic illustration, Sam O'Nella art style.
Bold black ink hand-drawn outlines, simple flat color fills, clean white background, high contrast 2D cartoon layout.
Absolutely no text, no letters, no words, no numbers, no signage, no labels, no watermark anywhere in the image.
`.trim().replace(/\s+/g, ' ');

const buildClient = () => {
    const project = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
    }
    return new GoogleGenAI({ vertexai: true, project, location });
};

const extractImage = (response) => {
    for (const part of response?.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) return part.inlineData;
    }
    return null;
};

const main = async () => {
    const want = process.env.LESSONS?.split(',');
    const lessons = want ? VIDEO_LESSONS.filter(l => want.includes(l.missionId)) : VIDEO_LESSONS;

    const shots = lessons.flatMap(lesson =>
        lesson.beats
            .filter(beat => beat.imagePrompt)
            .map(beat => ({ lesson: lesson.missionId, beat: beat.id, prompt: beat.imagePrompt })),
    );
    console.log(`${shots.length} backplates across ${lessons.length} lessons`);

    const ai = buildClient();
    fs.mkdirSync(OUT_DIR, { recursive: true });

    // Which models this project can actually reach, best first. Kept as a list
    // rather than one winner: picking a single model up front meant that when
    // its quota ran out every remaining shot failed, even though the other
    // model was sitting there unused.
    const available = [];
    for (const candidate of MODELS) {
        try {
            await ai.models.generateContent({ model: candidate, contents: 'test' });
            available.push(candidate);
        } catch (error) {
            if (!/NOT_FOUND|404/.test(error.message)) available.push(candidate);
        }
    }
    const usable = available.length ? available : [MODELS[1]];
    console.log(`models: ${usable.join(' → ')}\n`);

    let made = 0;
    let skipped = 0;
    for (const shot of shots) {
        const file = path.join(OUT_DIR, `${shot.lesson}--${shot.beat}.png`);
        if (fs.existsSync(file) && !process.env.FORCE) { skipped += 1; continue; }

        let retryDelay = BASE_RETRY_MS;
        // Pace the requests. Generating a whole lesson back to back is what
        // pushed the quota over in the first place.
        if (made > 0) await sleep(PACE_MS);

        let saved = false;
        for (let attempt = 1; attempt <= 4 && !saved; attempt += 1) {
            // Space the attempts out. A 429 literally means "wait", so firing
            // three retries back to back is three guaranteed failures — which
            // is exactly how this lost three shots on its first run.
            if (attempt > 1) await sleep(retryDelay * attempt);
            // Alternate models across attempts, so a quota wall on one does not
            // sink the shot.
            const model = usable[(attempt - 1) % usable.length];
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: `${shot.prompt} ${STYLE}`,
                    // Without this the model may legally answer a picture
                    // request with prose, which arrives here as "no image" and
                    // no error. The richer the prompt, the likelier it did.
                    // Same config the app's own image path uses.
                    config: { responseModalities: ['IMAGE', 'TEXT'] },
                });
                const image = extractImage(response);
                if (!image) {
                    // Usually a transient refusal rather than a bad prompt; a
                    // pause before the next attempt clears most of them.
                    retryDelay = BASE_RETRY_MS;
                    console.log(`  · ${shot.lesson}/${shot.beat} attempt ${attempt} (${model}): no image`);
                    continue;
                }
                fs.writeFileSync(file, Buffer.from(image.data, 'base64'));
                console.log(`  ✓ ${shot.lesson}/${shot.beat} (${model})`);
                made += 1;
                saved = true;
            } catch (error) {
                const message = error.message ?? String(error);
                // Rate limiting needs a real wait, not the courtesy pause a
                // transient error gets.
                retryDelay = /429|RESOURCE_EXHAUSTED|exhausted/i.test(message)
                    ? RATE_LIMIT_RETRY_MS
                    : BASE_RETRY_MS;
                console.log(`  · ${shot.lesson}/${shot.beat} attempt ${attempt} (${model}): ${message.split('\n')[0].slice(0, 70)}`);
            }
        }
        if (!saved) console.log(`  ✗ ${shot.lesson}/${shot.beat}: gave up`);
    }
    console.log(`\n${made} generated, ${skipped} already present → ${OUT_DIR}`);
};

main().catch(error => { console.error(error.message); process.exit(1); });
