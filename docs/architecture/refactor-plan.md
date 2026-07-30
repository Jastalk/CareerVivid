# CareerVivid refactor plan

Target: every product is a self-contained module with a published surface, so a
change to Jobs cannot silently break Interviews, and a newcomer can find the
code for a feature by naming it.

Approach: **incremental strangler**. No big-bang. Each phase is one mergeable PR
that leaves `main` green and deployable, because feature work continues in
parallel.

---

## 1. Where we are

Measured on `main`, not estimated.

| Symptom | Measurement | Cost |
|---|---|---|
| Routing is hand-rolled | `src/App.tsx` = 905 lines, **75 `else if (path…)` branches**, **0 `<Route>` elements** | Every feature edits one file (37 commits touch it). Params parsed by `path.split('/')`. Nothing checks a route's component exists — this is how `/learning/ccaf-quest` shipped pointing at an uncommitted file and broke the build for days. |
| Three competing structures | `components/` 285 files · `pages/` 130 · `features/` 148 but only **4 slices** | "Where does this go?" has no answer, so new code lands anywhere. |
| One `src/` builds three apps | web + Chrome extension share a folder; `content.ts` 2,022 lines, `background.ts` 1,738, 29 extension files | Nothing stops the web bundle importing extension code or vice versa. |
| Client/server duplication | `src/lib/learningSeo.ts` ⟷ `functions/src/seo/learningSeo.ts` | Drifted and caused **two production bugs**: a wrong canonical URL, then a 404 on `/learning/system-design-interview`. |
| Data access unlayered | **51 files** in `components/`+`pages/` import `firebase/firestore` directly | Queries + logic + JSX in one file → `JobMarketPage` 1,332 lines, `JobsRecommendPage` 1,210. |
| Import hygiene abandoned | 1,640 relative imports, **205 at `../../../`+**; the `@/` alias is used **14 times** | Moving a file breaks unrelated imports; discourages reorganising. |
| Thin test net | **52 test files / 810 source files (~6%)** | Refactoring is unsafe by default. Drives the "tests first" rule below. |

God files: `functions/src/index.ts` 1,963 · `geminiService.ts` 1,952 · `types.ts` 1,183.

---

## 2. Target architecture — modular monolith

Not microservices, not a rewrite. One deployable app, hard internal boundaries.

```
packages/
  shared/                  # the ONLY code both web and functions import
    seo/                   # kills the learningSeo duplication class of bug
    types/                 # domain types (replaces the 1,183-line src/types.ts)
    validation/            # zod schemas — one definition, both sides
apps/
  web/                     # the Vite SPA
  extension/               # Chrome extension — its own build, own deps
  functions/               # Cloud Functions
```

Inside `apps/web/src/`:

```
modules/                   # one folder per PRODUCT
  resume/  jobs/  interviews/  learning/  portfolio/  community/
  billing/ agency/ auth/ admin/ commerce/ marketing/
shared/                    # cross-product only: design system, hooks, utils
app/                       # routing, providers, layout shell
```

### The module contract

Each module owns its slice top to bottom and publishes one entry point:

```
modules/jobs/
  index.ts        # PUBLIC API — the only file other modules may import
  routes.ts       # this module's route definitions
  pages/          # route targets
  components/     # module-private UI
  hooks/
  api/            # ALL Firestore/HTTP access for this module
  types.ts
```

Three rules, enforced by lint (§4), not by discipline:

1. **Cross-module imports go through `index.ts`.** `import { JobCard } from '@/modules/jobs'` — never `@/modules/jobs/components/JobCard`.
2. **Modules never import each other's internals.** If Jobs and Interviews both need something, it moves to `shared/`.
3. **Data access lives in `api/`.** No component imports `firebase/firestore` directly. This is what shrinks the 1,000+ line pages.

---

## 3. Module map

Derived from the existing 65 pages, 34 services, and 70 function modules — these
are your domains, not invented ones. Ordered by churn (highest first).

| Module | Absorbs |
|---|---|
| `portfolio` | `features/portfolio` (271 commits — highest churn), `PortfolioBuilderPage`, `BioLinksPage`, `BusinessCardPage`, `portfolioService`, `editPortfolio`, `portfolioApi` |
| `jobs` | `JobMarketPage`, `JobsRecommendPage`, `JobTrackerPage`, `PublicJobBoardPage`, `JobPostingEditor`, `components/JobTracker`, `jobService`, `scrapedJobs`, `applyAgentService` |
| `resume` | `Editor`, `pages/editor`, `GenerationHub`, `FolderView`, `PublicResumePage`, `components/templates`, `templateService`, `tailorResume`, `resumeCoach`, `resumeGeneration`, `pdfGenerator` |
| `learning` | `CoursePage`, `InteractiveLessonPage`, `CourseResumePage`, `SystemDesignCoursePracticePage`, `CcafQuestPage`, `components/CourseWidgets`, `components/CcafQuest`, `lib/ccafMissions`, `lib/interactiveCourses` |
| `interviews` | `InterviewStudio`, `CompanyQuestPage`, `answerLibrary`, `mobileInterview`, `liveSessionService`, `vapiWebhook` |
| `community` | `pages/community`, `components/Community`, `publishPost`, `commentService`, `social` |
| `agency` | `features/agency-partner`, `AgencyPartnerDashboard`, `AgencyPreparePage`, `ClientPortalPage`, `talentSolution` |
| `billing` | `features/pricing`, `BillingDashboard`, `SubscriptionPage`, `PricingPage`, `stripe`, `stripeConnect`, `agentCredits` |
| `auth` | `SignInPage`, `SignUpPage`, `AuthPage`, `VerifyEmailPage`, `OnboardingPage`, `authAccountLinking`, `accountDeletion` |
| `marketing` | `LandingPage`, `TechLandingPage`, `components/Landing`, `Blog*`, `ProgrammaticSeoPage`, `seo/` |
| `admin` | `pages/admin`, `AdminChoicePage`, `DeveloperSettings`, `OpenRevenuePage` |
| `commerce` | `features/commerce`, `MerchantProductSubmission`, `OrderNfcCardPage`, `stitchCommerce` |

