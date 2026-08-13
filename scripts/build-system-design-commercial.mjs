/**
 * build-system-design-commercial.mjs
 *
 * Master video compositor for CareerVivid System Design & Career Coach Agent Commercial:
 * 1) Weaves Veo 3.1 Lite AI Video Clips (Beats 1, 2, 6) with EXTENDED Real Human-Agent Live Dialogue Video Clips (Beats 3: 20s, Beat 4: 30s, Beat 5: 20s)
 * 2) Beats 1, 2, 6 use Chirp3-HD voiceover narration
 * 3) Beats 3, 4, 5 UNMUTE & PLAY THE REAL RECORDED HUMAN & CAREER AGENT DIALOGUE AUDIO!
 * 4) Applies background soundtrack (bgm-d12.mp3) at ultra-low volume (volume=0.015 / -36dB)
 * 5) Standardizes H.264 High Profile Level 4.1 + 48kHz stereo AAC + faststart for 100% QuickTime & Web playback
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const BASE_DIR = path.resolve('public/commercial-videos/careervivid-system-design');
const VEO_DIR = path.join(BASE_DIR, 'assets/veo');
const DIALOGUE_DIR = path.join(BASE_DIR, 'assets/agent_dialogue');
const NARR_DIR = path.join(BASE_DIR, 'assets/narration');
const OUT_MP4 = path.join(BASE_DIR, 'careervivid_system_design_commercial.mp4');
const BGM_PATH = path.resolve('public/assets/bgm-d12.mp3');
const FONT_FILE = '/System/Library/Fonts/Helvetica.ttc';

/**
 * Escape a value for use inside an ffmpeg filtergraph argument.
 *
 * Two things here are easy to get wrong, and the old code got both wrong.
 *
 * First, the backslash must be escaped BEFORE anything else. Escaping ':' first
 * — which is all the previous version did — leaves a literal backslash in the
 * value sitting in front of the `\:` we just wrote, so the parser reads it as an
 * escaped backslash followed by a bare ':', an option separator in the middle
 * of a value. ffmpeg then rejects the graph, or reads the tail as a different
 * option.
 *
 * Second, ffmpeg unescapes TWICE: the filtergraph parser splits the description
 * on ':', ',', ';', '[' and ']' and consumes one layer, then each filter's own
 * option parser consumes another. Escaping once survives the first pass and is
 * eaten by the second. Verified against ffmpeg 7.1.1 with a path containing a
 * quote, a backslash, a colon, a comma, a semicolon and brackets: escaping once
 * fails to parse, escaping twice renders.
 */
const escapeOnce = (value) =>
    String(value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/([:,;[\]])/g, '\\$1');

const escapeFilterArg = (value) => escapeOnce(escapeOnce(value));

/**
 * The concat demuxer reads one single-quoted path per line. A quote inside the
 * path has to close the quoting, escape the literal, and reopen it — otherwise
 * the list points at a path that is not the file we rendered.
 */
const concatLine = (file) => `file '${String(file).replace(/'/g, "'\\''")}'`;

/**
 * Run ffmpeg with an argument array rather than a command string.
 *
 * Nothing here goes near a shell, so a path containing a quote, a space, a '$'
 * or a ';' is passed through as one argument instead of being re-parsed. The
 * paths are derived from process.cwd(), which this script does not control.
 */
const ffmpeg = (args) => execFileSync('ffmpeg', args, { stdio: 'pipe' });

const BEATS = [
    {
        id: 'beat1',
        video: path.join(VEO_DIR, 'veo_beat1_hook.mp4'),
        audio: path.join(NARR_DIR, 'beat1-hook.wav'),
        dur: 6.4,
        useLiveAudio: false,
        label: 'SYSTEM DESIGN BOTTLENECK'
    },
    {
        id: 'beat2',
        video: path.join(VEO_DIR, 'veo_beat2_solution.mp4'),
        audio: path.join(NARR_DIR, 'beat2-solution.wav'),
        dur: 7.0,
        useLiveAudio: false,
        label: 'CAREER COACH AGENT INTRODUCTION'
    },
    {
        id: 'beat3',
        video: path.join(DIALOGUE_DIR, 'human_prompts_agent.mp4'),
        dur: 20.0, // EXTENDED 20s
        useLiveAudio: true, // UNMUTE & PLAY ORIGINAL RECORDED HUMAN-AGENT DIALOGUE AUDIO!
        label: 'HUMAN INTERACTION: PROMPTING CAREER AGENT'
    },
    {
        id: 'beat4',
        video: path.join(DIALOGUE_DIR, 'agent_evaluates_system.mp4'),
        dur: 30.0, // EXTENDED 30s IN-DEPTH ANALYSIS
        useLiveAudio: true, // UNMUTE & PLAY ORIGINAL RECORDED CAREER AGENT AUDIO!
        label: 'CAREER AGENT LIVE ARCHITECTURAL ANALYSIS & SCORECARD'
    },
    {
        id: 'beat5',
        video: path.join(DIALOGUE_DIR, 'agent_coaching_dialogue.mp4'),
        dur: 20.0, // EXTENDED 20s
        useLiveAudio: true, // UNMUTE & PLAY ORIGINAL RECORDED COACHING DIALOGUE AUDIO!
        label: 'CAREER COACH AGENT REAL-TIME FEEDBACK'
    },
    {
        id: 'beat6',
        video: path.join(VEO_DIR, 'veo_beat5_outro.mp4'),
        audio: path.join(NARR_DIR, 'beat6-outro.wav'),
        dur: 6.6,
        useLiveAudio: false,
        label: 'PRACTICE TODAY AT CAREERVIVID.APP'
    }
];

