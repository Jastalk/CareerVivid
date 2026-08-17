<div align="center">

# CareerVivid

### A mock interview that answers back, code that really runs, and a whiteboard graded against a rubric — then the resume gets rewritten from what the round exposed.

[![Live product](https://img.shields.io/badge/Live-careervivid.app-4f46e5?style=for-the-badge)](https://careervivid.app)
[![Category](https://img.shields.io/badge/Category-Education%20%26%20Human%20Potential-0F9D58?style=for-the-badge)](#why-education--human-potential)
[![Gemini API](https://img.shields.io/badge/Gemini%20API-live%20in%20production-4285F4?style=for-the-badge)](#ai-in-production)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-139%20functions%20deployed-1a73e8?style=for-the-badge)](#how-it-is-built)

</div>

![The CareerVivid home page: a whiteboard drawing a URL-shortener design, a live voice waveform, a scored design report, and a ride-dispatch diagram scattered around the wordmark](docs/screenshots/landing.png)

---

## Try it right now — no account, no card

Every link below opens the **live production app** as a guest. Nothing here is a
sandbox or a seeded demo; it is the same application a paying user gets, with
the signed-in surfaces withheld.

| Open this | What appears within 30 seconds |
| --- | --- |
| **[careervivid.app/quest/google](https://careervivid.app/quest/google)** ← **start here** | Google's real interview ladder — recruiter screen, coding, system design, behavioural, values, final — each stage with a 70/100 pass mark, built from that company's documented questions. |
| [careervivid.app/learn/coding-interview-patterns/tp-code](https://careervivid.app/learn/coding-interview-patterns/tp-code) | A coding lesson that **runs Python in the browser** — CPython on WebAssembly, in a worker — and diffs the real output against the expected result. Press Run. |
| [careervivid.app/interview-studio](https://careervivid.app/interview-studio) | 301 companies, 4,551 documented questions, 821 documented stages, searchable by company name. |
| [careervivid.app/edit/new](https://careervivid.app/edit/new) | The resume editor, open to guests. Write or import one, pick from 36 templates, export to PDF, Google Docs or `.docx` without ever signing in. |

The free plan is a working product: 100 credits a month, all 36
templates, every company guide, no card.

---

## The problem

AI has made the surface of this work easy. Anyone can generate a resume, a
cover letter, or an answer that reads well. Those skills no longer separate
candidates, because the whole field has them.

What still separates candidates is depth: designing a system that holds under
load, defending the trade-offs behind it, and shipping something a company can
actually run. That is what a senior interview tests, and it is the hardest part
to rehearse, because it takes a second party — someone to push back on the
architecture, run the code, and score the result.

Most job-search tools optimise the other end of the funnel: apply faster, send
more. That helps with getting seen. It does nothing for clearing a system-design
round.

CareerVivid is built for the depth problem. Rounds run by voice or by text.
Code executes. Architecture is scored against a numeric rubric with the gaps
named. The agent that reviewed the round then rewrites the resume it produced.

---

## What it does

### One agent that can see the workspace

The Career Agent has 29 tools and up to 12 tool-calling iterations per turn. It
reads the open code buffer and its test summary, the diagram in progress, and
the scored rounds — so it answers about the work in front of it instead of
asking for a description.

**It cannot write anything.** Each mutating tool returns a server-stored
*proposal*; the client approves it by ID and never supplies the payload. An
agent that has been prompt-injected still cannot mutate user data.

`functions/src/agent/turnRunner.ts` · `functions/src/agent/tools.ts` · `gemini-3.6-flash`

![The Career Agent giving a detailed system-design critique naming key generation services, distributed locks, Redis cache stampedes and an OLAP store](docs/screenshots/app-career-agent.png)

### Run a company's actual interview ladder

Six stages per company, each with a 70/100 pass threshold and a badge. The
questions come from documented interview loops — 4,551 real questions scraped and
curated across 301 companies, expanded into 22,611 per-stage quest questions.

`src/lib/companyQuests.ts` · guest-browsable at `/quest/:slug`

![The Google interview quest: six stages from recruiter screen through final round, each with pass marks, progress, and stage badges](docs/screenshots/quest-google.png)

### Draw an architecture and have it graded

Diagrams are drawn on a real canvas. The rendered image goes to Gemini with a
numeric rubric and a forced scratchpad, and returns a weighted score, named
gaps, and a follow-up question aimed at whatever is missing. The board below
is a live session: the coach has already pushed back on key generation and is
asking how a standby KGS avoids issuing duplicate pre-allocated keys.

`src/services/geminiService.ts:1215` · `gemini-3.6-flash`

![A system-design whiteboard for a Google-scale URL shortener showing client application, API gateway, key generation service, Redis cache, Kafka message queue, analytics consumer, Bigtable and an OLAP store](docs/screenshots/app-system-design.png)

### Write code that actually runs

Python executes in Pyodide — CPython compiled to WebAssembly — inside a Web
Worker the host can terminate. The pass rate is **measured** from the actual run, and
the model grades on top of a real result rather than guessing from the source.

![A coding lesson in the Two Pointers chapter with an editor, requirements and a run action](docs/screenshots/coding-lesson.png)

### The feedback lands in the resume

36 templates, AI tailoring against a specific posting, a match score across four
named categories, and export to PDF, Google Docs or `.docx`. Guests get the
editor and the exports; sync, AI and sharing need an account.

![The resume editor with the section navigator, live PDF preview, a resume score of 89, and the resume optimizer panel](docs/screenshots/app-resume-editor.png)

### And a place to put it all together

![The CareerVivid dashboard: continue a quest, the current resume, the last scored round, target-role readiness at 85%, and workspace numbers](docs/screenshots/app-dashboard.png)

<details>
<summary><b>More surfaces</b> — Interview Studio, learning catalog, job board, pricing, quest progress</summary>

<br>

Interview Studio: 301 company guides, searchable, with the documented question
and stage counts on the page.

![Interview Studio: company guides for 301 companies with 22,611 questions and 821 stages, plus recent sessions and career paths](docs/screenshots/interview-studio.png)

12 published courses, 56 chapters, 203 interactive lessons.

![The learning catalog with goal selection and courses for coding interview patterns, AI agent building and system design](docs/screenshots/app-learning.png)

The resume editor as a guest sees it — no account, no card, exports enabled.

![The guest resume editor offering a hand-written start or an AI draft from an existing resume](docs/screenshots/guest-resume-editor.png)

Live postings from 161 company ATS boards, each re-checked to confirm the role
is still open before it is shown.

![The public job board showing open roles with location, work model and seniority](docs/screenshots/jobs.png)

Quest progress, XP and stage badges.

![Quest progress showing level, XP, stages cleared and stage badges](docs/screenshots/app-quest-progress.png)

One credit pool across every AI surface.

![Pricing: free, Pro and Max plans drawing on one pool of monthly credits](docs/screenshots/pricing.png)

</details>

---

## AI in production

Every scored surface in the deployed application calls the Gemini API. Google
Cloud products in production: **Firebase Auth, Cloud Firestore, Cloud Functions
(139 deployed), Firebase Hosting, and Vertex AI** for the realtime voice session.

| Decision the model makes | Model | Code |
| --- | --- | --- |
| Conducts a spoken interview and decides when it ends | `gemini-live-2.5-flash-native-audio` | `src/components/aiInterviewAgent/useAIInterviewAgentSession.ts` |
| Scores the transcript, writes the feedback report | `gemini-3.6-flash` | `functions/src/agent/reportTools.ts` |
| Grades the whiteboard image against a numeric rubric | `gemini-3.6-flash` | `src/services/geminiService.ts:1215` |
| Grades code on top of a measured pass rate | `gemini-3.6-flash` | `src/services/geminiService.ts:1331` |
| Runs the 29-tool agent loop, ≤12 iterations per turn | `gemini-3.6-flash` | `functions/src/agent/turnRunner.ts` |
| Scores a resume against a posting, in 4 categories | `gemini-2.5-flash` | `src/services/geminiService.ts:1501` |
| Tailors a resume by placing missing keywords | `gemini-2.5-flash` | `functions/src/tailorResume.ts:38` |

**The unit economics are real.** One credit is anchored at **$0.003** of
model cost at list price (`shared/credits.ts` → `functions/src/generated/credits.ts`).
The free tier's 100 credits is roughly $0.30 of COGS; Pro's 1,000 credits is
roughly $3.00 against $12 of revenue.

---

## Why Education &amp; Human Potential

Interview preparation is normally advice to read. CareerVivid makes it a loop to
*run*: a round by voice or text, code that executes, a diagram scored against a
rubric, and the result carried into the resume. The grounding is real —
301 companies, 4,551 documented questions, 12 courses, 203 lessons — and the
free tier alone is a complete preparation path in 7 languages, reachable without
an account.

---

## How it is built

```
React + TypeScript (Vite)          →  Firebase Hosting
Cloud Functions (139 exported)     →  AI calls, ATS ingestion, SEO rendering
Cloud Firestore                    →  user data, sessions, agent proposals
Firebase Auth                      →  accounts
Vertex AI Live API                 →  realtime voice (raw BidiGenerateContent WS)
Gemini API                         →  grading, agent, resume, job scoring
Pyodide (CPython → WASM)           →  in-browser code execution, in a Worker
```

A few decisions worth calling out:

- **The agent writes nothing directly.** Mutating tools emit server-stored
  proposals; the client approves by ID. Prompt injection cannot mutate data.
- **Agent transcripts live outside `users/{uid}`** on purpose — that namespace
  carries an owner-write rule that would let a compromised client forge history.
- **22 pages are server-rendered for crawlers** behind a UA check, so the SPA
  stays a SPA for humans and still indexes (`functions/src/seo/`).
- **One question follows across surfaces.** The agent hands back a route
  carrying the exact `questionId`, so "practise this one" lands on that question.

---

## Run locally

```bash
npm install
npm run dev          # http://localhost:3001
```

```bash
npm run build        # production bundle
npm test             # unit + integration suites
```

Firebase emulators and the functions workspace live under `functions/`; see
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the full development workflow.

---

## Repository guide

| Path | What is in it |
| --- | --- |
| `src/` | React app: routes, components, services |
| `src/services/geminiService.ts` | Grading, scoring and tailoring calls |
| `src/components/aiInterviewAgent/` | Realtime voice session |
| `src/lib/companyQuests.ts` | Quest ladder construction and pass thresholds |
| `functions/src/agent/` | Career Agent: tools, turn runner, proposals |
| `functions/src/seo/` | Crawler-aware server rendering |
| `data/courses/` | 12 published courses, 203 lessons |
| `docs/screenshots/` | The images in this README |

---

## Competition submission

**[Build with Gemini XPRIZE](https://xprize.devpost.com)** · category:
**Education &amp; Human Potential**

| Item | Evidence |
| --- | --- |
| Submission branch | [`competition-2026`](https://github.com/JiawenZhu/CareerVivid/tree/competition-2026) |
| Eligibility marker | [`competition-start`](https://github.com/JiawenZhu/CareerVivid/tree/competition-start) |
| First qualifying commit | [`42320189`](https://github.com/JiawenZhu/CareerVivid/commit/423201899f3717876c8f3645eaaffed57c5028b8) |
| Competition window | May 19, 2026 at 10:00 AM PDT to August 17, 2026 at 1:00 PM PDT |
| Evaluator guide | [`COMPETITION.md`](COMPETITION.md) |
| Google Cloud products | Firebase Auth, Cloud Firestore, Cloud Functions, Firebase Hosting, Vertex AI |
| Gemini API in production | 7 distinct scored surfaces — see [AI in production](#ai-in-production) |

The annotated `competition-start` tag marks the first qualifying commit after
the competition opened. The repository preserves its actual history; timestamps
and earlier commits have not been rewritten.

---

## License and contributions

CareerVivid is source-available for personal learning and job-search use.
Commercial use of this Software is strictly prohibited. Any commercial use or
licensing inquiries must be directed to CareerVivid at evan@careervivid.app or
support@careervivid.app. Course source materials retain their original licenses;
see `data/learning/sources.json`.

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) for the
development workflow, focused-test expectations, and content licensing
requirements.