`Dashboard` and `Navigation` (91 and 61 commits) stay in `shared/` — they compose
across modules by design.

---

## 4. Guardrails

Conventions decay unless a machine enforces them. Each of these fails CI.

**Module boundaries** — `eslint-plugin-boundaries` or `import/no-restricted-paths`:
```
modules/*/**  may not import  modules/*/[!index].*     # no deep cross-imports
shared/**     may not import  modules/**               # shared stays generic
apps/web/**   may not import  apps/extension/**        # no bundle leakage
```

**No raw data access in UI** — ban `firebase/firestore` outside `*/api/**`.

**Route integrity** — a test asserting every entry in the route registry resolves
to a real component. This single test would have caught the `CcafQuestPage`
build break at PR time instead of after merge.

**Import style** — require `@/` for cross-module imports; relative only within a
module. Fixes the 205 `../../../` imports and makes files movable.

**Coverage ratchet** — coverage may not drop below the current number. No target,
just a one-way door.

---

## 5. Sequence

Every phase is one PR, green and deployable. Feature work continues throughout.

| # | Phase | Why here | Risk |
|---|---|---|---|
| 0 | **Conventions + guardrails in `warn` mode.** This doc, `CONVENTIONS.md`, lint rules reporting but not failing. Zero code moves. | New code starts landing correctly before anything moves. Immediate payoff, no risk. | None |
| 1 | **Route registry.** Replace 75 `if/else` branches with a declarative config + the route-integrity test. `App.tsx` becomes ~80 lines. | Highest pain, highest bug count, and it unblocks per-module routing in every later phase. | Medium — mitigated by the integrity test plus a smoke test per route |
| 2 | **`packages/shared`.** Move SEO metadata, domain types, and validation schemas that both sides need. Delete the duplicated `learningSeo`. | Kills a bug class that already bit twice. Small and self-contained. | Low |
| 3 | **Extract the extension** into `apps/extension`. | Removes 29 files and ~4,000 lines from the web tree; shrinks the web bundle. Clean cut, few shared imports. | Low–medium |
| 4+ | **One module per PR**, in the §3 order. Each: write characterization tests → move files → route via registry → collapse `api/` → enable that module's lint boundary in `error` mode. | Highest-churn first = fastest relief. | Low per PR — that is the point of doing twelve small ones |
| N | Flip all lint rules from `warn` to `error`; delete `pages/` and top-level `components/`. | The old layout stops being reachable. | None |

**Migrating one module** (the repeatable recipe):
1. Characterization tests pinning current behaviour — *before* touching anything.
2. `git mv` files into `modules/<name>/`. Moves only, no logic edits, so the diff is reviewable.
3. Add `index.ts` exporting only what other modules actually use.
4. Move Firestore calls out of components into `api/`.
5. Register the module's routes.
6. Enable its lint boundary as `error`.
7. Green CI, deploy, next.

---

## 6. Rules while this is in flight

Because features ship in parallel:

- **New code goes in the new structure**, always — even before its module is migrated. Never grow `pages/` or top-level `components/`.
- **One module per PR.** Never two.
- **Moves and logic changes never share a commit.** A `git mv`-only commit is reviewable at a glance; a mixed one is not.
- **Deleting is part of the job.** `JobMarketPage.tsx.backup` and `CandidatePipeline.tsx.backup` are in the tree today. Dead code goes.
- **If a phase stalls, it still merged green.** No long-lived branches — that is the whole reason for the strangler.

---

## 7. What this does not cover

Deliberately out of scope, worth their own decisions later:

- **`functions/src/index.ts` (1,963 lines)** — splitting Cloud Function exports touches deploy topology and function names. Separate plan.
- **`next-app/`, `remotion-commercial/`, `Sources/` (iOS), `mcp-server/`** — each already isolated. They become `apps/*` workspaces when the root is a real monorepo, but nothing forces that now.
- **Moving CCAF questions to Firestore** — real value (1,351 lines currently ship to every visitor; content edits need a redeploy) but it is a data-layer change, not a structural one.
- **State management.** `zustand` is a dependency alongside 4 React contexts. Pick one deliberately, after modules exist and the actual needs are visible.