async function assembleMasterFilm() {
    console.log('🎬 Assembling Extended Commercial Video with LIVE UNMUTED HUMAN & CAREER AGENT DIALOGUE AUDIO...\n');

    // Clean temp_beats directory
    const tempDir = path.join(BASE_DIR, 'temp_beats');
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // 1. Verify inputs
    for (const b of BEATS) {
        if (!fs.existsSync(b.video)) throw new Error(`Missing video file: ${b.video}`);
        if (!b.useLiveAudio && !fs.existsSync(b.audio)) throw new Error(`Missing audio file: ${b.audio}`);
    }

    const renderedBeats = [];

    // 2. Render each beat
    for (let i = 0; i < BEATS.length; i++) {
        const b = BEATS[i];
        const beatFile = path.join(tempDir, `beat_${i + 1}.mp4`);
        console.log(`🎞️ Rendering Beat ${i + 1} (${b.id}): video=${path.basename(b.video)}, dur=${b.dur}s, liveAudio=${b.useLiveAudio}...`);

        /*
         * The label goes through a file rather than `text=`. Inlining it meant
         * escaping the same string for the drawtext option, the filter
         * argument, the filtergraph and the shell all at once, which is why the
         * old version quietly deleted every apostrophe and left backslashes
         * unescaped. `textfile=` is read verbatim, so only the path — which we
         * name ourselves — has to be escaped. expansion=none stops drawtext
         * treating a '%{...}' in a label as a directive to evaluate.
         */
        const labelFile = path.join(tempDir, `beat_${i + 1}_label.txt`);
        fs.writeFileSync(labelFile, b.label);

        const drawtextFilter = `drawtext=fontfile=${escapeFilterArg(FONT_FILE)}`
            + `:textfile=${escapeFilterArg(labelFile)}:expansion=none`
            + ':fontcolor=white:fontsize=30:box=1:boxcolor=0x0f172a@0.95:boxborderw=14:x=60:y=h-90';

        const videoChain = `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=60,${drawtextFilter}[v]`;
        const encode = ['-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1',
            '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '16'];

        if (b.useLiveAudio) {
            // Unmute & play original recorded audio track from the dialogue clip directly!
            ffmpeg([
                '-y', '-i', b.video, '-t', String(b.dur),
                '-filter_complex', `${videoChain};[0:a]volume=2.5,aformat=sample_rates=48000:channel_layouts=stereo[a]`,
                '-map', '[v]', '-map', '[a]',
                ...encode, '-c:a', 'aac', '-b:a', '192k', beatFile,
            ]);
        } else {
            // Mux narration WAV audio for intro/outro beats
            ffmpeg([
                '-y', '-stream_loop', '-1', '-i', b.video, '-i', b.audio, '-t', String(b.dur),
                '-filter_complex', videoChain,
                '-map', '[v]', '-map', '1:a',
                ...encode, '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '192k', beatFile,
            ]);
        }
        renderedBeats.push(beatFile);
        console.log(`   ✅ Rendered Beat ${i + 1} (${(fs.statSync(beatFile).size / (1024 * 1024)).toFixed(2)} MB)`);
    }

    // 3. Create concat file
    const concatTxt = path.join(tempDir, 'concat.txt');
    const concatLines = renderedBeats.map(concatLine).join('\n');
    fs.writeFileSync(concatTxt, concatLines);

    // 4. Concat all beats and mix with BGM track
    console.log('\n🎵 Final Muxing: Video Beats + Extended Live Dialogue Audio + Background Music (volume=0.015)...');
    const rawConcatMp4 = path.join(tempDir, 'raw_concat.mp4');
    ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatTxt, '-c', 'copy', rawConcatMp4]);

    const totalDur = BEATS.reduce((acc, b) => acc + b.dur, 0);
    ffmpeg([
        '-y', '-i', rawConcatMp4, '-stream_loop', '-1', '-i', BGM_PATH,
        '-filter_complex',
        `[1:a]volume=0.015,afade=t=in:st=0:d=1.5,afade=t=out:st=${(totalDur - 2.0).toFixed(1)}:d=2.0[bgm];`
        + '[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]',
        '-map', '0:v', '-map', '[a]',
        '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '192k',
        '-movflags', '+faststart', OUT_MP4,
    ]);

    const finalMB = (fs.statSync(OUT_MP4).size / (1024 * 1024)).toFixed(2);
    console.log(`\n--------------------------------------------------------`);
    console.log(`🎉 [COMPLETED] Extended Live Dialogue Commercial Video!`);
    console.log(`📹 Master Video: ${OUT_MP4}`);
    console.log(`⏱️ Duration: ${totalDur.toFixed(1)}s | Size: ${finalMB} MB`);
    console.log(`--------------------------------------------------------\n`);
}

assembleMasterFilm().catch(console.error);
