/**
 * Generates course narration with Google Cloud Text-to-Speech (Chirp3-HD).
 *
 * Audio is the clock: the visual timeline is laid out from the real measured
 * length of each clip, never from a guess. So this writes LINEAR16 WAV rather
 * than MP3 — a WAV's duration falls straight out of its byte count, with no
 * decoding step and no rounding.
 *
 *   npx vite-node scripts/ccaf/generate-narration.mjs -- [outDir]
 *
 * Env:
 *   VOICES=charon,zephyr   only these presets (default: all six)
 *   LOCALES=en,zh          only these languages (default: both)
 *   LESSONS=read-the-signal
 *
 * Auth: the gitignored service-account key, same as the image script.
 * Nothing here prints a credential.
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { VIDEO_LESSONS } from './lessonScripts.ts';

const OUT_DIR = process.argv[2] || 'scratchpad/narration';
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

/**
 * Six presets, three of each gender. The Chirp3-HD names are identical across
 * en-US and cmn-CN, so one preset covers both languages — verified against
 * the live voices.list, not assumed.
 */
export const VOICE_PRESETS = [
    { id: 'charon', gender: 'male', label: { en: 'Steady lecturer', zh: '稳重讲师' }, voice: 'Charon' },
    { id: 'puck', gender: 'male', label: { en: 'Bright and brisk', zh: '年轻干练' }, voice: 'Puck' },
    { id: 'enceladus', gender: 'male', label: { en: 'Low narrator', zh: '低沉叙述' }, voice: 'Enceladus' },
    { id: 'zephyr', gender: 'female', label: { en: 'Clear and bright', zh: '清晰明亮' }, voice: 'Zephyr' },
    { id: 'aoede', gender: 'female', label: { en: 'Warm and friendly', zh: '温和亲切' }, voice: 'Aoede' },
    { id: 'kore', gender: 'female', label: { en: 'Calm professional', zh: '冷静专业' }, voice: 'Kore' },
];

const LOCALE_CODES = { en: 'en-US', zh: 'cmn-CN' };

/** WAV header is 44 bytes; the rest is 16-bit mono PCM at the stated rate. */
const SAMPLE_RATE = 24000;
const wavDurationMs = (bytes) => Math.round(((bytes - 44) / (SAMPLE_RATE * 2)) * 1000);

const getToken = async () => {
    const auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'firebase-service-account.json',
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const token = await (await auth.getClient()).getAccessToken();
    return token.token || token;
};

const synthesize = async (token, text, languageCode, voiceName) => {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text },
            voice: { languageCode, name: `${languageCode}-Chirp3-HD-${voiceName}` },
            // LINEAR16 so the duration is exact and free to compute.
            audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SAMPLE_RATE },
        }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error?.message?.slice(0, 160) ?? `HTTP ${res.status}`);
    return Buffer.from(body.audioContent, 'base64');
};

const main = async () => {
    const wantVoices = process.env.VOICES?.split(',');
    const wantLocales = process.env.LOCALES?.split(',') ?? ['en', 'zh'];
    const wantLessons = process.env.LESSONS?.split(',');

    const voices = wantVoices ? VOICE_PRESETS.filter(v => wantVoices.includes(v.id)) : VOICE_PRESETS;
    const lessons = wantLessons ? VIDEO_LESSONS.filter(l => wantLessons.includes(l.missionId)) : VIDEO_LESSONS;
    if (!voices.length || !lessons.length) throw new Error('Filters matched nothing');

    const token = await getToken();
    const manifest = [];
    const failures = [];

    for (const lesson of lessons) {
        for (const locale of wantLocales) {
            const languageCode = LOCALE_CODES[locale];
            if (!languageCode) throw new Error(`Unknown locale: ${locale}`);

            for (const preset of voices) {
                const dir = path.join(OUT_DIR, lesson.missionId, locale, preset.id);
                fs.mkdirSync(dir, { recursive: true });
                let total = 0;
                const beats = [];

                for (const beat of lesson.beats) {
                    // Atmosphere shots have no voice — they hold a fixed length.
                    if (!beat.narration) {
                        beats.push({ id: beat.id, kind: beat.kind, ms: (beat.fixedSeconds ?? 8) * 1000, silent: true });
                        total += (beat.fixedSeconds ?? 8) * 1000;
                        continue;
                    }
                    const file = path.join(dir, `${beat.id}.wav`);

                    // Resume: a finished clip is never re-synthesised, so a rerun
                    // after one failure costs almost nothing.
                    if (fs.existsSync(file) && !process.env.FORCE) {
                        const ms = wavDurationMs(fs.statSync(file).size);
                        beats.push({ id: beat.id, kind: beat.kind, ms, file: path.relative(OUT_DIR, file) });
                        total += ms;
                        continue;
                    }

                    let audio = null;
                    for (let attempt = 1; attempt <= 3 && !audio; attempt += 1) {
                        try {
                            audio = await synthesize(token, beat.narration[locale], languageCode, preset.voice);
                        } catch (error) {
                            const last = attempt === 3;
                            console.log(`    ! ${lesson.missionId}/${locale}/${preset.id}/${beat.id} attempt ${attempt}: ${error.message}`);
                            if (last) failures.push({ lesson: lesson.missionId, locale, voice: preset.id, beat: beat.id, why: error.message });
                        }
                    }
                    if (!audio) continue;

                    fs.writeFileSync(file, audio);
                    const ms = wavDurationMs(audio.length);
                    beats.push({ id: beat.id, kind: beat.kind, ms, file: path.relative(OUT_DIR, file) });
                    total += ms;
                }

                manifest.push({ missionId: lesson.missionId, locale, voice: preset.id, totalMs: total, beats });
                console.log(`  ${lesson.missionId} · ${locale} · ${preset.id.padEnd(10)} ${(total / 1000).toFixed(1)}s`);
            }
        }
    }

    if (failures.length) {
        console.log(`\n${failures.length} clip(s) failed:`);
        for (const f of failures) console.log(`  ${f.lesson}/${f.locale}/${f.voice}/${f.beat} — ${f.why}`);
    }

    const manifestPath = path.join(OUT_DIR, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ voices: VOICE_PRESETS, lessons: manifest }, null, 2));
    console.log(`\nmanifest → ${manifestPath}`);

    // The gap between languages is the reason each locale gets its own timeline.
    for (const lesson of lessons) {
        const byLocale = wantLocales.map(locale => {
            const runs = manifest.filter(m => m.missionId === lesson.missionId && m.locale === locale);
            const avg = runs.reduce((sum, r) => sum + r.totalMs, 0) / (runs.length || 1);
            return `${locale} ${(avg / 1000).toFixed(1)}s`;
        });
        console.log(`${lesson.missionId}: ${byLocale.join('  ·  ')}`);
    }
};

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
