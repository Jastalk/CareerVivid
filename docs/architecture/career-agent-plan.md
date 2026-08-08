# Career Agent — Architecture & Rollout Plan

Status: **implemented** — Phases 1–4 built, not yet deployed. See §5 for what is
still open and §6 for the item-by-item checklist.
Date: 2026-08-08

A global, tool-using agent that can read a user's career data, propose changes,
and — with approval — write resumes, tracked jobs, and application stages.

---

## 1. Starting state (before this work)

Before designing anything new, here is the ground truth in this repo. Several
pieces of the proposed architecture are already built; others are built in a
form that cannot ship.

### Already usable

| Capability | Where | Notes |
|---|---|---|
| Server-side Gemini proxy with credit deduction | `functions/src/agentProxy.ts` | HTTP fn, `cv_live_` key auth, reserve-then-refund on failure |
| Live voice with **server-issued Vertex tokens** | `src/components/aiInterviewAgent/useAIInterviewAgentSession.ts:631` | Calls `getInterviewVertexToken`; no browser key |
| Live voice on the backend | `functions/src/resumeCoach.ts`, `functions/src/mobileInterview.ts` | `gemini-live-2.5-flash-native-audio` |
| Career profile storage | `src/services/careerOpsService.ts`, `src/utils/careerProfileGraph.ts` | `getCareerProfile` / `saveCareerProfile` |
| A global chat surface | `src/components/ChatBot.tsx`, mounted `src/App.tsx:863` | Gated to `/dashboard` only; FAQ + freeform, **no tools** |
| Tool type + GenAI adapter | `src/agent/Tool.ts` | Has `requiresConfirmation` already |
| Agent loop w/ streaming, compaction, retry | `src/agent/QueryEngine.ts` | See caveat below |
| Job/apply automation | `functions/src/autoApplyAgent.ts`, `src/services/applyAgentService.ts` | |

### Built, but not shippable as-is

**`QueryEngine` runs in the browser against a raw API key.**
`QueryEngine.ts:100` constructs `new GoogleGenAI({ apiKey })`, and
`AgentPage.tsx:41` sources that key from `localStorage.gemini_api_key`. This is
a developer sandbox. Any production agent must route model calls through a
server function — `agentProxy.ts` is the working precedent.

Note the loop shape is still correct and worth keeping: iterate, emit tool
calls, execute, feed results back, cap at 30 iterations. The change is *where
the model call happens*, not *how the loop works*.

### Broken / drifted — all three fixed in Phase 0

**Three credit tables, and they disagree on model IDs, not just prices.**

| Table | Consumers | Sample entries |
|---|---|---|
| `CLI_AGENT_COSTS` (`src/config/creditCosts.ts:20`) | **0** | `gemini-3.1-flash-lite-preview` = 0.5, `gemini-3.1-pro-preview` = 2 |
| `MODEL_CREDIT_COST` (`functions/src/agentCredits.ts:26`) | 1 | `gemini-3.1-flash-lite` = **0.75**, `gemini-3.5-flash` = 1.5 |
| `MODEL_CREDIT_COST` (`functions/src/agentProxy.ts:40`) | 1 | byte-identical copy; comment: *"must match agentCredits.ts"* |

Consequences:

- `CLI_AGENT_COSTS` has **zero importers**. It is dead config that documents
  prices and model names which are not what the backend actually charges or
  accepts.
- `agentProxy.ts:198` rejects any model outside its allowlist with a 400. The
  IDs advertised in `CLI_AGENT_COSTS` are **not** in that allowlist.
- `getMonthlyLimit()` is defined and never called in *both*
  `agentCredits.ts:40` and `agentProxy.ts:50` (both call
  `getPlanMonthlyLimitForUser` instead).

**Credits are a counter, not a ledger.** `aiUsage.count` is a single
`FieldValue.increment` on the user doc. There is no per-transaction record, so
there is no way to answer "what did this user spend credits on last month?",
no way to reconcile against real model cost, and no audit trail. `agentProxy`
has an ad-hoc `refundCredits` (`agentProxy.ts:144`); `agentCredits` does not.

