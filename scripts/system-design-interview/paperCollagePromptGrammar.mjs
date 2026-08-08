/**
 * paperCollagePromptGrammar.mjs — the shared, proven prompt grammar for Omni footage.
 *
 * This exists because the first two System Design episodes were generated from
 * a hand-copied v1.0 grammar and every clip in them is damaged in one of three
 * ways: a `a publication wordmark` wordmark in the corner, invented gibberish where a label was
 * asked for (`QSJ`, `Old Evitior Prrbeate`, `MENiNS Eviciary WITDN`), or a
 * glossy 3D render where flat cut paper was wanted. Those are not three bugs.
 * They are three lines that were missing from one string.
 *
 * So the string lives here now, once, and every generator imports it.
 *
 * The three load-bearing decisions, each learned by shipping something broken:
 *
 * 1. **Never name the publication.** The look is a genre; call it documentary in
 *    briefs and docs freely. But in the prompt, two runs settle it — 31 clips
 *    with ingredients only produced 0 wordmarks; 5 clips with "documentary"
 *    restored produced 3, one of them full-frame. The word makes the model draw
 *    letters, and letters are the one thing this footage can never contain.
 *
 * 2. **Ask for no text at all, explicitly.** Not merely "no text" among the
 *    negatives — its own TEXT line. Veo cannot render letterforms reliably, and
 *    a prompt that requests a label gets confident nonsense. Everything the
 *    viewer must read belongs to the overlay layer, in real DOM text.
 *
 * 3. **Say flat 2D, and say never live-action.** Without it, subjects that
 *    suggest a place or a journey come back as filmed video of real people, and
 *    objects drift toward glossy 3D product renders within a few seconds.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';

export const MODEL = 'veo-3.1-lite-generate-001';
export const DURATION = 8;

/** Restate in full for every clip — Veo drifts within a couple of seconds. */
export const STYLE = 'Documentary paper-collage explainer animation. Aged off-white newsprint / grid-paper backdrop, faintly yellowed, with faint printed grid lines, light photocopy artifacts, slight grain and a soft vignette at the edges. All cut-outs are halftone or duotone, with crisp torn outlines and visible slightly-shifting drop shadows, so each reads as a physical piece of paper resting on the scene. Hand-drawn black vector scribbles — arrows, circles, stars, squiggles — draw themselves onto the frame in real time to point at whatever is being shown. Limited palette: black ink, mustard yellow, muted teal, one accent red. Stop-motion cadence at 12 frames per second: snappy frame-by-frame repositioning with intentional paper jitter, no eased interpolation. The paper is completely blank and unprinted — no printed words, no columns of type, no page numbers, no margin notes anywhere, including at the very edges of frame. Entirely flat 2D cut-paper animation — never live-action footage, never a filmed person or place, never a glossy 3D product render.';

export const LIGHTING = 'Flat, even studio light, warm 3400K, no hard shadows, soft vignette at the frame edges.';

export const TEXT = 'TEXT: Zero text on-screen. Do not write any words, letters, numbers, garbled symbols or pseudo-latin text anywhere on the paper or edges.';

export const NEGATIVE = 'Negative Constraints: no text, no letters, no numbers, no words, no captions, no signage, no garbled text, no pseudo-latin gibberish, no logos, no watermarks, no brand marks, no channel idents, no corner bugs, no printed newspaper columns, no page numbers, no marginalia, no lettering at the frame edges, no camera shake, no motion blur, no eased digital interpolation, no 3D glossy render, no plastic or metallic surfaces, no photorealism, no lens flare, no human faces in close-up.';

/**
 * The six dimensions Veo reads as distinct instructions.
 *
 * `beats` is three timestamped actions, not one paragraph. Left to itself the
 * model spends the whole clip easing through a single slow move, and a static
 * frame in this register reads as a mistake rather than a style.
 */
export const buildPrompt = ({ shot, location, beats }) => `SHOT: ${shot}
STYLE: ${STYLE}
LIGHTING: ${LIGHTING}
LOCATION: ${location}
ACTION — timestamped beats:
${beats.join('\n')}
${TEXT}
${NEGATIVE}
Output: ${DURATION}s, 720p, 16:9.`;

