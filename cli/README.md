# careervivid · CLI

> **Your AI-powered career terminal — voice mock interviews, autonomous job applications, resume editing, job pipeline tracking, and portfolio publishing from the command line.**

[![npm version](https://img.shields.io/npm/v/careervivid?color=0ea5e9&label=careervivid)](https://www.npmjs.com/package/careervivid)
[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-blue)](https://nodejs.org)
[![v2.1.5](https://img.shields.io/badge/version-2.1.5-6366f1?logo=sparkles)](https://www.npmjs.com/package/careervivid)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Commands](#commands)
  - [cv interview](#cv-interview) 🎙 **AI Voice Interview**
  - [cv agent](#cv-agent) ⭐ **AI Agent**
  - [cv agent --jobs](#cv-agent---jobs) 🤖 **Autonomous Job Applications**
  - [cv agent --resume](#cv-agent---resume) 📄 **Resume CRUD**
  - [cv jobs](#cv-jobs)
  - [cv publish](#cv-publish)
  - [cv whiteboard](#cv-whiteboard)
  - [cv profile](#cv-profile)
  - [cv auth](#cv-auth)
  - [cv login](#cv-login)
  - [cv config](#cv-config)
- [AI Credits](#ai-credits)
- [Bring Your Own API Key (BYO)](#bring-your-own-api-key-byo)
- [browser-use Setup (Autonomous Apply)](#browser-use-setup-autonomous-apply)
- [Whiteboard Templates](#whiteboard-templates)
- [AI Agent Integration (MCP / CI)](#ai-agent-integration-mcp--ci)
- [Updating](#updating)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Install globally
npm install -g careervivid

# 2. Log in and get your free API key
cv login
# → opens careervivid.app in your browser
# → authenticate once, API key is saved automatically

# 3. Practice an interview with voice AI
cv interview

# 4. Start the AI agent
cv agent

# 5. Or jump straight into job-hunting mode
cv agent --jobs
```

> **Free tier includes 10 AI credits/month** — no credit card required.

---

## Commands

---

### `cv interview`

**AI-powered voice mock interview** using the Gemini Live API. Vivid, your AI interviewer, conducts a real-time spoken interview tailored to the role you specify. After the session, you receive an auto-generated feedback report with scores and actionable improvement tips.

```bash
cv interview                               # interactive role prompt, voice mode
cv interview --role "Senior Software Engineer"
cv interview --role "Product Manager" --text   # text-only fallback (no mic needed)
cv interview --role "SDE" --resume <id>        # load your resume for context
cv interview --questions 7                     # custom question count (default 5)
```

**Requirements (voice mode):**
- `sox` for audio I/O — install once:
  ```bash
  # macOS
  brew install sox
  # Ubuntu / Debian
  sudo apt install sox
  ```

**How it works:**

1. Vivid generates tailored interview questions using your role (and resume, if provided)
2. A real-time voice session opens — speak your answers naturally
3. Vivid asks follow-up questions and adapts to your responses
4. Press **Ctrl+C** at any time to end
5. A structured feedback report is generated covering:
   - Overall, communication, confidence, and relevance scores (0–100)
   - Specific strengths and areas for improvement

**Interview History & Coaching:**

Every session (transcript + report) is automatically persisted to your CareerVivid account. This enables the **AI Agent** to provide post-interview coaching:

1. Complete an interview via `cv interview`.
2. Start the agent: `cv agent`.
3. Ask: *"How can I improve my answers from my last interview?"*
4. The agent retrieves your actual transcript and suggests **STAR-method** improvements for your specific responses.

**Credit cost:** **2 credits/minute** (minimum 2, maximum 60 per session)

| Session length | Credits |
|---|---|
| < 1 min | 2 |
| 5 min | 10 |
| 10 min | 20 |
| 30 min+ | 60 (cap) |

> Credits are only charged after the session ends — never upfront.

---

### `cv agent`

An **autonomous AI agent** that runs interactively in your terminal. Choose from CareerVivid Cloud (credits deducted from your account) or Bring Your Own API Key.

```bash
cv agent                  # General-purpose agent (Gemini Flash Lite)
cv agent --resume         # Resume CRUD mode: read, update fields, tailor
cv agent --jobs           # Job-hunting mode: search, apply, track pipeline
cv agent --coding         # Full coding toolkit: file I/O, shell execution, search
cv agent --pro            # Gemini Pro with extended thinking
```

**Options:**

| Option | Description |
|---|---|
| `--resume` | Resume CRUD tools — read, set fields, tailor for a job, delete |
| `--jobs` | Job hunting + autonomous apply tools |
| `--coding` | Enable full coding tool suite (file read/write, shell, search) |
| `--pro` | Use `gemini-3.1-pro-preview` with thinking mode |
| `--think <budget>` | Enable thinking mode with a specific token budget (e.g. `8192`) |
| `--verbose` | Show thinking tokens in output |
| `--provider <name>` | Override provider: `careervivid` \| `openai` \| `anthropic` \| `openrouter` \| `gemini` \| `custom` |
| `--model <model>` | Override model (e.g. `gpt-4o`, `claude-opus-4-5`) |
| `--api-key <key>` | BYO API key for this session (not saved) |
| `--base-url <url>` | Custom OpenAI-compatible base URL |

**Configure your default provider:**

```bash
cv agent config
# → Interactive wizard: pick provider, model, API key
```

---

### `cv agent --jobs`

The most powerful mode. A conversational agent that thinks like a senior recruiter, manages your pipeline, and can **autonomously fill out job applications** using [browser-use](https://github.com/browser-use/browser-use).

```bash
cv agent --jobs
```

**What it can do in a conversation:**

| You say... | Agent action |
|---|---|
| `"Find me ML engineering jobs"` | `search_jobs` → scores results vs. resume → `verify_search_results` to confirm all URLs work |
| `"Apply to this job: <URL>"` | `apply_to_job` → launches browser → fills form → stops before Submit for your review |
| `"What's in my pipeline?"` | `list_local_jobs` → shows Kanban board |
| `"What should I work on next?"` | `score_pipeline` → priority-ranked by attention × excitement × fit |
| `"I got an interview at Stripe"` | `update_local_job` → sets status to Interviewing, suggests follow-up |
| `"What am I neglecting?"` | `flag_stale_jobs` → surfaces cold applications |
| `"Show me my analytics"` | `get_pipeline_metrics` → apply rate, avg score, salary data |

**Autonomous Apply Harness** (`apply_to_job` tool):

The agent uses a multi-stage harness to fill job applications:

1. **URL Verification** — Every job link is verified live before the agent acts. Broken, hallucinated, or redirect-to-homepage URLs are rejected automatically.
2. **ATS Detection** — Automatically detects Ashby, Greenhouse, Lever, Workday, iCIMS, and more.
3. **TypeScript Adapter** — Fast-fills known fields (firstName, email, phone, LinkedIn, GitHub) using pre-loaded profile data.
4. **browser-use AI handoff** — For complex fields (cover letter, work auth, custom questions), the browser-use agent takes over with a rich task prompt built from your resume.
5. **Manual review gate** — The browser stays open. The agent **never** clicks Submit — you review and submit yourself.

> **Requires browser-use setup** — see [browser-use Setup](#browser-use-setup-autonomous-apply).

**Pipeline tracking (local CSV):**

The jobs agent also manages a local `jobs.csv` pipeline (v2 schema) with 8 attention metrics:

| Field | Description |
|---|---|
| `attention_score` (1–10) | How top-of-mind is this company? |
| `excitement` (1–10) | Pure enthusiasm for the role |
| `apply_effort` | Low / Medium / High |
| `prep_time_hours` | Estimated research hours |
| `company_stage` | Seed / Series A-C / Public / Enterprise |
| `open_roles_count` | How many roles are currently open |
| `interview_rounds` | Known number of interview rounds |
| `last_activity_date` | Auto-stamped on every update |

**Priority Score = 40% attention + 30% excitement + 20% fit + 10% recency**

---

### `cv agent --resume`

Full CRUD control over your CareerVivid resume from the terminal.

```bash
cv agent --resume
```

**Available tools:**

| Tool | What you can say |
|---|---|
| `get_resume` | `"Show me my resume"` / `"Load my resume"` |
| `list_resumes` | `"What resumes do I have?"` |
| `set_resume_fields` | `"Set my last name to Zhu"` / `"Update my phone to +1-408-599-4164"` |
| `tailor_resume` | `"Tailor my resume for this job description: ..."` |
| `delete_resume` | `"Delete the old untitled resume"` |

**Supported fields for `set_resume_fields`:**

```
firstName, lastName, email, phone
address, city, state, country, postalCode
jobTitle, currentCompany
linkedin, github, portfolio
summary (professional summary)
addSkill / removeSkill
resumeTitle (document name)
```

**Example conversation:**

```
You:   Set my last name to Zhu and my phone to +1-408-599-4164
Agent: ✅ Resume updated — review at https://careervivid.app/edit/...

You:   Add Python and TypeScript to my skills
Agent: ✅ Skills updated

You:   Tailor my resume for this job description: [paste JD]
Agent: ✅ Tailored copy created — https://careervivid.app/edit/...
```

---

### `cv jobs`

Non-interactive job commands (use `cv agent --jobs` for a conversational experience).

| Subcommand | Description |
|---|---|
| `cv jobs hunt` | AI-powered job search scored against your resume → auto-saves to tracker |
| `cv jobs apply <url>` | Autonomous apply harness for a specific URL |
| `cv jobs update` | Interactively update a job application status |
| `cv jobs list` | View your current job tracker board |

```bash
cv jobs hunt --role "Software Engineer" --score 60
cv jobs apply https://jobs.ashbyhq.com/openai/...
cv jobs list
cv jobs update
```

---

### `cv publish`

Publish a Markdown article or Mermaid diagram to your CareerVivid portfolio.

```bash
cv publish <file> [options]
cv publish -       # read from stdin
```

| Option | Description |
|---|---|
| `-t, --title <title>` | Post title (auto-inferred from first `#` heading if omitted) |
| `--type <type>` | `article` \| `whiteboard` (auto-inferred from file extension) |
| `--format <format>` | `markdown` \| `mermaid` (auto-inferred from file extension) |
| `--tags <tags>` | Comma-separated tags, e.g. `typescript,firebase,react` |
| `--cover <url>` | URL to a cover image |
| `--public` | Publish as public (visible to all users) |
| `--private` | Publish as private (only visible to you — **this is the default**) |
| `--dry-run` | Validate payload without publishing |
| `--json` | Machine-readable JSON output |

> **Privacy default:** All articles published via `cv publish` or `cv agent` are **private by default**. Use `--public` to make them visible to the community.

```bash
cv publish article.md --title "How I Built a CLI" --tags "node,typescript"
cv publish article.md --public               # share with community
cv publish architecture.mmd --title "System Architecture"
cat writeup.md | cv publish - --title "Architecture Breakdown" --json
```

---

### `cv whiteboard`

Create and publish Mermaid architecture diagrams.

| Subcommand | Description |
|---|---|
| `cv whiteboard new [file]` | Scaffold a Mermaid diagram from a built-in template |
| `cv whiteboard publish <file>` | Publish a `.mmd` diagram to your portfolio |
| `cv whiteboard list-templates` | List all available built-in templates |

```bash
cv new my-diagram --template system-arch
cv list-templates
```

---

### `cv profile`

Manage your CareerVivid profile.

| Subcommand | Description |
|---|---|
| `cv profile export` | Export resume data to other formats (e.g. `gdoc`) |

---

### `cv auth`

Manage your CareerVivid API key. Get your key at [careervivid.app/developer](https://careervivid.app/developer).

| Subcommand | Description |
|---|---|
| `cv auth set-key <key>` | Save your API key to `~/.careervividrc.json` |
| `cv auth check` | Verify that your saved key is valid |
| `cv auth remove` | Remove the saved key |
| `cv auth whoami` | Show the currently authenticated user |

```bash
cv auth set-key cv_live_YOUR_KEY_HERE
cv auth check
# ✔  Authenticated as Jiawen Zhu (jiawen@careervivid.app)

# Or use env var without saving locally
CV_API_KEY=cv_live_YOUR_KEY_HERE cv publish article.md
```

---

### `cv login`

Open the CareerVivid sign-in page and automatically save your API key.

```bash
cv login
```

---

### `cv config`

View and modify CLI configuration stored at `~/.careervividrc.json`.

| Subcommand | Description |
|---|---|
| `cv config show` | Print the full config (sensitive keys are masked) |
| `cv config get <key>` | Print a single config value |
| `cv config set <key> <value>` | Update a config value |

**Available keys:**

| Key | Description |
|---|---|
| `apiKey` | Your CareerVivid API key |
| `apiUrl` | Optional API endpoint override |
| `targetCompanies` | Target companies for `cv jobs hunt` |
| `llmProvider` | Default BYO LLM provider |
| `llmModel` | Default BYO model |
| `llmApiKey` | BYO LLM API key (masked in output) |
| `llmBaseUrl` | Custom OpenAI-compatible base URL |

```bash
cv config set targetCompanies "OpenAI, Google, Vercel"
cv config set llmProvider openai
cv config set llmModel gpt-4o
```

---

## AI Credits

| Plan | Credits / Month | Price |
|---|---|---|
| **Free** | 10 credits | $0 |
| **Pro** | 1,000 credits | Paid |
| **Max** | 10,000 credits | Paid |

**Credit costs by feature:**

| Feature | Credits |
|---|---|
| `cv interview` (voice) | 2 credits/min (min 2, max 60) |
| `gemini-3.1-flash-lite-preview` agent turn | 0.5 cr |
| `gemini-2.5-flash` agent turn | 1 cr |
| `gemini-3.1-pro-preview` (`--pro`) | 2 cr |
| Resume tailor | 2 cr |
| Job evaluation | 3 cr |

> **Bring Your Own Key:** Using `--provider openai` (or any non-CareerVivid provider) deducts **zero credits** — you pay your provider directly.

Get your key and check balance at [careervivid.app/developer](https://careervivid.app/developer).

---

## Bring Your Own API Key (BYO)

| Provider | `--provider` | Notes |
|---|---|---|
| CareerVivid (default) | `careervivid` | Gemini Flash Lite, Flash, Pro — credits from your account |
| OpenAI | `openai` | gpt-4o, o3-mini, … |
| Anthropic | `anthropic` | claude-opus-4-5, claude-sonnet-4-5, … |
| Google Gemini (direct) | `gemini` | gemini-2.5-flash, gemini-3.1-pro-preview, … |
| OpenRouter | `openrouter` | 100+ models: Kimi, GLM, Qwen, Mistral, Llama, … |
| Custom OpenAI-compatible | `custom` | Any endpoint via `--base-url` |

```bash
cv agent --provider openai --model gpt-4o --api-key sk-...
cv agent --provider anthropic --model claude-opus-4-5 --api-key sk-ant-...
cv agent --provider openrouter --model mistralai/mistral-7b-instruct --api-key sk-or-...

# Save a provider permanently
cv agent config
```

---

## browser-use Setup (Autonomous Apply)

The `apply_to_job` tool in `cv agent --jobs` and `cv jobs apply` use [browser-use](https://github.com/browser-use/browser-use) — a Python AI browser automation library — to fill job applications.

### Prerequisites

- Python 3.11+ with pip
- A virtual environment (recommended)

### Setup (one-time)

```bash
# 1. Create a Python virtual environment
mkdir -p ~/careervivid/browser-use
cd ~/careervivid/browser-use
python3 -m venv .venv
source .venv/bin/activate

# 2. Install browser-use
pip install browser-use

# 3. Install Playwright browsers
playwright install chromium

# 4. Verify
python -c "import browser_use; print('browser-use ready')"
```

### How it works

When you run `cv agent --jobs` and ask to apply to a job:

1. The agent calls `apply_to_job` with the job URL
2. The CLI spawns `src/apply/browser_sidecar.py` (bundled with the npm package)
3. The sidecar launches a real Chrome browser (non-headless) using your profile
4. An AI agent fills the form field-by-field using your resume data
5. The browser **stays open** — you review every field and submit manually

> The agent will **never** click the final Submit button. You remain in full control.

### Resume PDF

Place your resume at `~/.careervivid/resume.pdf` and the sidecar will upload it automatically to resume upload fields.

```bash
cp ~/Downloads/MyResume.pdf ~/.careervivid/resume.pdf
```

---

## Whiteboard Templates

Run `cv list-templates` to see all available templates:

| Template | Description |
|---|---|
| `flowchart` | Generic flowchart / process diagram |
| `system-arch` | System architecture (client → API → DB) |
| `tech-stack` | Full technology stack diagram |
| `user-journey` | Sequence diagram (user ↔ API ↔ DB) |
| `er-diagram` | Entity-relationship / database schema |
| `git-flow` | Git branching and release flow |
| `ci-cd` | CI/CD pipeline (lint → test → build → deploy) |
| `mindmap` | Mind map / concept breakdown |

---

## AI Agent Integration (MCP / CI)

Use `--json` for structured output in automated pipelines.

```bash
# Pipe AI-generated markdown directly
echo "# My Architecture\n\nExplains the new service..." \
  | cv publish - --title "New Service Explained" --tags "architecture" --json

# Output:
# [{ "postId": "abc123", "url": "https://careervivid.app/community/post/abc123" }]
```

**System prompt for Cursor / Claude / Gemini:**

```
You have access to the `cv` CLI tool.

Available commands:
- cv interview                        AI voice interview (requires sox)
- cv publish <file>                   Publish an article (private by default, use --public to share)
- cv agent --resume                   Resume CRUD: read, update fields, tailor
- cv agent --jobs                     Job hunting + autonomous apply
- cv jobs hunt --role "..."           AI job search
- cv jobs apply <url>                 Autonomous form filling (stops before submit)
- cv jobs list                        View job tracker

Rules:
1. Never include real API keys in published content.
2. Always use --json for machine-readable output.
3. Articles are PRIVATE by default. Only use --public if user explicitly requests it.
```

---

## Updating

```bash
npm install -g careervivid
cv -v
```

---

## Troubleshooting

**`cv: command not found`**
```bash
npm config get prefix
# Add <prefix>/bin to your PATH in ~/.zshrc or ~/.bashrc
```

**`Unauthorized` error**
```bash
cv auth check
CV_API_KEY=cv_live_YOUR_KEY cv publish article.md
```

**`cv interview` — no audio / can't hear Vivid**
```bash
# Install sox first:
brew install sox          # macOS
sudo apt install sox      # Ubuntu/Debian

# Then retry:
cv interview
```

**`cv interview` — hearing echo / Vivid repeating itself**

This can occur if your microphone picks up the speaker output. The CLI uses half-duplex mute suppression (mic is muted while Vivid is speaking). Use headphones for the best experience.

**`browser_sidecar.py not found`**
```bash
# browser-use is not set up. Follow the browser-use Setup section above.
# Verify your venv path:
ls ~/careervivid/browser-use/.venv/bin/python
```

**`aiohttp is not defined` or `ainvoke() takes 2 positional arguments`**
```bash
# Update to the latest version (fixed in v1.12.5+)
npm install -g careervivid@latest
```

**`❌ No API key found` when using CareerVivid Cloud**
```bash
cv auth check          # verify your CV API key is set
cv agent config        # reconfigure your LLM provider
```

**`cannot add command 'agent'` error (< v1.12.2)**
```bash
npm install -g careervivid@latest
```

**Job URL is broken / agent says it can't confirm the link**
The agent uses a live URL verification harness. If a link fails verification it will tell you instead of sending you to a broken page. Search for the role directly on the company's careers page or LinkedIn.

**Article shows as public even though I said private**
Update to v1.12.6+ — articles are now private by default. Use `--public` or tell the agent `"publish publicly"` to share with the community.

**Permission denied on `~/.careervividrc.json`**
```bash
chmod 600 ~/.careervividrc.json
```

---

## Resources

- 🌐 [careervivid.app](https://careervivid.app)
- 🔑 [Developer Settings & API Key](https://careervivid.app/developer)
- 💳 [Pricing & AI Credits](https://careervivid.app/pricing)
- 🐛 [Report an Issue](https://github.com/Jastalk/CareerVivid/issues)
- 📦 [npm Package](https://www.npmjs.com/package/careervivid)

---

MIT License © CareerVivid
