# CareerVivid Agent Coordination

## Canonical Repository

Use this repository for coordinated CareerVivid work:

```bash
cd /Users/jiawenzhu/Developer/careervivid
```

The former `/Users/jiawenzhu/Developer/careervivid-release` worktree has been retired. Do not reference it in deployment, release, security, or packaging instructions.

Before a release operation, always inspect the active branch and working tree. If unrelated changes are present, create or use a clean worktree from this repository and bring over only the intended changes.

## Chrome Extension Packaging

- Prepare Chrome extension builds and upload zip files from `/Users/jiawenzhu/Developer/careervivid` or a clean worktree created from it.
- When only creating a Chrome Web Store upload zip, package from a copied staging directory so the original `dist-extension` folder remains untouched.
- Keep the upload folder free of obsolete extension zips so the latest `2.1.1` package is unambiguous.

## Ownership

- Lead Codex owns overall product direction, design quality, feature development, deployment sequencing, release safety, and final integration.
- Security Autofix owns security-focused work only: dependency alerts, auth/redirect hardening, secret exposure, CORS, Firebase rules/functions security, and regression tests for those fixes.
- Security Autofix should not redesign UI, roll back product features, change audio/interview logic, alter dashboard/portfolio/editor layouts, or deploy hosting unless the user and Lead Codex explicitly approve.

## Security Workflow

1. Start from `/Users/jiawenzhu/Developer/careervivid` or a clean worktree created from it.
2. Check `git status --short --branch` before editing.
3. Create a task branch from the verified clean current branch for each fix.
4. Use GitHub Dependabot as the required source of truth when GitHub is reachable.
5. Do not depend on removed or unavailable scanner integrations; use Dependabot plus local audits as the baseline workflow.
6. Keep security changes minimal, reviewable, and scoped to the finding.
7. Preserve existing product behavior and visual design unless the security finding requires a narrow product-facing change.
8. Run targeted tests for touched code, plus the relevant build command before marking work ready.

## Deploy Safety

- Do not deploy from a dirty worktree unless every changed file is intentionally in scope and has been reviewed.
- For hosting-only web changes, prefer:

```bash
npm run build && firebase deploy --only hosting
```

- Deploy Cloud Functions only when function code changed.
- After any hosting deploy, verify that live asset URLs under `/assets/*.js` return JavaScript, not `text/html`.
- Do not undo the service-worker and Firebase hosting cache safeguards added after the stale chunk incident.

## Current Incident Context

The clean release branch includes safeguards for SPA rewrites and service-worker caching. Future changes should preserve those protections.

## Video Creation & YouTube Deployment Workflow

When provided with a video project directory (e.g., `Resume editor demo video (1)` containing exporter scripts, HTML/React timeline code, soundtracks, and assets):

1. **Compile and Render the Video:**
   - Host the timeline page locally (e.g., on `localhost:8765`).
   - Run the frame exporter script using Playwright to capture screenshot frames. Ensure you programmatically hide temporary overlays, voiceover buttons, or recording indicators (e.g., `#vo-btn`, `#rec-btn`) if required.
   - Use `ffmpeg` to compile the image frames to an H.264 video at `1920x1080` resolution and mux the background soundtrack.
   - Clean up temporary files, silent tracks, and raw screenshotted frames.
2. **Obtain User Review:**
   - Present the rendered video file to the user for review.
   - Wait for the user to confirm there are no more changes.
3. **Deploy to YouTube:**
   - **MANDATORY CLI-ONLY UPLOAD DIRECTIVE**: YouTube video uploads and metadata releases MUST be performed **100% exclusively via CLI tools**. Never use browser GUI, manual web uploads, or browser automation for YouTube uploads.
   - **CareerVivid Videos**: MUST upload exclusively to **`https://www.youtube.com/@CareerVividSystemDesign`** using `node scripts/upload-careervivid-youtube-video.mjs`.
   - **DevPost / Hackathon Videos**: Upload to **`@evanzhu-k8q`** using `uploader.js`. Never mix CareerVivid content onto `@evanzhu-k8q`.
   - By default, the privacy setting must be set to `public`.

## System Design Video Production Skill (Veo 3.1 Lite)

All agents (Antigravity, Claude Code, and Subagent Fleets) generating System Design explainer videos MUST read and obey the Skill specification at:
`skills/vox-system-design-video-production/SKILL.md`

- **Mandatory Daily Video Production Cadence**: All agents MUST produce **3 high-converting System Design videos EVERY DAY**.
  - **Topic Differentiation**: If a topic (e.g. YouTube, Uber, WhatsApp) has been covered before, choose **new deep-dive sub-categories** that were NOT mentioned previously.
  - **TikTok Submission & Thumbnail Mandate**: For TikTok uploads via `node scripts/upload-tiktok-video.mjs --video <mp4> --thumbnail <jpg> --caption <caption>`, the uploader MUST attach the custom 16:9 thumbnail cover, ensure "Who can see this post" is set to "Everyone", and complete the final step of clicking the **Post/Submit button** so the video link is published live.
- **Mandatory Default AI Video Model**: `veo-3.1-lite-generate-001` ($0.05/sec, restricted to Beats 1 & 8 mood/motion clips with ZERO text).
- **Programmatic Progressive Diagram Architecture**: Beats 2–7 MUST be rendered programmatically at 1920x1080 @ 30fps via Playwright (real DOM text, progressive node/edge build-up, dark grid/slate backdrop, zero AI text gibberish).
- **Concrete Technical Metrics Mandate**: EVERY beat MUST include at least one concrete metric (QPS, TTFT ms, VRAM GB, Tokens/sec).
- **Two-Layer Thumbnail Build**: Layer 1 (`generate_image` background plate, zero text) + Layer 2 (Playwright DOM typography overlay).
- **TikTok 9:16 Vertical Short**: Every compilation MUST cut a 45–60s 9:16 vertical short from Beat 5.
- **Shared Grammar**: Import from `scripts/system-design-interview/paperCollagePromptGrammar.mjs`.
- **Zero On-Screen Text in AI Video**: Mandatory `TEXT` and `NEGATIVE` constraints preventing pseudo-latin or edge gibberish text.
- **Mandatory Spoken Like & Subscribe CTA**: All System Design script outro beats MUST include explicit verbal narration asking viewers to like and subscribe for more breakdowns (e.g., *"If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!"*).
- **Mandatory YouTube Video Description Links**: All YouTube video descriptions MUST include:
  - System Design Learning: `https://careervivid.app/learning/system-design-interview`
  - Coding for Beginners: `https://careervivid.app/learning/coding-interview-patterns`
  - 300+ Real Tech Company Interview Questions: `https://careervivid.app/interview-studio`
- **Mandatory 16:9 Thumbnail Generation & Upload**: Every video generated MUST include a high-converting 16:9 thumbnail generated via `generate_image` (paper collage art direction, bold contrast, NO YouTube tags/icons) and attached during CLI upload via `node scripts/upload-careervivid-youtube-video.mjs --video <mp4> --thumbnail <jpg> --title <title> --description <desc>`.

## ego-browser Handoff Protocol
- Every time after an agent finishes using `ego-browser`, the agent MUST invoke `await completeTaskSpace(task.id, { keep: true })` (or `{ keep: false }`) to relinquish browser control and return control back to the user immediately.


