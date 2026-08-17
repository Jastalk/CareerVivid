# Founder showcase — build pipeline

Source for the 3-minute founder & product film. The rendered masters and audio
stems are **not** in git: `public/commercial-videos/` is ignored (`.gitignore`),
and the 60 fps master alone is 130 MB.

## Where these run

These scripts resolve assets relative to
`public/commercial-videos/founder-showcase-deluxe/`, so copy them back there
before running:

```bash
cp scripts/founder-showcase/* public/commercial-videos/founder-showcase-deluxe/v2/
cd public/commercial-videos/founder-showcase-deluxe/v2
```

## Pipeline

```bash
python3 make_transition.py    # generate the post-2:00 transition sound
python3 revoice_intro.py      # re-voice Section 1  (Gemini TTS, Charon)
python3 revoice.py            # re-voice Section 4  (Gemini TTS, Charon)
python3 build_audio.py        # assemble the 188s master audio from 14 stems + sfx
node render.mjs --probe       # 17 stills at the key beats, to eyeball first
node render.mjs --fps 60      # full render: 11,280 frames piped into ffmpeg
./finalize.sh                 # mux picture + audio, print the verification table
```

`revoice*.py` need `GEMINI_API_KEY` in the repo-root `.env` (gitignored).
`render.mjs` needs Playwright and drives the system Chrome.

## Why the timeline is written the way it is

`showcase_timeline_v2.html` contains **no CSS `transition` or `@keyframes`
declarations**, deliberately. The renderer seeks to a timestamp and screenshots
immediately, so a transition never gets wall-clock time to interpolate and a
keyframe animation lands on an arbitrary phase. Every animated property is a
pure function of `t`, applied by `render(t)`.

The predecessor to this pipeline rendered 376 frames for 188 seconds — 2 fps,
held 15x to fake 30 — which is why every animation in that cut juddered.
`FIXES.md` documents that teardown in full.
