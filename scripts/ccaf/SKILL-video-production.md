# CareerVivid Video & TTS Audio Production Pipeline

> 💡 **Skill Reference**: This guide is also available as a system-wide agent skill at:
> `file:///Users/jiawenzhu/.gemini/config/skills/careervivid-video-production/SKILL.md`
> Any AI agent (Claude Code, Gemini, Antigravity, Codex) can read either location to produce lesson videos, TTS audio, or stick-figure images.

> 🎥 **Footage generation** — everything about Gemini Omni / Veo lives in a
> separate skill:
> `file:///Users/jiawenzhu/.gemini/config/skills/vox-system-design-video-production/SKILL.md`
> Read it before writing a single video prompt. It covers which model the project
> can actually call, the six-dimension prompt grammar with timestamped beats, why
> generated footage cannot carry text and what to do instead, and the boomerang
> bed that replaces `setpts` stretching.
>
> This document stays the authority on **what the film says**; that one is the
> authority on **how the pictures are made**.

**Which builder to run**

| script | bed | use when |
| :--- | :--- | :--- |
| `build-domain1-film-v2.mjs` | still Gemini backplate + CSS Ken Burns | no Veo footage generated |
| `build-domain1-film-v3.mjs` | Veo footage, boomerang-looped | Omni clips exist — **current** |

Both render the same teaching-card layer from the same beat script, so the
lesson content is identical either way. Only the bed differs.

---

## Making the next domain's film

Domain 1 took many passes. This is what those passes converged on — follow it in
order and Domain 2 should take one.

**1 · Read the missions first, never write from memory.**
```bash
npx tsx -e "import {listDomains} from './src/lib/questSource';
const d=listDomains().find(x=>x.order===2)!;
for(const m of d.missions) for(const s of m.steps)
  console.log(m.id, '→', s.takeaway?.en)"
```
The film exists so viewers can answer these questions. Anything it teaches that
the questions do not test is decoration.

**2 · Chapter 0 before anything else.** List every API name the domain uses, and
for each ask: *has the viewer been told what the thing it belongs to even is?*
Domain 1 said `stop_reason` sixty seconds in, before defining a turn or a tool.
Chapter 0 exists to pay that debt up front, and it is the single change that
moved the film from "watched twice, still lost" to understood.

**3 · Answer the reader's obvious objection out loud.** The Domain 1 film said
Leo hired more agents and everything broke, and never addressed the question any
thinking viewer immediately has: *surely more agents means more context?* One
beat answering it (`the-trade`: more in total, far less shared) turned four
later chapters from unrelated rules into consequences of one idea. Find that
question for each domain and give it its own beat.

**4 · Two beats per concept.**
- *metaphor beat* — the idea in something the viewer has personally lived. No
  jargon at all. Test it: does it contrast with something people actually do?
  ("Don't count sentences" failed; nobody counts sentences.)
- *landing beat* — the same idea in API terms, now that there is somewhere for
  them to land. Reuse the metaphor's art via `artFrom` so the shot appears to
  hold; the pair costs no extra image.

**5 · Every term gets WHAT / WHY / WHERE** in its `define` card and in the
narration, in that order. `why` is the problem that would exist without it;
`where` is the field, the turn, whose code. A term with only a WHAT lets a
viewer repeat the word without knowing when it matters.

**6 · Mark whose field it is.** API-provided (`stop_reason`, `max_tokens`) versus
invented in your own schema (`citation_id`, `conflict_detected`). Unmarked, a
learner goes hunting the docs for something that was never there.

**7 · Mechanism → Remotion. Situation → Gemini.** If the idea is a *sequence*
with *exact labels*, it must be a Remotion clip; an image model cannot be
trusted with type, and a still cannot show time passing. If the idea is a
predicament, a stick figure carries it better than any diagram.

**8 · Third person.** The film follows a named character (Domain 1: **Leo**).
Second person reads as instruction. Keep exactly two exceptions: an "imagine
you're…" invitation at the very top, and the hand-off in the final line.
Labels inside the diagrams follow the same rule — a diagram saying "you" beside
a narrator saying "Leo" makes the viewer wonder which one they are.

