---
name: vox-system-design-video-production
description: >
  Quality pipeline for System Design explainer videos: Veo 3.1 Lite paper-collage
  footage, boomerang beds, TikTok-style English captions, paper concept tags.
  Changes how a video looks and moves. Never changes the script.
metadata:
  version: "6.0.0"
  model: veo-3.1-lite-generate-001
  grammar: scripts/system-design-interview/paperCollagePromptGrammar.mjs
  captions: scripts/system-design-interview/karaokeSubtitles.mjs
---

# System Design Video Production

**The script is not yours.** Narration, titles and card copy pass through
untouched. This skill changes only the picture and the motion. If a fix seems to
need a wording change, report it and stop.

---

## 1 · Model

**`veo-3.1-lite-generate-001`** — 720p, 24fps, 8s max, ~$0.30 a clip.

Ids end in **`-001`**, never `-preview`. To see what exists use
`ai.models.list()` — it is free. **Never probe by generating**: a probe that
succeeds bills for a real clip.

Use `veo-3.1-lite-generate-001` exclusively. Do not fall back to a different
Veo model without an explicit user decision.
- `veo-3.1-lite-generate-001` ($0.05/sec, ~$0.40 per 8s clip, ~$2.40 per full video). Use this model for all AI video clip generation.

**Assembly is free.** Captions, overlays, speed, BGM and encoding are local
ffmpeg. Never regenerate footage to change any of them.

---

## 2 · Prompts

Import the grammar; do not retype it. `paperCollagePromptGrammar.mjs` holds
STYLE, LIGHTING, TEXT and NEGATIVE, and `buildPrompt()` assembles the six
dimensions. Per shot, write only **SHOT**, **LOCATION**, and **three timed
ACTION beats**.

- **Name concrete objects** — a filing drawer, a bucket, a door, a map with pins.
  Given "a paper rectangle" the model has nothing to draw and invents lettering.
- **Keep it short.** Veo 3.1 renders a plain description well. Extra adjectives
  add nothing and give it more to misread.
- **Never name a company or publication.** It draws the logo.

**`personGeneration: 'allow_adult'` only when figures appear.** On an object-only
shot it gets the finished video rejected every time, with an error that blames
the prompt. `shotHasPeople()` handles this.

### When a shot comes back wrong

| symptom | fix |
| :--- | :--- |
| invented lettering | name a real object; avoid one wide empty surface |
| live-action footage | strip words implying a place or a journey |
| safety rejection | rename the object — `seal`→`sticker`, `safe`→`cupboard`, `crate`→`box`, `key`/`bolt`→`tag`/`bar`, `shelf`→`tabletop` |

Rejections are free and random. Retry twice, rewrite once, then point the beat at
an existing clip via `CLIP_FOR` and move on.

**Review before assembly** — `--sheet` tiles every clip into one image.

---

## 3 · Motion

**Never `setpts`-stretch to fill narration.** A 34s beat over an 8s clip runs at
0.24× and reads as buffering.

**Boomerang** (`boomerangBed()`): forward then reversed, looped — true speed,
invisible join. It also crops 4% off each edge, which removes the pseudo-Latin
Lite writes along the border. Compose centrally so the crop takes nothing.

**Drift**: a 16s boomerang under a 33s beat plays twice, and an identical repeat
is what viewers notice. Pan slowly across the beat from an oversized bed:

```
scale=2208:1242:flags=lanczos,crop=1920:1080:x='(iw-ow)*min(t/DUR\,1)':y='(ih-oh)/2'
```

---

## 4 · Captions and overlay

Rendering only — the words come from the script. `karaokeSubtitles.mjs` does it.

- **English, one chunk at a time**, 4–5 words, swapped as the narrator reaches
  them. Break at punctuation. 58px, weight 900, white, heavy outline, no box.
- **Time by character share** of the beat's measured duration.
- **Concept tags**: real DOM text as paper tags, two or three per beat, naming
  only what the narration is on right then. Veo cannot write, so an unlabelled
  box has to be told it is a database.
- **Nothing else floats.** No brand badge, no concept pills, no subtitle box. One
  small chapter label; an end card on the last beat.