---

## 2. Target architecture

### 2.1 One agent surface, controlled context

A collapsible **Career Agent drawer** on authenticated pages, plus a
full-screen workspace at `/agent` (replacing the current sandbox page).

Context is **assembled server-side from a whitelist**, never "the user's
Firestore history". Each turn sends a bounded envelope:

```ts
interface AgentContext {
  route: string;                  // current path
  entity?: { type: 'resume' | 'job' | 'course'; id: string };
  activeResumeId?: string;
  careerProfile: CareerProfileSummary;   // capped, derived
  trackerSummary: { counts: Record<Stage, number>; recent: JobRef[] };
  learningProgress: { courseId: string; pct: number }[];
  recentTasks: AgentTaskSummary[];       // last N, titles + outcomes only
}
```

Hard rule: the envelope is built by a server function with an explicit
allowlist of fields and a byte cap. No raw document passthrough.

### 2.2 Tools, not database access

The model requests a tool; **the application executes it**. This matches
Google's function-calling contract, where the caller — not the model — runs the
function and returns the result.

Proposed initial surface (each is a server-side handler, auth'd by Firebase
Auth, scoped to the calling uid):

| Tool | Writes? | Approval |
|---|---|---|
| `getCareerProfile` | no | — |
| `analyzeResume` | no | — |
| `recommendJobSearch` | no | — |
| `recommendLearningPath` | no | — |
| `navigateToRoute` | no | — |
| `createResumeDraft` | **yes** | required |
| `updateResumeSection` | **yes** | required |
| `createJobTracker` | **yes** | required |
| `addTrackedJob` | **yes** | required (batch: always) |
| `moveJobToStage` | **yes** | required |
| `startInterviewPractice` | side-effect | required (spends credits) |

Every write tool is declared with `requiresConfirmation: true` — the field
already exists on `src/agent/Tool.ts:26`.

**Read tools must still be authorization-checked server-side.** A tool call is
model-influenced input; it is not a trusted assertion that the user may read
the thing. Reuse `src/config/accessPolicy.ts` where lesson/course gating
applies.

### 2.3 Approval as a diff card, not a chat question

Writes surface a **Proposed changes** card rendering the concrete before/after,
with Approve / Edit / Discard. Plain-text "shall I?" turns are ambiguous, easy
to mis-parse, and give the user nothing to audit.

Flow for "create my first resume":

1. Agent asks only for genuinely missing fields.
2. Agent builds a structured preview (no write).
3. User approves in the card.
4. `createResumeDraft` writes.
5. Agent re-reads the saved doc to verify.
6. `navigateToRoute('/newresume')`.

### 2.4 Credits: one ledger, reserve → settle

Consolidate to a **single source of truth** shared by web, functions, and CLI,
then move from counter to ledger:

```
1. estimate + reserve   (write ledger entry: status=reserved)
2. execute model/tools
3. record actual usage
4. settle               (status=settled, actualCost)
5. on failure: release  (status=released, cost=0)
6. audit entry retained: { task, model, tools, cost, result, ts }
```

The reserve step is what makes concurrent requests unable to overspend — that
property already exists in `agentProxy` and must be preserved.

Users see **action pricing**; the ledger records **model cost**. Those are
deliberately different numbers, and the gap is the margin.

### 2.5 Live voice: short and task-scoped

Do **not** hold one site-wide Live session open. Live sessions reprocess
accumulated context, so later turns get progressively more expensive. Sessions
must be user-initiated, scoped to one task, and closed on completion.

Auth is already correct: `getInterviewVertexToken` issues a server-side Vertex
token. Extend that pattern; never put a Gemini key in the browser.

---

## 3. Rollout