/**
 * Whether this shot has anyone in it.
 *
 * `personGeneration: 'allow_adult'` must be set when figures appear and must
 * NOT be set when they do not. Setting it on a shot containing only objects
 * gets the finished video rejected by the output-side safety filter, every
 * time — thirty-six identical rejections on three shelf-and-card shots, while
 * shots of paper crowds in the same batch cleared on the first attempt. The
 * prompt is fine; asking for person generation in a scene with no person is
 * what fails, and the error message ("Try rephrasing the prompt") sends you
 * looking in exactly the wrong place.
 *
 * Detected from the text rather than hand-flagged, because a flag is one more
 * thing to forget when adding a shot.
 */
const HAS_PEOPLE = /\b(figure|figures|person|people|crowd|hand|hands|worker|shopper|queue of)\b/i;
export const shotHasPeople = (shot) =>
    HAS_PEOPLE.test([shot.location, ...shot.beats].join(' '));

export function client({ project, location } = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        return new GoogleGenAI({ apiKey });
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
    }
    return new GoogleGenAI({
        vertexai: true,
        project: project ?? process.env.GOOGLE_CLOUD_PROJECT ?? 'jastalk-firebase',
        location: location ?? process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
    });
}

async function poll(ai, operation) {
    let op = operation;
    for (let attempt = 0; !op.done; attempt++) {
        if (attempt >= 90) throw new Error('timed out waiting for the video operation');
        await new Promise(r => setTimeout(r, 5000));
        op = await ai.operations.getVideosOperation({ operation: op });
        process.stdout.write('.');
    }
    return op;
}

/**
 * Generates the requested clips, skipping any already on disk.
 *
 * Writes only on success, so a rejected or failed generation always leaves the
 * previous version in place — `force` is safe. Rejections cost nothing (nothing
 * is produced), so retrying one is free; only successes bill.
 */
export async function generateClips({ clips, outDir, prefix, only, force }) {
    fs.mkdirSync(outDir, { recursive: true });
    const ai = client();

    const ids = only?.length ? only : Object.keys(clips);
    const unknown = ids.filter(id => !clips[id]);
    if (unknown.length) throw new Error(`unknown clip id: ${unknown.join(', ')}`);

    const file = (id) => path.join(outDir, `${prefix}${id}.mp4`);
    const todo = ids.filter(id => force || !fs.existsSync(file(id)));

    console.log(`🎥 ${MODEL}`);
    console.log(`   ${ids.length} requested, ${ids.length - todo.length} on disk, ${todo.length} to generate`);
    console.log(`   ${todo.length * DURATION}s of Veo to bill\n`);

    const failed = [];
    for (const [i, id] of todo.entries()) {
        process.stdout.write(`[${String(i + 1).padStart(2)}/${todo.length}] ${id.padEnd(26)}`);
        try {
            const op = await ai.models.generateVideos({
                model: MODEL,
                prompt: buildPrompt(clips[id]),
                config: {
                    durationSeconds: DURATION,
                    numberOfVideos: 1,
                    aspectRatio: '16:9',
                    resolution: '720p',
                    // Present only when the shot actually has figures in it —
                    // see shotHasPeople above. This one line is the difference
                    // between a clip that generates and one that is rejected
                    // however many times you retry it.
                    ...(shotHasPeople(clips[id]) ? { personGeneration: 'allow_adult' } : {}),
                },
            });
            const done = await poll(ai, op);
            const video = done?.response?.generatedVideos?.[0]?.video;
            if (!video) {
                const diagnostic = JSON.stringify({
                    operationError: done?.error,
                    response: done?.response,
                }).slice(0, 1400);
                throw new Error(done?.error?.message ?? `no video in response: ${diagnostic}`);
            }

            if (video.videoBytes) {
                fs.writeFileSync(file(id), Buffer.from(video.videoBytes, 'base64'));
            } else if (video.uri) {
                execSync(`gcloud storage cp "${video.uri}" "${file(id)}"`, { stdio: 'pipe' });
            } else {
                throw new Error('response held neither bytes nor a uri');
            }
            console.log(` ✅ ${(fs.statSync(file(id)).size / 1048576).toFixed(1)} MB`);
        } catch (error) {
            failed.push(id);
            console.log(` ❌ ${String(error.message ?? error).replace(/\s+/g, ' ').slice(0, 80)}`);
        }
    }

    console.log(`\n${todo.length - failed.length} generated, ${failed.length} failed`);
    if (failed.length) console.log(`   retry: ${failed.join(' ')}`);
    return failed;
}