---

## 5 · Assembly

**Upscale the clip to 1080p before overlaying.** Composite a 1920×1080 caption
frame onto a 720p bed and ffmpeg crops it: tags leave the frame and the whole
caption track falls below it. The film renders and plays with no captions at all.

Captions change over the beat, so the overlay is a **frame sequence**. Pause every
CSS animation and seek per frame — deterministic:

```javascript
await page.evaluate(() => document.getAnimations({ subtree: true }).forEach(a => a.pause()));
for (let f = 0; f < frames; f++) {
    await page.evaluate(ms => document.getAnimations({ subtree: true })
        .forEach(a => { a.currentTime = ms; }), (f / 24) * 1000);
    await page.screenshot({ path: `f${String(f).padStart(5,'0')}.png`, type: 'png', omitBackground: true });
}
```

```bash
ffmpeg -y -stream_loop -1 -i bed.mp4 -framerate 24 -i "frames/f%05d.png" -i narration.wav \
  -filter_complex "[0:v]${drift}[bg];[bg][1:v]overlay=0:0:shortest=1[v]" \
  -map "[v]" -map 2:a -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest beat.mp4
```

Concat `-c copy`, mux BGM, finish `-movflags +faststart`.
**Audio is the clock**: `duration = (bytes - 44) / (24000 * 2) + 0.35`.

---

## 6 · Operational

- **Run from the repo root.** The service account is found by relative path;
  from a subdirectory it falls back to expired credentials.
- **Keep shot prompts in the generator.** A batch whose prompts were not saved
  had to have all 27 shots rewritten from scratch.
- **Do not `FORCE=1` a clip that is already fine.** Two days of needless
  re-shoots cost $516 on the old model.
- **Generated media is gitignored**, so it does not exist in a git worktree — run
  the dev server from the main repo or the video 404s.
- **Sample four frames of the finished file and look at them** before calling it
  done. A missing caption track and a burned-in wordmark both play fine.

---

## 7 · Verified Links & YouTube Description Template

Whenever publishing videos or generating YouTube descriptions for CareerVivid, you MUST use these exact verified CareerVivid URLs:

- **System Design Learning**: `https://careervivid.app/learning/system-design-interview`
- **Coding for Beginners**: `https://careervivid.app/learning/coding-interview-patterns`
- **300+ Real Tech Company Interview Questions**: `https://careervivid.app/interview-studio`

### Standard Description Template:
```text
[Video Summary & Hook]

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #SoftwareEngineering #TechInterview #CareerVivid
```

---

## 8 · Mandatory 6-Section Educational Knowledge Structure (Hello Interview Blueprint)

Every System Design video, lesson script, and explainer MUST strictly contain and structure knowledge across these 6 explicit sections:

1. **Section 1 — Monolith Intuition Hook**:
   - Start with a simple 1-database scenario (e.g. single SQL transaction).
   - Explain baseline ACID guarantees before scaling so learners build immediate intuition.

2. **Section 2 — Scalability Bottlenecks & Degradation**:
   - Show why microservices and database sharding break single-node guarantees under 100k+ QPS.
   - Introduce core trade-offs (e.g. 2PC vs Saga, Latency vs Consistency, CAP Theorem).

3. **Section 3 — Mechanical Protocol Deep Dive**:
   - Step-by-step breakdown of component interactions (e.g., WebSocket Gateway Fleets, Signal E2EE, Redis Redlock Mutex, Vector Recall vs Ranking).

4. **Section 4 — Production Failure Modes & Edge Cases ("What Breaks?")**:
   - Dedicated analysis of real-world production outages:
     - *Dual-write failures* & Outbox CDC (Debezium WAL tailing).
     - *Cache stampedes* & Stale-While-Revalidate.
     - *Split-brain & Network Partitions*.
     - *Compensating transactions* & Saga rollbacks.

5. **Section 5 — Real-World Tech Company Benchmarks**:
   - Explicitly contrast real production architecture choices (e.g., Uber H3 Hexagonal Grid vs Google S2 Quadtree, Cassandra vs Spanner, Kafka vs Pulsar).