**9 · Run the prose diagnostics before rendering** (see below), then render once.

---

## Quick Reference Commands

```bash
cd /Users/jiawenzhu/Developer/careervivid

# 1. Synthesize Chirp3-HD Fenrir English voiceover narration (24kHz LINEAR16 WAV)
#    ⚠️ Rerun this whenever narration text in domain1Script.ts changes — the WAVs
#    do NOT regenerate themselves, and stale audio silently contradicts the subtitles.
npx tsx scripts/ccaf/generate-fenrir-narration.mjs

# 2. Generate Sam O'Nella stick figure backplate PNGs (Vertex AI Gemini 2.5 Flash Image)
#    Covers every beat with an `imagePrompt`, teaching beats included.
LESSONS=domain-1-overview npx vite-node scripts/ccaf/generate-backplates.mjs -- public/assets/ccaf-backplates

# 3a. Render the Remotion term animations (mechanism clips, silent)
#     These teach the API names. A still illustration cannot show a sequence,
#     and image models cannot be trusted with labels — our own image prompts
#     forbid text for exactly that reason.
cd remotion-commercial
for id in ccaf-what-comes-back ccaf-why-a-loop ccaf-two-limits ccaf-whose-field; do
  npx remotion render src/index.ts "$id" "../public/assets/ccaf-termclips/$id.mp4" --codec=h264
done
cd ..
#     Live preview while designing:  cd remotion-commercial && npm run preview

# 3b. Build the ANIMATED lesson film (v2 — the current pipeline)
#    Resumable: finished beat clips are kept. Delete the cache to force a full re-render.
npx tsx scripts/ccaf/build-domain1-film-v2.mjs
# force full re-render:  rm -rf scratchpad/film_render_v2

# (legacy) v1 static-frame build, kept for reference:
#   npx tsx scripts/ccaf/build-domain1-film-fenrir-tight.mjs
# All build scripts need `npx tsx` (NOT bare `node`): they import questSource.ts
# for the content checks, and node's ESM loader cannot resolve TS imports.
```

---

## Production Standards

### 🧠 Teaching rules that were learned the hard way
These are not style preferences. Each one came from a viewer watching a cut and
still not understanding it.

1. **Never let jargon arrive before the mental model.** An early cut said
   `stop_reason` 60 seconds in, before anyone had been told what a turn is or
   what comes back from a call. Audit it: for each API name, is there a beat
   before it that explains the thing it belongs to?
2. **Every term answers WHAT / WHY / WHERE.** A definition alone lets a viewer
   repeat a word without knowing when it matters. `why` = the problem that
   would exist without it. `where` = the field, the turn, whose code.
3. **Say whose field it is.** `stop_reason` ships with the API; `citation_id`
   is invented in your own schema. Mixing them sends people hunting the docs
   for something that was never there.
4. **A hard concept gets a stick figure.** Abstract mechanisms do not land as
   bullet points. Pair every difficult idea with a drawn situation the viewer
   has personally lived: a shift handover, two witnesses, three burnt dishes.
5. **Test the metaphor against reality.** "Listen, don't count" failed because
   nobody counts sentences in conversation — the contrast was with something no
   viewer does. A kettle whistling behind a closed door worked, because that is
   an experience people actually have.
6. **Third person, not second.** An early cut said "you" 96 times and read as
   instruction. The lesson follows **Leo**. The only surviving "you" is the
   opening invitation and the final hand-off, both deliberate.
7. **Vague verbs teach nothing.** "He gets help" says words without content.
   Name the help, and name what it costs.
8. **Write to be spoken.** Contractions, varied sentence length, questions.
   Measure it: an early cut had 3 contractions in 48 sentences.

