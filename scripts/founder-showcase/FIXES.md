# Founder Showcase — v2 repair notes

The script is unchanged. Every narration line, cue point and section boundary
from the 188-second production script is preserved exactly. What follows is what
was wrong with the *delivery* of that script, and what changed.

---

## The two defects that mattered

### 1. The film was rendered at 2 fps

`founder-showcase-deluxe/frames/` holds **376 PNGs for 188 seconds** — exactly
2.0 fps. The encoder then held each frame 15× to reach the declared 30 fps.
Every animation in the film therefore updated twice per second.

This is the entire cause of the "laggy / slow" feel. It was not a tuning
problem in any individual animation.

**Fixed:** re-rendered at **60 fps native — 11,280 unique frames**, no duplicates.

### 2. The narration was ~30 dB too quiet

| window | old master | new |
|---|---|---|
| 0–22s | **−53.5 dB** | −16.8 dB |
| 30–52s | −50.2 dB | −16.4 dB |
| 60–82s | −47.7 dB | −16.5 dB |
| 90–112s | −49.9 dB | −17.7 dB |
| 120–142s | −46.0 dB | −16.8 dB |
| 150–172s | −38.1 dB | −17.7 dB |
| 175–188s | −26.4 dB | −17.0 dB |

The source VO stems are at −20.8 dB. The shipped master was those same stems
attenuated by ~30 dB (boosting the old master by +30 dB lands at −23.4 dB,
which matches the stems). The voiceover was effectively inaudible until the
final CTA.

**Fixed:** `build_audio.py` reassembles the same 14 stems at the same offsets,
loudness-matched per stem (they spanned −16.0 to −23.1 dB, and the candidate
voice sat ~5 dB under the narrator), mixed with `normalize=0`, mastered to
−14 LUFS. Verified: all 14 lines start within 0.4 s of their cue.

---

## Animation defects

Everything below was structurally impossible to see in the old build, because
the renderer seeks to a timestamp and screenshots immediately — so anything
driven by the browser's wall clock never gets a chance to run.

| # | defect | cause | fix |
|---|---|---|---|
| 3 | Section changes hard-cut | `transition: opacity .4s` on a `display:none` → `flex` swap. Display is not transitionable and the element has no layout on frame 1. | Layers always in layout; opacity is a computed crossfade |
| 4 | "Smooth camera zoom (1.15×)" was an instant jump | `transition: transform .8s` never interpolates under discrete seeking | `env(t,…)` ramp, eased in and out over ~2.5 s |
| 5 | Whiteboard punch-in snapped | same | eased 1.7 s each way |
| 6 | Founder float frozen or random | `animation: floatFounder 6s infinite` runs on wall clock | `translateY` computed from `cos(2πt/6)` |
| 7 | Waveform jittered randomly | `animation: snappyWave .22s infinite` sampled at 2 fps aliases catastrophically — 2.3 cycles between frames | 40 bars, three incommensurate sine frequencies per bar, **amplitude gated by who is actually speaking** so it goes quiet between turns |
| 8 | Green data packet appeared at a random phase | `pulsePacketOnce 2.2s` + class toggle, wall-clock driven | position computed from progress through 88.0→91.2 s |
| 9 | Subtitles hard-swapped | `innerText` reassignment | discrete cards that crossfade |
| 10 | Film grain static | fixed background-position | drifts with `t` (static grain reads as dirt on the lens) |

### 11. The ATS score never moved — the film's central claim

The narration says *"your match index surges from fifty-four to ninety-two
percent."* The ring was **hardcoded at 92%**:

```css
.score-ring { background: conic-gradient(#10b981 0% 92%, #e2e8f0 92% 100%); }
```
```html
<div class="score-value">92%</div>
```

It read 92% from t=0. Measured on the old master: **92% at t=40s**, seconds
before the narrator says "fifty-four."

**Fixed:** the ring travels 54 → 92 between 55.5 s and 59.4 s on an eased curve,
the number counts, the hue rides the value (amber → green), and the card settles
with a pulse landing on the existing chime SFX at 59.4 s.