6. **Section 6 — Mandatory Spoken Like & Subscribe + Interactive Platform CTA**:
   - **Spoken Narration Requirement**: The final beat script (Outro CTA) MUST include an explicit verbal call to **like and subscribe** for more breakdowns, e.g.:
     > *"If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!"*
   - Direct learners to interactive practice and calculators at `https://careervivid.app/learning/system-design-interview`.

---

## 9 · Permanent Rule: Channel-Specific CLI-ONLY Video Operations

- **MANDATORY CLI-ONLY UPLOAD DIRECTIVE**:
  - ALL YouTube video uploads, metadata edits, and channel releases MUST be performed **100% exclusively via CLI commands**.
  - **NEVER** use browser GUI, manual web uploads, or browser automation for YouTube video uploads.

- **CareerVivid Channel (`@CareerVividSystemDesign`)**:
  - ALL CareerVivid System Design & Educational videos MUST be published exclusively to **`https://www.youtube.com/@CareerVividSystemDesign`**.
  - **CLI Command**: `node scripts/upload-careervivid-youtube-video.mjs --video <mp4_path> --title <title> --description <description>`
  - Config directory: `/Users/jiawenzhu/.config/careervivid-youtube-uploader/`

- **Hackathon / DevPost Channel (`@evanzhu-k8q` / "Evan zhu")**:
  - The `@evanzhu-k8q` channel is strictly reserved for **DevPost hackathon submission videos** (ApexFan, GitPulse, LedgerFlow).
  - NEVER upload CareerVivid videos to `@evanzhu-k8q`.

---

## 10 · Permanent Policy: Daily 3-Video Cadence & Deep-Dive Topic Differentiation

- **Daily Production Target**:
  - Produce **3 high-converting System Design videos EVERY SINGLE DAY**.
- **Topic Differentiation & Novelty Guardrail**:
  - If a system topic has been covered before (e.g. YouTube, Uber, WhatsApp, OpenAI, Claude Code, Airbnb, Instagram):
    - Do **NOT** repeat previously covered sub-topics.
    - Select **new, high-retention architectural deep-dives** that were not mentioned in earlier videos (e.g., YouTube Content ID & Perceptual Hashing, Low-Latency WebRTC Live Streaming, Uber H3 Geospatial Indexing vs Quadtrees, OpenAI Speculative Decoding & KV-Cache PagedAttention).
- **Automated Workflow**:
  - Script synthesis ➔ Chirp3-HD Fenrir voiceover ➔ Veo 3.1 Lite (`veo-3.1-lite-generate-001`) paper-collage footage ➔ Playwright & FFmpeg 1080p film muxing ➔ CLI Upload to `@CareerVividSystemDesign` YouTube channel and TikTok.
  - **TikTok Submission & Thumbnail Mandate**: For TikTok uploads via `node scripts/upload-tiktok-video.mjs --video <mp4> --thumbnail <jpg> --caption <caption>`, the uploader MUST attach the custom 16:9 thumbnail as the video cover, ensure "Who can see this post" is set to "Everyone", and click the **Post/Submit button** so the video is published live.

---

## 11 · Permanent Directive: Ultra-High Visual Quality & Anti-Boredom Standards

Every video clip generated by `veo-3.1-lite-generate-001` MUST adhere to these strict high-retention aesthetic standards:

1. **Vivid Paper-Collage Art Direction**:
   - Vintage yellowed newsprint & off-white grid paper backdrops with halftone textures and paper drop shadows.
   - Vibrant high-contrast color accents (red, amber, emerald, sky blue, gold).

2. **High-Motion Action & Dynamic Framing**:
   - Fast 12 FPS stop-motion animation with paper sliding transitions, top-down dispatch views, split-screen comparisons, and slow pan drifts.
   - Avoid static motionless scenes or slow lifeless camera movements.

3. **Zero On-Screen Text / Zero Pseudo-Latin**:
   - Enforce strict `NEGATIVE` constraints (`no text, no garbled letters, no duplicate words, no pseudo-latin, no 3D glossy render`).
   - Clean, crisp paper stamps and diagrams ONLY where specified in the script.

