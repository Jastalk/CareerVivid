# CareerVivid

**A mock interview that answers back, code that really runs, and a whiteboard graded against a rubric — then the resume gets rewritten from what the round exposed.**

▶ [Watch the 3-minute Video](https://www.youtube.com/watch?v=L2v1ZrPdwx8) · [Live Product Link](https://careervivid.app) · [Github Repo](https://github.com/JiawenZhu/CareerVivid)

![The CareerVivid home page: a whiteboard drawing a URL-shortener design, a live voice waveform, a scored design report, and a ride-dispatch diagram scattered around the wordmark](docs/screenshots/landing.png)

---

## Try it now — no login required

CareerVivid works without an account. Signing in unlocks sync, AI tools and sharing.

These four links open the real product, running live:

**1. [Google interview questions](https://careervivid.app/quest/google) — start here**
Six real stages: recruiter screen, coding, system design, behavioural, values, final. Each needs 70/100 to pass to unlock the next question.

**2. [Run TypeScript/JavaScript or Python in a coding lesson](https://careervivid.app/learn/coding-interview-patterns/tp-code)**
Press Run. The code executes in the browser and the output is diffed against the expected result.

**3. [Search 301 companies](https://careervivid.app/interview-studio)**
4,551 documented questions across 821 documented stages, searchable by company name.

**4. [Build a resume](https://careervivid.app/edit/new)**
36 templates. Export to PDF, Google Docs or .docx without signing in.

Free — $0/month, 100 credits. All 36 templates, all 301 company guides.
Pro — $12/month ($10 billed annually), 1,000 credits.
Max — $35/month ($31 billed annually), 4,500 credits.
Enterprise — $12 per seat/month, 1,500 credits per seat, pooled, two-seat minimum.

Building, editing and downloading a resume never costs credits, on any plan.

---

## By the numbers

| | |
| --- | --- |
| Companies with real interview guides | **301** |
| Documented interview questions | **4,551** |
| Documented interview stages | **821** |
| Per-stage quest questions | **22,611** |
| Courses / chapters / lessons | **12 / 56 / 203** |
| Resume templates | **36** |
| Company job boards scraped live | **161** |
| Cloud Functions deployed | **139** |
| UI languages | **7** |

Each figure above is read from a file in the repo.

---

## The problem

AI has made the surface of this work easy. Anyone can generate a resume, a cover letter, or an answer that reads well. Those skills no longer separate candidates, because the whole field has them.

What still separates candidates is depth: designing a system that holds under load, defending the trade-offs behind it, and shipping something a company can actually run. That is what a senior interview tests, and it is the hardest part to rehearse, because it takes a second party — someone to push back on the architecture, run the code, and score the result.

Most job-search tools optimise the other end of the funnel: apply faster, send more. That helps with getting seen. It does nothing for clearing a system-design round.

CareerVivid is built for the depth problem. Rounds run by voice or by text. Code executes. Architecture is scored against a numeric rubric with the gaps named. The agent that reviewed the round then rewrites the resume it produced.

---

## What it does

**🧠 Context-Aware Autonomous Career Agent**:
Working directly inside the candidate's active workspace, the Career Agent inspects live code, whiteboard topologies, and career history in real time. Equipped with 29 specialized tools, it can reason through and chain up to 12 autonomous actions per turn—proposing surgical edits, pipeline updates, and interview counterpoints as interactive decision cards that preserve 100% user control.

![The Career Agent giving a detailed system-design critique naming key generation services, distributed locks, Redis cache stampedes and an OLAP store](docs/screenshots/app-career-agent.png)

**📐 Multimodal Whiteboard Vision & Rubric Scoring**:
Candidates design distributed architectures on a freeform, reactive digital canvas. The rendered system topology is evaluated multimodal-first against rigorous FAANG hiring rubrics—instantly returning weighted dimension scores, identifying single points of failure, and generating adaptive pushback on architectural trade-offs.

![A system-design whiteboard for a Google-scale URL shortener showing client application, API gateway, key generation service, Redis cache, Kafka message queue, analytics consumer, Bigtable and an OLAP store](docs/screenshots/app-system-design.png)

**⚡ Zero-Latency In-Browser Code Execution Sandbox**:
Code is never mocked or hallucinated. JavaScript runs natively inside a dedicated Web Worker; Python runs in that same worker via Pyodide (CPython compiled to WebAssembly). The model grades candidates against real test executions, raw stdout, edge cases, and runtime complexity.

![A coding lesson in the Two Pointers chapter with an editor, requirements and a run action](docs/screenshots/coding-lesson.png)

**🎯 Closed-Loop Resume & Narrative Synthesis**:
Every insight, architectural breakthrough, and coding metric discovered during practice flows straight into the candidate's application assets. With 36 ATS-optimized templates and 4-category role matching, candidates tailor their narratives to any job posting and export instantly to clean PDF, Google Docs, or Word formats.

![The resume editor with the section navigator, live PDF preview, a resume score of 89, and the resume optimizer panel](docs/screenshots/app-resume-editor.png)

<details>
<summary><b>More surfaces</b> — company quests, Interview Studio, dashboard, courses, jobs, guest editor, pricing</summary>

<br>

Six stages per company, each with a 70/100 pass mark and a badge.

![The Google interview quest: six stages from recruiter screen through final round, each with pass marks, progress, and stage badges](docs/screenshots/quest-google.png)

Interview Studio: 301 company guides, searchable, with the documented question and stage counts on the page.

![Interview Studio: company guides for 301 companies with 22,611 questions and 821 stages, plus recent sessions and career paths](docs/screenshots/interview-studio.png)

The dashboard leads with the quest in progress, the current resume and the last scored round.

![The CareerVivid dashboard: continue a quest, the current resume, the last scored round, target-role readiness at 85%, and workspace numbers](docs/screenshots/app-dashboard.png)

12 published courses, 56 chapters, 203 interactive lessons.

![The learning catalog with goal selection and courses for coding interview patterns, AI agent building and system design](docs/screenshots/app-learning.png)

Live postings from 161 company ATS boards, each re-checked to confirm the role is still open before it is shown.

![The public job board showing open roles with location, work model and seniority](docs/screenshots/jobs.png)

The resume editor as a guest sees it — no login, no card, exports enabled.

![The guest resume editor offering a hand-written start or an AI draft from an existing resume](docs/screenshots/guest-resume-editor.png)

Quest progress, XP and stage badges.

![Quest progress showing level, XP, stages cleared and stage badges](docs/screenshots/app-quest-progress.png)

One credit pool across every AI surface.

![Pricing: free, Pro and Max plans drawing on one pool of monthly credits](docs/screenshots/pricing.png)

</details>

---

## AI in production

The Gemini API backs all seven scored surfaces. Google Cloud in production: **Firebase Auth, Cloud Firestore, Cloud Functions (139 deployed), Firebase Hosting, Vertex AI.**

| What the model decides | Model |
| --- | --- |
| Runs a spoken interview, decides when it ends | `gemini-live-2.5-flash-native-audio` |
| Scores the transcript, writes the report | `gemini-3.6-flash` |
| Grades the whiteboard image against a rubric | `gemini-3.6-flash` |
| Grades code on top of a measured pass rate | `gemini-3.6-flash` |
| Runs the 29-tool agent loop | `gemini-3.6-flash` |
| Scores a resume against a posting | `gemini-2.5-flash` |
| Tailors a resume to a posting | `gemini-2.5-flash` |

**The unit economics are real.** One credit costs $0.003 in model spend. The free tier's 100 credits is about $0.30 of cost. Pro's 1,000 credits is about $3.00 against $12 of revenue.

---

## Why Education &amp; Human Potential

The global job market has never been more difficult or unequal. Millions of capable engineers and job seekers are trapped in an opaque, high-stakes hiring system—spending hundreds of hours firing resumes into automated black holes, receiving zero actionable feedback, and watching their confidence drain in silence. Traditional interview prep is broken because passive reading cannot prepare anyone for the pressure of a live technical dialogue.

CareerVivid exists to collapse the gap between human potential and real-world opportunity. We replace passive memorization with a real-time, closed-loop execution environment: voice-driven technical sparring, interactive system design whiteboards, instant rubric scoring, and context-aware resume engineering. By offering a comprehensive, frictionless preparation engine in 7 languages—with a free tier that needs no login and no card—CareerVivid democratizes elite engineering mentorship, empowering anyone, anywhere, to prove what they can build and land life-changing roles.

---

## How it is built

```
React + TypeScript (Vite)          →  Firebase Hosting
Cloud Functions (139 exported)     →  AI calls, ATS ingestion, SEO rendering
Cloud Firestore                    →  user data, sessions, agent proposals
Firebase Auth                      →  accounts
Vertex AI Live API                 →  realtime voice (raw BidiGenerateContent WS)
Gemini API                         →  grading, agent, resume, job scoring
Web Worker + Pyodide               →  in-browser execution: JS natively, Python on WASM
```

Four decisions worth calling out:

- **The agent writes nothing directly.** Mutating tools emit server-stored proposals; the client approves by ID. Prompt injection cannot mutate data.
- **Agent transcripts live outside `users/{uid}`** on purpose — that namespace has an owner-write rule a compromised client could use to forge history.
- **22 pages are server-rendered for crawlers** behind a UA check, so the app stays a SPA for humans and still indexes (`functions/src/seo/`).
- **One question follows across surfaces.** The agent returns a route carrying the exact question ID, so "practise this one" lands on that question.

---

## Challenges We Overcame

**Multimodal Vision Diagnostics vs. Aesthetic Bias.**
Grading arbitrary freeform drawings is fundamentally harder than parsing text. Early vision models suffered from "tidy-canvas bias"—rewarding neatly drawn diagrams over architecturally sound ones. We engineered a strict chain-of-thought scratchpad protocol: the model is forced to map data paths, identify single points of failure, and trace capacity limits before computing scores. By binding evaluation to rigid dimension caps and constrained JSON schemas, we eliminated arbitrary scoring and ensured every grade is anchored in genuine systems engineering principles.

**Full-Duplex Real-Time Voice & Instant Barge-In.**
Building a natural conversational interview partner required conquering browser-level audio latency. Handling client-side microphone downsampling, low-latency audio chunk streaming, and seamless acoustic interruption (barge-in)—enabling the candidate to cut in while the AI is mid-sentence without clipping or echo loops—demanded extensive audio buffer optimization and WebSocket state orchestration.

---

## What I Learned

**Ground-truth data beats synthetic generation every time.**
We initially experimented with AI-generated interview prompts, but generic questions produced generic coaching. The breakthrough came when we pivoted to empirical engineering: curating and verifying 4,551 real-world questions from documented hiring loops. This ground-truth foundation instantly elevated the entire platform—powering authentic quest progressions, razor-sharp diagnostic reports, and agent advice that actually mirrors what hiring managers look for.

---

## What's Next for CareerVivid

- **Expanded Polyglot Execution.** Extending the client-side WebAssembly execution environment beyond JavaScript and Python to support Java, C++, and Go.
- **Persistent Episodic Agent Memory.** Upgrading the Career Agent with a cross-session memory graph that tracks a candidate's weaknesses, pacing, and behavioral growth across weeks of preparation rather than isolated rounds.
- **Broader Enterprise Loop Coverage.** Ingesting and calibrating diagnostic rubrics for 50+ additional tier-1 and hyper-growth tech companies.

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