### 🔎 Prose diagnostics
```bash
brew install vale
git clone --depth 1 https://github.com/tbhb/vale-ai-tells   # MIT, 77 rules
# point .vale.ini at styles/ai-tells, then run over the exported narration
```
It catches what hand-editing misses. On our first pass it flagged 48 alerts and
the top three rules — `VerbTricolon`, `ParallelStaccato`, `CataphoricForecasting`
— were devices *deliberately added* to sound conversational. Short parallel
sentences read as an AI tell even when they were written by hand.
Keep the ones that serve TTS phrasing (`one. At. A. Time.`); fix the rest.

### 📋 Content Integrity (runs before any frame is drawn)
- `assertFullCoverage` — every Domain 1 mission must have a beat teaching it.
- `assertContentMatchesMissions` — every API identifier a beat names
  (`stop_reason`, `custom_id`, …) must appear in the question it teaches.
  This exists because the film once taught `stop_sequence`/`tool_use` for a
  question about `max_tokens`/`model_context_window_exceeded`/`refusal` —
  coverage passed while the content coached viewers into the wrong answer.
- The build **fails** on either violation. Fix the beat in
  `scripts/ccaf/domain1Script.ts`; never bypass the check.
- `domain1Script.ts` is the ONLY source of truth. Never hardcode card HTML in
  a build script — that is how the v1 cards drifted from the narration.

### 🎙️ TTS Voiceover (Google Cloud Text-to-Speech)
- **Primary Voice**: `en-US-Chirp3-HD-Fenrir` (energetic YouTube narrator voice).
- **Format**: `LINEAR16` mono WAV at `24000` Hz. Duration = `(bytes − 44) / (24000 × 2)`.
- **Audio Output Directory**: `public/assets/ccaf-narration/domain-1-overview/en/chirp-fenrir/`
- Never run FFmpeg `silenceremove` on these clips — it clips quiet tail syllables.
- **Voice Catalog**:
  - `chirp-fenrir`: `en-US-Chirp3-HD-Fenrir` (Energetic male, YouTube narrator)
  - `journey-f`: `en-US-Journey-F` (Hyper-realistic female — planned second cut)
  - `journey-o`: `en-US-Journey-O` (Hyper-realistic male)
  - `chirp-leda`, `chirp-aoede`, `chirp-charon`, `chirp-kore`, `chirp-orus`, `chirp-puck`, `chirp-schedar`, `chirp-zephyr`

### 🎨 Image Generation (Vertex AI Gemini 2.5 Flash Image)
- **Model Name**: `gemini-2.5-flash-image` (⚠️ Do NOT use `gemini-2.0-flash-preview-image-generation` — 404;
  `gemini-3-pro-image-preview` rate-limits far sooner, keep it as fallback only).
- **House Style**: Sam O'Nella stick figure comic illustration, black ink outlines, flat color fill, white background, no text/labels.
- **Composition rule for teaching beats**: scene anchored in the **left third**,
  right half mostly empty white — the teaching card occupies the right rail, so
  a centred composition WILL be covered. Story (`veo`) beats may compose freely.
- **Rate Limit Pacing**: 8-second delay between API calls; on 429 wait 20s × attempt.
- Pass `config: { responseModalities: ['IMAGE', 'TEXT'] }` — without it the model
  may legally answer with prose, which surfaces as "no image" and no error.
- A prompt that repeatedly returns "no image" at 4 attempts is being refused —
  reword the scene, don't keep retrying.

### 🧩 Two renderers, on purpose
- **Playwright + CSS** (`build-domain1-film-v2.mjs`) drives the main film: 40+
  beats whose length is dictated by measured narration.
- **Remotion** (`remotion-commercial/src/ccaf/`) draws the term animations only.
  It is used where the teaching needs a *sequence* with *exact labels* —
  an envelope arriving with `stop_reason` stapled to it, a desk filling versus a
  pen running dry. Remotion renders real text perfectly and lets a value be
  edited as a string rather than re-rolled as an image.
- Licence note: Remotion is NOT MIT. Free for individuals and organisations of
  up to 3 employees; beyond that a company licence is required.