4. **Human Anatomy & Cut-out Integrity**:
   - Ensure clean paper craft contours with exact human anatomy (two arms, normal facial features, no extra limbs).

---

## 13 · Programmatic Progressive Diagram Rendering Architecture (Beats 2–7)

To guarantee 100% legibility, zero AI text gibberish, and maximum senior-engineer engagement:

1. **Restricted Veo Role**:
   - `veo-3.1-lite-generate-001` is restricted to Beats 1 (Hook) and 8 (Outro CTA) for mood and motion only.
   - Enforce strict `NEGATIVE` constraints: zero text, zero letters, zero numbers, zero signage.

2. **Programmatic Playwright Diagrams (Beats 2–7)**:
   - Render Beats 2–7 programmatically at 1920x1080 @ 30fps using Playwright HTML/CSS/SVG.
   - Real DOM typography (`Inter`, `JetBrains Mono`). Never model-generated text.
   - Diagrams BUILD progressively: nodes and edges animate in sync with narration timestamps.
   - Dark grid/slate backdrop (#0f172a / #090d16) with paper texture overlay <= 15% opacity.
   - Every box labeled. Every arrow has direction and protocol/rate label. Maximum 7 nodes per scene.

3. **Concrete Technical Metrics Rule**:
   - EVERY beat MUST contain at least one concrete technical metric (QPS, p99 latency ms, VRAM GB, Tokens/sec, Block size, Memory fragmentation %).

4. **Two-Layer Thumbnail Build**:
   - Layer 1 (`generate_image`): Clean background plate ONLY (explicitly zero text/letters/numbers/signage).
   - Layer 2 (Playwright DOM): Crisp, bold real DOM typography composited on top (`LLM INFERENCE AT SCALE`).

---

---

## 14 · Standardized Universal UX/UI Design System & Storytelling Pattern

Regardless of the specific System Design topic (e.g. AI Voice, Geospatial Dispatch, Real-Time Media, Vector DB RAG, Distributed Queues, Rate Limiters, Payment Gateways), **EVERY** System Design video produced MUST strictly implement this standardized tactile paper-collage UX/UI design system and progressive 3-block storytelling pattern.

### A. Universal Tactile Paper-Collage UX/UI Design System

1. **Grid Paper Backdrop**:
   - Aged off-white/cream newsprint graph paper texture background with faint grid lines, subtle paper grain, and edge drop shadows.

2. **Domain-Agnostic Color-Coded Component Cards**:
   - Every system architecture component is rendered as a distinct paper cutout card with deckled/ripped paper edges and realistic drop shadows.
   - 🩵 **Teal / Cyan Cutouts (`#0284c7` / `#38bdf8`)**: Input Ingestion / Client Audio / Sensors / User Requests (`INGEST`, `CLIENT`, `GPS`, `STT`, `UDP`).
   - 💛 **Warm Gold / Yellow Cutouts (`#d97706` / `#fbbf24`)**: Core Processing / AI Inference / Match Engine / Logic (`LLM`, `ENGINE`, `H3`, `HNSW`, `SOLVER`).
   - 🔴 **Coral / Red Cutouts (`#dc2626` / `#f87171`)**: Egress Output / Delivery / Audio Synthesis / Payment Action (`TTS`, `OUTPUT`, `DISPATCH`, `NOTIFY`, `PAY`).
   - 💚 **Emerald Green Cutouts (`#059669` / `#34d399`)**: Gateways / Routers / Schedulers / Load Balancers (`GATEWAY`, `SFU`, `PROXY`, `SCHEDULER`, `BALANCER`).
   - 💜 **Purple / Dark Slate Cutouts (`#7c3aed` / `#c084fc` / `#1e293b`)**: Storage / Caches / Event Stores / Vector DBs (`KAFKA`, `REDIS`, `POSTGRES`, `VRAM`, `WAL`).

3. **Big, Bold Module Typography (Universal Standard)**:
   - High-contrast, large, bold block lettering on cards (`API`, `GATEWAY`, `QUEUE`, `CACHE`, `STT`, `LLM`, `TTS`, `SFU`, `H3`, `KAFKA`, `REDIS`, `GPU`).
   - Clean, crisp paper-stamp typography style inside modules for immediate legibility across mobile displays.

4. **Universal Visual Cutout Icons & Metaphors**:
   - Every paper card is paired with a distinct visual cutout icon positioned above or inside it:
     - ⏱️ **Stopwatch / Clock**: Latency bottlenecks, timeout limits, and SLA timers.
     - 🎧 **Headphones / Speaker**: Audio playback, media streaming, and voice output.
     - 🎙️ **Microphone**: Audio ingestion and speech input.
     - 🚗 **Car / Taxi**: Geospatial dispatch, location tracking, and mobile fleets.
     - ⚡ **Lightning Bolt**: WebRTC sockets, high-QPS gateways, and low-latency connections.
     - 🚀 **Rocket / GPU**: H100 inference clusters, hardware acceleration, and batch processing.
     - 🔒 **Lock / Key**: Encryption, E2EE, JWT authentication, and distributed mutex locks (Redlock).
     - 💾 **Database Cylinder / Filing Cabinet**: Persistent storage, WAL logs, and vector indexes.

5. **Dynamic Directional Flow & Warning Indicators**:
   - Hand-drawn or cut-paper solid/dashed arrows indicating data flow and call direction.
   - Clear visual warning tags (e.g. red `2,500ms Warning` badges, `15% Packet Loss` flags, `Buffer Overflow` alerts, ticking clocks).

6. **Corner Mascot Seal Branding**:
   - Friendly mascot avatar seal placed discreetly in the corner to anchor brand identity without cluttering the diagram.

### B. Multi-Domain Architecture Mapping Examples

| System Design Domain | Block 1 (Input/Ingest) | Block 2 (Core Processing) | Block 3 (Output/Delivery) | Key Visual Icon |
| :--- | :--- | :--- | :--- | :--- |
| **Real-Time AI Voice** | `STT` (Teal) | `LLM` (Yellow) | `TTS` (Red) | ⏱️ Stopwatch / 🎧 Headphones |
| **Uber Driver Dispatch** | `GPS PINGS` (Teal) | `H3 GRID MATCH` (Yellow) | `DRIVER ASSIGN` (Red) | 🚗 Taxi / ⚡ Bolt |
| **Discord Voice SFU** | `CLIENT UDP` (Teal) | `WEBRTC SFU` (Green) | `AUDIO OPUS` (Red) | 🎧 Headphones / ⚡ Bolt |
| **Vector DB RAG** | `QUERY EMBED` (Teal) | `HNSW GRAPH` (Yellow) | `RANKED CONTEXT` (Red) | 💾 Database / 🚀 Rocket |
| **Kafka Subagent Swarms** | `EVENT BUS` (Purple) | `STATE MACHINE` (Yellow) | `SUBAGENT DISPATCH` (Red) | 🔒 Lock / 🚀 Rocket |

### C. High-Retention Storytelling Pattern (Universal 6-Section Blueprint)

1. **Section 1 — Intuitive 3-Block Sequential Hook**:
   - Section 1 opens with a clear 3-block pipeline (e.g., `INGEST` ➔ `PROCESS` ➔ `DELIVER`), contrasting traditional naive/sequential approaches against high-performance real-time architectures to build instant mental models.
2. **Section 2 — Scalability Bottlenecks**:
   - Shows where naive architectures fail (e.g. half-duplex blocking, database lock contention, memory leaks, high latency spikes).
3. **Section 3 — Mechanical Protocol Deep Dive**:
   - Progressive component-by-component reveal as narration advances step by step.
4. **Section 4 — Production Failure Modes ("What Breaks?")**:
   - Visual failure mode animations featuring ticking stopwatches, red cancellation buses, circuit breakers, and packet loss concealment flags.
5. **Section 5 — Real-World Benchmarks**:
   - Side-by-side metric comparison cards (e.g. `280ms WebRTC` vs `600ms WS` vs `2,500ms Cascade`).
6. **Section 6 — Outro Call to Action**:
   - Spoken narration asking viewers to like and subscribe, with direct links to CareerVivid interactive practice.