/**
 * Turns an 8-second clip into a seamless loop by playing it forward, then
 * backward, and scales it to 1080p on the way.
 *
 * This replaces stretching the clip with `setpts` to fill the narration. The
 * arithmetic is what kills that approach: a 34-second beat over an 8-second
 * clip runs at 0.24x — an effective 5.6 frames per second — and the result does
 * not read as stylised, it reads as buffering. Viewers describe it as the wifi
 * being slow, which is exactly right.
 *
 * A boomerang plays at true speed. Its join is a repeated frame at each end, so
 * looping it has no visible cut, unlike a straight loop which restarts with a
 * hard jump every 8 seconds — the one artefact that makes generated footage
 * look generated.
 *
 * Cached: beats that share a shot share a bed.
 */
export function boomerangBed(clipPath, bedPath, { fps = 24, width = 1920, height = 1080 } = {}) {
    if (!fs.existsSync(clipPath)) return null;
    if (fs.existsSync(bedPath)) return bedPath;

    fs.mkdirSync(path.dirname(bedPath), { recursive: true });
    execSync(
        `ffmpeg -y -i "${clipPath}" -filter_complex ` +
        // Trim 4% off every edge before scaling. Veo 3.1 Lite likes to write
        // pseudo-Latin along the frame border — `Kir hoium 12 ffouo`,
        // `Portmoegasa Mnazahsatia` — and no amount of TEXT or NEGATIVE
        // constraint reliably stops it. Cropping the border removes it for
        // free, and the shots are composed centrally so nothing is lost.
        `"[0:v]crop=iw*0.92:ih*0.92:iw*0.04:ih*0.04,scale=${width}:${height}:flags=lanczos,fps=${fps},setsar=1,split[a][b];` +
        // Dropping the duplicated turning frame is what makes the reversal read
        // as motion rather than a stutter.
        `[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1[v]" ` +
        `-map "[v]" -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p "${bedPath}"`,
        { stdio: 'pipe' });
    return bedPath;
}

/**
 * Tiles one frame from every clip into a single sheet.
 *
 * Review this before assembling, every time. The damage this catches —
 * wordmarks, invented lettering, a shot that came back live-action — is
 * stochastic, so spot-checking one clip proves nothing, and a pixel heuristic
 * cannot tell a logo from the grid lines that are meant to be there.
 */
export function contactSheet({ clips, outDir, prefix, sheetPath, cols = 3 }) {
    const present = Object.keys(clips)
        .map(id => ({ id, file: path.join(outDir, `${prefix}${id}.mp4`) }))
        .filter(c => fs.existsSync(c.file));
    if (!present.length) return console.log('no clips on disk yet');

    if (present.length === 1) {
        execSync(`ffmpeg -y -i "${present[0].file}" -vf "select='eq(n\\,40)',scale=560:315,setsar=1" -frames:v 1 "${sheetPath}"`,
            { stdio: 'pipe' });
        console.log(`contact sheet: ${sheetPath}`);
        console.log(`  r1c1  ${present[0].id}`);
        return;
    }

    const inputs = present.map(c => `-i "${c.file}"`).join(' ');
    // Frame 40, not 0: the opening frames are often still an empty backdrop,
    // and a mark that fades in would be missed.
    const chain = present
        .map((_, i) => `[${i}:v]select='eq(n\\,40)',scale=560:315,setsar=1[t${i}]`)
        .join(';');
    const layout = present
        .map((_, i) => `${(i % cols) * 560}_${Math.floor(i / cols) * 315}`)
        .join('|');
    const stack = present.map((_, i) => `[t${i}]`).join('') +
        `xstack=inputs=${present.length}:layout=${layout}[out]`;

    execSync(`ffmpeg -y ${inputs} -filter_complex "${chain};${stack}" -map "[out]" -frames:v 1 "${sheetPath}"`,
        { stdio: 'pipe' });
    console.log(`contact sheet: ${sheetPath}`);
    present.forEach((c, i) => console.log(`  r${Math.floor(i / cols) + 1}c${(i % cols) + 1}  ${c.id}`));
}