---

## Quality defects

| # | defect | fix |
|---|---|---|
| 12 | **776 kbps** for 1080p — gradients banded, screenshot text mushed, and the grain overlay ate the whole bit budget | CRF 17, `preset slow`, ref=5, aq-mode=3 |
| 13 | Product screenshots unreadable — 2900–3800 px sources squeezed into ~850 px cards | Ken Burns push-ins on every screenshot. The diagnostic report and the dashboard are now legible |
| 14 | **Wrong asset in Section 4** — `dashboard_clean_real.png` is labelled "Clean Authenticated Dashboard" but is actually the *quest board with the browser toolbar in frame* | swapped to `auth_dashboard_real.png`, the real chrome-free dashboard |
| 15 | Nothing on screen ever moved during static sections | continuous slow drift everywhere; no frame is ever identical to its neighbour |

**Not a defect:** the green band at the bottom of the dashboard comparison was an
artifact of my own `xstack` contact sheet (ffmpeg pads mismatched-height inputs
with green). Verified zero green pixels in the source PNGs, the old master, and
the new render.

---

## Content issues — script untouched, flagged for a decision

These are **not** fixed, because fixing them means changing what the film claims.

### A. The social-proof banner is unsupported

> ★★★★★ **4.9/5 Trust Rating · 3,200+ Software Engineers & Tech Leaders Prepped**

Neither figure appears anywhere in the product, the data files, or the site. A
specific ratings claim in a public commercial is the kind of thing that is worth
being able to substantiate. Recommend cutting it or replacing it with something
verifiable.

By contrast, both headline stats **check out** and should stay:

| claim | source | verdict |
|---|---|---|
| 301 hiring loops | `INTERVIEW_GUIDE_TOTALS.companies = 301` | ✅ real |
| 22,611 verified questions | `INTERVIEW_GUIDE_TOTALS.questQuestions = 22611` | ✅ real |
| Google/Meta/Apple/Amazon/Stripe/Uber | all present in the 301 | ✅ real |
| 4.9/5 · 3,200+ prepped | nowhere | ❌ unsupported |

### B. Section 2 shows a Product Manager resume

The screenshot is the template placeholder — **"John Doe · Product Manager"**,
`john.doe@email.com`, `555-012-3456` — while the window header says
"● Authenticated Session" and the narration is about L4/L5/Staff *engineering*
benchmarks over a bullet about event-driven payment pipelines.

Fix is a fresh screenshot of a real SWE resume in the editor.

### C. Section 3's coaching exchange is written, not captured

The four dialogue bubbles are hand-authored copy presented as a live session.
There is a **real** agent response sitting unused in
`assets/dashboard_clean_real.png` — a substantive critique naming Core request
flow, Async telemetry, and Failure mode resolution. Using the real transcript
would be both more honest and more impressive.

### D. Biographical framing

> "After building distributed infrastructure and seeing thousands of talented
> software engineers get filtered out…"

The personal site describes a full-stack engineer; it does not support
"distributed infrastructure" at scale or direct observation of thousands of
candidates. Worth softening to what is demonstrably true.

### E. The founder photo carries a personal-site annotation

`hero-google-photo.webp` has **"THAT'S ME"** and an arrow baked in, pointing at
one of three figures (two people and a Google mascot). It is charming, but it is
a personal-site device and it makes the viewer hunt for the subject in the film's
opening seconds.

---

## Files

| file | purpose |
|---|---|
| `showcase_timeline_v2.html` | deterministic timeline — every animation a pure function of `t` |
| `render.mjs` | Playwright frame renderer, pipes straight to ffmpeg (`--probe` for stills) |
| `build_audio.py` | rebuilds the master audio from the 14 stems + SFX |
| `finalize.sh` | muxes picture + audio and prints the verification table |
| `probe/` | stills at the 11 key beats, for eyeballing before a full render |

Rebuild:

```bash
python3 build_audio.py
node render.mjs --fps 60
./finalize.sh
```

---

## Verified result

