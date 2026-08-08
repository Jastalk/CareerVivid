/**
 * tiktokKaraokeEngine.mjs
 *
 * Real-Time Sentence-by-Sentence TikTok Caption & Word Highlighting Engine.
 *
 * User Goal:
 *   - Sentence by sentence (or 4-6 word punchy phrase).
 *   - Follows narrator voiceover in real-time.
 *   - Highlights active word with a gold pop background badge / gold text in real time.
 *   - NO huge paragraph boxes covering the screen!
 */

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Key technical terms to always style in bold gold
const KEYWORD_REGEX = /\b(H3|REDIS|O\(1\)|O\(N\)|1\.25 MILLION|10 SECONDS|SURGE|5 MILLION|SQL|GPS|2-PHASE|RAM|1 SECOND|UBER|4K|HLS|DASH|CDN|360P|1080P|720P|ABR|YOUTUBE|MRBEAST|BLOB|S3|GCS|2-SECOND|1 BILLION|INSTAGRAM|FAN-OUT|CELEBRITY|WEBP|AVIF|300 MILLION|2 BILLION|100|10MS|ZSET|AIRBNB|REDLOCK|MUTEX|GEOHASH|ELASTICSEARCH|ACID|POSTGRESQL|7 MILLION|10 MINUTES|20 MILLISECONDS|OPENAI|CHATGPT|SSE|KV CACHE|vLLM|VRAM|NVIDIA H100|TOKENS|100 MILLION|1 MILLION|30 WORDS|5 MILLISECONDS|CLAUDE CODE|SUBAGENT|FLEET|RESEARCHER|DEBUGGER|AUDITOR|CONTEXT|SUMMARY|CHECKPOINT|RM -RF|CPU|EVENT-DRIVEN)\b/i;

/** Split narration text into sentence or short clause chunks (4 to 6 words max). */
export function splitIntoSentenceChunks(text, maxWords = 6) {
    const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    const chunks = [];
    let current = [];

    for (const word of words) {
        current.push(word);
        const endsSentence = /[.,!?;:—–]$/.test(word);
        if (current.length >= maxWords || (endsSentence && current.length >= 3)) {
            chunks.push(current.join(' '));
            current = [];
        }
    }
    if (current.length) {
        if (current.length === 1 && chunks.length) {
            chunks[chunks.length - 1] += ' ' + current[0];
        } else {
            chunks.push(current.join(' '));
        }
    }
    return chunks;
}

/** Assign start and end timestamps (seconds) to each chunk based on character length share. */
export function calculateChunkTimelines(chunks, totalDuration) {
    const weights = chunks.map(c => Math.max(c.length, 1));
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

    let currentTime = 0;
    return chunks.map((text, i) => {
        const span = (weights[i] / totalWeight) * totalDuration;
        const item = { text, start: currentTime, end: currentTime + span, duration: span };
        currentTime += span;
        return item;
    });
}

/**
 * Builds HTML and CSS animation for real-time sentence-by-sentence captions
 * with active word pop badges!
 */
export function generateTikTokCaptionHTMLCSS(narrationEn, beatDuration) {
    const chunks = calculateChunkTimelines(splitIntoSentenceChunks(narrationEn, 6), beatDuration);
    if (!chunks.length) return { html: '', css: '' };

    const cssRules = [];
    const htmlChunks = [];

    chunks.forEach((chunk, cIdx) => {
        const pct = (t) => Math.max(0, Math.min(100, (t / beatDuration) * 100)).toFixed(3);
        const cStart = pct(chunk.start);
        const cEnd = pct(chunk.end);

        // Keyframe for sentence chunk visibility
        cssRules.push(`
            @keyframes chunk_${cIdx} {
                0%, ${cStart}% { opacity: 0; transform: translateY(12px) scale(0.95); }
                ${(parseFloat(cStart) + 0.1).toFixed(3)}%, ${(parseFloat(cEnd) - 0.1).toFixed(3)}% { opacity: 1; transform: translateY(0) scale(1); }
                ${cEnd}%, 100% { opacity: 0; transform: translateY(-8px) scale(0.98); }
            }
            .chunk_box_${cIdx} {
                animation: chunk_${cIdx} ${beatDuration}s linear forwards;
            }
        `);

        // Split chunk into individual words for real-time word pop animation
        const words = chunk.text.split(/\s+/).filter(Boolean);
        const wordWeightSum = words.reduce((acc, w) => acc + Math.max(w.length, 1), 0);
        let wordTime = chunk.start;

        const wordSpans = words.map((w, wIdx) => {
            const wSpan = (Math.max(w.length, 1) / wordWeightSum) * chunk.duration;
            const wStartPct = pct(wordTime);
            const wEndPct = pct(wordTime + wSpan);
            wordTime += wSpan;

            const isKeyword = KEYWORD_REGEX.test(w);

            // Keyframe for active spoken word highlight (Image 1 style purple/gold pop badge!)
            cssRules.push(`
                @keyframes word_pop_${cIdx}_${wIdx} {
                    0%, ${wStartPct}% {
                        background: transparent;
                        color: ${isKeyword ? '#facc15' : '#ffffff'};
                        transform: scale(1);
                    }
                    ${(parseFloat(wStartPct) + 0.05).toFixed(3)}%, ${(parseFloat(wEndPct) - 0.05).toFixed(3)}% {
                        background: #facc15;
                        color: #000000;
                        padding: 2px 10px;
                        border-radius: 8px;
                        transform: scale(1.08);
                        box-shadow: 0 0 15px rgba(250,204,21,0.8);
                    }
                    ${wEndPct}%, 100% {
                        background: transparent;
                        color: ${isKeyword ? '#facc15' : '#ffffff'};
                        transform: scale(1);
                    }
                }
                .w_pop_${cIdx}_${wIdx} {
                    display: inline-block;
                    margin: 0 4px;
                    transition: all 0.1s ease;
                    animation: word_pop_${cIdx}_${wIdx} ${beatDuration}s linear forwards;
                }
            `);

            return `<span class="w_pop_${cIdx}_${wIdx}">${esc(w)}</span>`;
        });

        htmlChunks.push(`
            <div class="tiktok-sentence-card chunk_box_${cIdx}">
                <div class="tiktok-sentence-pill">
                    ${wordSpans.join(' ')}
                </div>
            </div>
        `);
    });

    const fullCSS = `
        .tiktok-caption-stack {
            position: absolute;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
            max-width: 1600px;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 50;
            pointer-events: none;
        }
        .tiktok-sentence-card {
            position: absolute;
            bottom: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            width: 100%;
        }
        .tiktok-sentence-pill {
            background: rgba(0, 0, 0, 0.90);
            border: 3px solid #facc15;
            padding: 18px 44px;
            border-radius: 28px;
            text-align: center;
            backdrop-filter: blur(16px);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85);
            font-size: 34px;
            font-weight: 900;
            line-height: 1.3;
            letter-spacing: 0.5px;
            color: #ffffff;
        }
        ${cssRules.join('\n')}
    `;

    const fullHTML = `
        <div class="tiktok-caption-stack">
            ${htmlChunks.join('\n')}
        </div>
    `;

    return { html: fullHTML, css: fullCSS };
}