**Phase 0 — Consolidate (prerequisite).** One credit table, one ledger,
delete `CLI_AGENT_COSTS` and the dead `getMonthlyLimit` pair, reconcile the
model allowlist. Nothing below is safe to build on the current three-table
state.

**Phase 1 — Agent onboarding.** Global text agent, resume upload or guided
creation, structured career profile, preview + confirm, hand off to
`/newresume`.

**Phase 2 — Job tracker.** Create initial pipeline, set targets, add saved
jobs, move stages, generate next actions.

**Phase 3 — Cross-product.** Resume tailoring, Interview Studio prep, course
recommendations, dashboard summaries, "continue where I left off".

**Phase 4 — Live voice.** Interview Studio first; optional onboarding voice;
short user-initiated sessions on server-mediated tokens.

Division of responsibility stays: **Firebase** owns auth, Firestore, rules, and
the credit ledger; **Vertex/Gemini** owns model execution.

---

## 4. Decisions (settled 2026-08-08)

1. **Job board** — tracker tools now; external sourcing + auto-populate deferred
   until the approval card is proven on lower-risk writes.
2. **Surface** — drawer + full-screen, built as one component with two layouts
   (`CareerAgentPanel variant="drawer" | "full"`).
3. **Approval** — confirm by default, per-tool opt-in for `low_write` only.
   `high_write` is never exemptible (`isAutoExecEligible`).
4. **Voice** — text everywhere, voice in Interview Studio first.
5. **Credits** — conversation free on Flash-Lite up to 30 turns/day, then
   billed; artifacts and Live always metered.

## 5. Known gaps

Tracked so they are not mistaken for finished work:

- **Auto-exec preference UI** does not exist. The plumbing does — the client
  sends `autoExecTools` and the server filters it by risk tier — but nothing
  lets a user opt in, so every write currently prompts. That is the safe
  default and matches decision 3; it is the opt-in half that is missing.
- **Firestore rules**: `creditLedger`, `agentProposals`, and `voiceSessions` are
  top-level and have no client rule, so they are default-deny. That is
  deliberate — `users/{userId}` carries a `match /{allChildren=**}` rule
  granting the owner write access, and Firestore rules are additive, so a
  stricter rule nested under it cannot take that access back. Do not move these
  collections under `users/{uid}` without first narrowing that catch-all.

## 6. Phase checklist

| Phase | Item | Where |
|---|---|---|
| 1 | Global text agent | `AgentDrawer` on every authed route + `/agent` workspace |
| 1 | Resume upload | Panel attach → `parseResumeFromFile` → `<uploaded_resume>` → `createResumeDraft` |
| 1 | Guided resume creation | `createResumeDraft` |
| 1 | Structured career profile | `getCareerProfile`, `updateCareerProfile` |
| 1 | Resume preview + confirmation | `ProposedChanges` card, args stored server-side |
| 1 | Continue into the builder | `navigateToRoute` → `/newresume`, or `/edit/{id}` after a draft |
| 2 | Create initial pipeline | `addTrackedJob`, `getJobTracker` |
| 2 | Targets: role/location/seniority | `setJobTargets` |
| 2 | Add saved jobs | `addTrackedJob` (batch, always approved) |
| 2 | Move through stages | `moveJobToStage` |
| 2 | Generate next actions | `generateNextActions` |
| 3 | Resume tailoring | `tailorResume` |
| 3 | Interview Studio prep | `startInterviewPractice` |
| 3 | Course recommendations | `recommendLearningPath` + generated `courseCatalog.ts` |
| 3 | Dashboard summaries | `summarizeProgress` |
| 3 | Continue where I left off | `summarizeProgress` + `recentTasks` in the envelope |
| 4 | Interview Studio first | existing `getInterviewVertexToken` path, untouched |
| 4 | Onboarding voice | `startVoiceSession` purpose `profile_intake` |
| 4 | Short, user-initiated sessions | `capMinutes` server-side + local timer; per-minute billing |
| 4 | No key in the browser | `getAgentVoiceToken` mints a short-lived Vertex token |