| | old master | new master |
|---|---|---|
| resolution | 1920×1080 | 1920×1080 |
| duration | 188.00 s | 188.00 s |
| frame rate | 30 fps (declared) | **60 fps** |
| total frames | 5,640 | 11,280 |
| **unique frames** | **240 (4.3%)** | **7,813 (69.3%)** |
| video bitrate | 776 kbps | 5,390 kbps |
| audio mean | −36.9 dB | −16.9 dB |
| audio, first 22 s | **−53.5 dB** | **−16.8 dB** |
| size | 18 MB | 128 MB |

32× more unique frames. The old file had 240 distinct images stretched across
188 seconds; the new one has 7,813.

ATS ring sampled from the delivered file:

| t | old | new |
|---|---|---|
| 40.0 s | 92% | **54%** (amber) |
| 55.5 s | 92% | 54% |
| 56.5 s | 92% | 76% |
| 57.5 s | 92% | 88% |
| 58.5 s | 92% | **92%** (green) |

## Deliverables

| file | use |
|---|---|
| `careervivid-founder-showcase-deluxe-v2.mp4` | archival master — 60 fps, CRF 17, 128 MB |
| `careervivid-founder-showcase-v2-web.mp4` | delivery cut — 30 fps, 2.9 Mbps, 80 MB |

The 30 fps web cut is a clean decimation of a genuinely-60 fps source, not the
15× frame-hold that caused the original judder.

---

## Revision 2 — new screenshots, re-voiced Section 4

### Sound
The whoosh stays on the two transitions before 2:00 (0:35, 1:11). The two after
it now use `sfx/transition_v2.wav`, generated by `make_transition.py`: a tonal
lift on a fifth (D5 + A5) over a low settle gliding 132 → 74 Hz, with a trace of
4-pole-filtered air. Nothing above ~4 kHz, so there is no "blow" in it. It is
built to sit in the same family as `chime_success` and `report_chime`.

### New captures
| slot | asset | note |
|---|---|---|
| 1:12 board | `v2_whiteboard_canvas.png` | Career Agent panel cropped off — Section 3 renders its own dialogue column, and two agent panels read as a duplicate. The board now actually contains the Kafka / BigQuery / KGS nodes the coach talks about |
| 2:27 tracks | `v2_card_swe/pm/aiinfra.png` | top 55% of each resume, `object-fit: contain` so the documents are never cropped |
| 2:27 export | `v2_resume_export.png` | the **Download PDF dropdown**, not the "Generating PDF…" modal — it shows PDF / Google Docs / .DOCX, which is what the new line says |
| 2:39 proof | `v2_studio_1_clean.png` | browser toolbar + bookmarks bar cropped (top 175px) |
| 2:39 proof | `v2_studio_google_quest.png` | already clean |
| 2:39 proof | `v2_google_quest_clean.png` | toolbar cropped (top 170px) |

Section 4 is now two scenes: **4a** the three role tracks with the export panel
rising over them, **4b** the studio and the Google loop. The split at 159.8s
matches the two narration lines.

### Re-voiced (Charon, `revoice.py`)
Only these two lines changed.

> **was** "benchmarked against twenty-two thousand verified interview *loops*"
> **now** "benchmarked against twenty-two thousand, six hundred and eleven real
> interview *questions*, drawn from three hundred and one company hiring loops"

22,611 is the question count and 301 is the loop count — the old line merged
them. The new screenshot puts `301 COMPANIES · 22,611 QUESTIONS · 821 STAGES` on
screen, so the mismatch would have been visible. Line 1 now also names the export
formats, since the export menu is on screen under it.

### Flagged
`v2_resume_aiinfra.png` carries a **real phone number** in its header and
unfilled **`[ADD NUMBER]%` / `[ADD NINES]%`** tokens in its experience bullets.
The card is framed above the tokens and the number is masked. The unfilled
tokens are a tailor bug, not a screenshot problem.

### Result
188.000s · 60 fps · 11,280 frames · **7,780 unique** · 5,297 kbps · audio flat
at −16.4 to −17.7 dB across the whole timeline.