- A beat with a `clip` field bypasses the HTML renderer and gets the narration
  laid over the finished video, with `tpad` freezing the last frame if the voice
  outruns the animation — so audio stays the clock either way.

### 🎞 Animated Rendering (v2 pipeline — `build-domain1-film-v2.mjs`)
- **Deterministic frame-stepping**: all motion is CSS keyframes; Playwright pauses
  every animation (`document.getAnimations({subtree:true})`), seeks to frame N's
  timestamp, screenshots at **24 fps**. Remotion's model without Remotion —
  every render is byte-identical, and audio/vision sync cannot drift.
- **Motion vocabulary**:
  - Art: slow Ken Burns (scale 1.04→1.12, direction alternates per beat) plus a
    2-step "boiling line" wobble (0.66s, `steps(2)`) for the hand-drawn feel.
  - Card: slides in from the right with a soft overshoot, resting at −0.6°.
  - Rows/columns/flow nodes: pop in one at a time, staggered across the first
    ~60 % of the narration so the card builds while the voice explains.
  - Right-side scrim gradient keeps the card readable while the figure on the
    left stays at full brightness.
- **Audio is the clock**: beat duration = measured WAV length + 0.35 s tail.
- **No silent beats.** An earlier cut left 56 seconds of the film with nobody
  talking; the story shots now carry the transitions between chapters.

### 🎬 Video Muxing & Intro BGM
- **Intro BGM**: `public/assets/bgm-d12.mp3` played softly (`volume=0.05`) ONLY during the prologue stick-figure beat, fading to 0 by second 7.0 (`afade=t=out:st=3.5:d=3.5`).
- **Main Narration**: 100% clean voiceover without background music interference.
- **Output**: `public/ccaf-lessons/domain-1.mp4` only — the file the app plays
  (`src/lib/ccafVideoLessons.ts`). Gitignored; rebuild, never commit. Earlier
  builds also wrote a voice-tagged master that was a byte-identical duplicate,
  which only created doubt about which file was current. The scripts are the
  artefact worth keeping; the video is regenerable in one command.

### 🔒 One build at a time
The build takes a pid lock in `scratchpad/film_render_v2/.build.lock`. Starting
a second build while one is running is not merely slower — both share the frame
directory and delete each other's screenshots mid-write. The symptom is an
ffmpeg error about a missing `f%05d.jpg` at index 0, because the surviving
frames start at 29. The lock turns hours of misdiagnosis into one clear message.

### 🧬 What to copy for Domain 2
These files are per-domain and need a sibling, not an edit:
```
scripts/ccaf/domain1Script.ts              → domain2Script.ts   (beats + guards)
scripts/ccaf/build-domain1-film-v2.mjs     → build-domain2-…    (CHAPTERS/ACCENT maps)
scripts/ccaf/generate-fenrir-narration.mjs → parameterise the domain, or copy
remotion-commercial/src/ccaf/TermClips.tsx → add compositions, keep StickFigure.tsx
```
`StickFigure.tsx` is shared on purpose — it is the house style, and every domain
must look like the same series. Only `TermClips.tsx` grows.

Paths that carry the domain in their name, and therefore need changing:
`public/assets/ccaf-narration/domain-N-overview/…`,
`public/assets/ccaf-backplates/domain-N-overview--<beat>.png`,
`public/ccaf-lessons/domain-N.mp4`, and `src/lib/ccafVideoLessons.ts`
(add the `DOMAIN_VIDEOS` entry, or the app silently has no video for it).

A worthwhile refactor before Domain 3: the build script differs from Domain 1's
only in its two label maps. If Domain 2 confirms that, make the domain a
parameter instead of copying a 500-line file a third time.

### 📄 The narration document
`scripts/ccaf/domain-1-narration-script.md` is regenerated at the end of every
build, so it always matches what the film says. It is a review copy: read it,
say what should change, and the edit goes into `domain1Script.ts`.
(`import-narration-script.mjs` can push edits the other way, but is deliberately
not wired into the build — parsing markdown back into source on every run is
risk without benefit when nobody hand-edits it.)
