/**
 * generate-veo-clips.mjs
 *
 * For each `veo` beat in VIDEO_LESSONS for a lesson:
 *   1. Use the already-generated PNG backplate (public/assets/ccaf-backplates/)
 *   2. Call Veo Image-to-Video via @google/genai (Vertex AI)
 *   3. Poll until done, save the resulting MP4 clip
 *
 * Usage:
 *   LESSONS=contract-breakdown node scripts/ccaf/generate-veo-clips.mjs
 *   LESSONS=read-the-signal,two-truncations node scripts/ccaf/generate-veo-clips.mjs
 *
 * Output:  public/ccaf-lessons/clips/<missionId>--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { VIDEO_LESSONS } from './lessonScripts.ts';

const BACKPLATE_DIR = 'public/assets/ccaf-backplates';
const OUT_DIR = 'public/ccaf-lessons/clips';
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL = 'veo-3.1-lite-generate-001';
const DURATION_SECONDS = 8;

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });

/**
 * Poll the long-running Veo operation until done, then return the video bytes
 * or GCS URI.
 */
async function pollOperation(operation) {
    let op = operation;
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // 5 minutes max
    while (!op.done) {
        if (attempts++ >= MAX_ATTEMPTS) throw new Error('Timeout waiting for Veo operation');
        await new Promise(r => setTimeout(r, 5000));
        op = await ai.operations.getVideosOperation({ operation: op });
        process.stdout.write('.');
    }
    console.log('');
    return op;
}

async function generateClip(lesson, beat, outFile) {
    const backplatePath = path.join(BACKPLATE_DIR, `${lesson.missionId}--${beat.id}.png`);

    // --- Image-to-Video: use PNG backplate as first frame ---
    if (fs.existsSync(backplatePath)) {
        console.log(`  📸→🎬 Image-to-Video: ${lesson.missionId}/${beat.id}`);
        const imageBytes = fs.readFileSync(backplatePath).toString('base64');
        process.stdout.write('  Polling');
        const op = await ai.models.generateVideos({
            model: MODEL,
            prompt: beat.motion || `Smooth 2D animation. ${beat.imagePrompt}`,
            image: {
                imageBytes,
                mimeType: 'image/png',
            },
            config: {
                durationSeconds: DURATION_SECONDS,
                numberOfVideos: 1,
                aspectRatio: '16:9',
            },
        });
        const doneOp = await pollOperation(op);
        saveVideo(doneOp, outFile);
    } else {
        // --- Text-to-Video: no backplate yet, use text prompt directly ---
        console.log(`  📝→🎬 Text-to-Video: ${lesson.missionId}/${beat.id}`);
        process.stdout.write('  Polling');
        const op = await ai.models.generateVideos({
            model: MODEL,
            prompt: `${beat.imagePrompt} ${beat.motion || ''}`.trim(),
            config: {
                durationSeconds: DURATION_SECONDS,
                numberOfVideos: 1,
                aspectRatio: '16:9',
            },
        });
        const doneOp = await pollOperation(op);
        saveVideo(doneOp, outFile);
    }
}

async function main() {
    const want = process.env.LESSONS?.split(',').map(s => s.trim());
    const lessons = want
        ? VIDEO_LESSONS.filter(l => want.includes(l.missionId))
        : VIDEO_LESSONS;

    const shots = lessons.flatMap(lesson =>
        lesson.beats
            .filter(beat => beat.kind === 'veo' && (beat.imagePrompt || beat.motion))
            .map(beat => ({ lesson, beat })),
    );

    console.log(`🎬 Generating ${shots.length} Veo clips across ${lessons.length} lessons`);
    console.log(`   Model: ${MODEL}  |  Duration: ${DURATION_SECONDS}s  |  Output: ${OUT_DIR}\n`);

    let done = 0, skipped = 0, failed = 0;

    for (const { lesson, beat } of shots) {
        const outFile = path.join(OUT_DIR, `${lesson.missionId}--${beat.id}.mp4`);

        if (fs.existsSync(outFile) && !process.env.FORCE) {
            console.log(`  ✓ skip (exists): ${lesson.missionId}/${beat.id}`);
            skipped++;
            continue;
        }

        let success = false;
        const models = [MODEL];
        for (const tryModel of models) {
            try {
                // Temporarily override model for retry
                const origModel = MODEL;
                await generateClipWithModel(lesson, beat, outFile, tryModel);
                console.log(`  ✅ ${lesson.missionId}/${beat.id} → ${outFile}`);
                done++;
                success = true;
                break;
            } catch (err) {
                console.error(`  ⚠️  ${lesson.missionId}/${beat.id} with ${tryModel}: ${err.message.split('\n')[0]}`);
                if (!err.message.includes('NOT_FOUND') && !err.message.includes('404')) break;
            }
        }
        if (!success) failed++;
    }

    console.log(`\n✅ ${done} generated  ·  ${skipped} skipped  ·  ${failed} failed`);
}

async function generateClipWithModel(lesson, beat, outFile, model) {
    const backplatePath = path.join(BACKPLATE_DIR, `${lesson.missionId}--${beat.id}.png`);

    if (fs.existsSync(backplatePath)) {
        console.log(`  📸→🎬 Image-to-Video [${model}]: ${lesson.missionId}/${beat.id}`);
        const imageBytes = fs.readFileSync(backplatePath).toString('base64');
        process.stdout.write('  Polling');
        const op = await ai.models.generateVideos({
            model,
            prompt: beat.motion || `Smooth cinematic 2D animation. ${beat.imagePrompt}`,
            image: {
                imageBytes,
                mimeType: 'image/png',
            },
            config: {
                durationSeconds: DURATION_SECONDS,
                numberOfVideos: 1,
                aspectRatio: '16:9',
            },
        });
        const doneOp = await pollOperation(op);
        const videos = doneOp?.response?.generatedVideos;
        if (!videos?.length) throw new Error('No videos in response');
        const video = videos[0];
        if (video.video?.videoBytes) {
            fs.writeFileSync(outFile, Buffer.from(video.video.videoBytes, 'base64'));
        } else if (video.video?.uri) {
            execSync(`gcloud storage cp "${video.video.uri}" "${outFile}"`, { stdio: 'inherit' });
        } else {
            throw new Error(`Unknown video format: ${JSON.stringify(video).slice(0, 200)}`);
        }
    } else {
        console.log(`  📝→🎬 Text-to-Video [${model}]: ${lesson.missionId}/${beat.id}`);
        process.stdout.write('  Polling');
        const op = await ai.models.generateVideos({
            model,
            prompt: `${beat.imagePrompt || ''} ${beat.motion || ''}`.trim(),
            config: {
                durationSeconds: DURATION_SECONDS,
                numberOfVideos: 1,
                aspectRatio: '16:9',
            },
        });
        const doneOp = await pollOperation(op);
        const videos = doneOp?.response?.generatedVideos;
        if (!videos?.length) throw new Error('No videos in response');
        const video = videos[0];
        if (video.video?.videoBytes) {
            fs.writeFileSync(outFile, Buffer.from(video.video.videoBytes, 'base64'));
        } else if (video.video?.uri) {
            execSync(`gcloud storage cp "${video.video.uri}" "${outFile}"`, { stdio: 'inherit' });
        } else {
            throw new Error(`Unknown video format: ${JSON.stringify(video).slice(0, 200)}`);
        }
    }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
