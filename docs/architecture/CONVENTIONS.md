# Code conventions

The standard for CareerVivid. Companion to
[`refactor-plan.md`](./refactor-plan.md), which explains how the codebase gets
here from where it is.

Rules marked **[lint]** are enforced by `.eslintrc.cjs`. They are warnings today
and become errors area by area as the refactor lands — see the phase table in
the plan. A rule nobody enforces is a preference, not a convention.

---

## 1. Where code goes

One question, one answer: **code lives with the product it serves.**

```
src/modules/<product>/
  index.ts        # PUBLIC API — the only file other modules may import
  routes.ts       # this module's route definitions
  pages/          # route targets
  components/     # module-private UI
  hooks/
  api/            # ALL data access for this module
  types.ts
```

The twelve products: `resume` · `jobs` · `interviews` · `learning` ·
`portfolio` · `community` · `billing` · `agency` · `auth` · `marketing` ·
`admin` · `commerce`.

`src/shared/` is for things genuinely used by two or more modules — the design
system, generic hooks, formatting utilities. **When in doubt, put it in the
module.** Code moves to `shared/` when a second module needs it, never in
anticipation. A `shared/` that accumulates one-off helpers is just the old
`components/` folder with a new name.

`src/app/` holds the shell: routing, providers, layout.

### Three boundary rules

1. **Enter a module through its front door.** **[lint]**
   `import { JobCard } from '@/modules/jobs'` — never
   `@/modules/jobs/components/JobCard`. If something isn't in `index.ts`, it is
   private, and you may change it freely without breaking anyone.

2. **`shared/` never imports a module.** Dependencies point inward. If
   `shared/` needs something from `jobs/`, it isn't shared.

3. **Modules do not import each other's internals.** If two modules need the
   same thing, it moves to `shared/`. If one module needs to *trigger* another,
   that goes through a route or a shared service — not a deep import.

---

## 2. Data access

**Components receive data. They do not fetch it.** **[lint]**

No `firebase/firestore` import outside a module's `api/` layer or a service.
Today 65 files break this, which is why `JobMarketPage` is 1,332 lines: a
component that queries, transforms, holds loading state, and renders is four
responsibilities in one file and cannot be tested without a network.

```ts
// modules/jobs/api/jobs.ts — queries live here
export const fetchSavedJobs = (uid: string): Promise<Job[]> => { … }

// modules/jobs/pages/JobTrackerPage.tsx — the page composes
const { data, isLoading } = useSavedJobs(uid);
```

---

## 3. Imports

- **Cross-module: use `@/`.** **[lint]** `@/shared/ui/Button`, not
  `../../../shared/ui/Button`. Deep relative paths break the moment a file
  moves; 205 of them exist today and are a large part of why reorganising has
  felt expensive.
- **Within a module: relative is fine and preferred.** `./components/JobCard`
  reads better and signals "this is local".
- Never import from `dist/`, `lib/`, or another app's source.

---

## 4. Routing

Routes are **data**, declared in each module's `routes.ts` and collected by the
app shell. Never a hand-written `if (path === …)` chain — that is what this
refactor is undoing.

Every route entry is covered by the route-integrity test, which asserts the
component it names actually resolves. That test exists because
`/learning/ccaf-quest` once shipped pointing at a file that was never
committed, and it broke `main` for days before anyone noticed.

---

## 5. File size

No hard limit, but treat these as smells worth acting on:

- **A component over ~300 lines** is usually several components.
- **A file over ~500 lines** usually has more than one responsibility.
- **Any file over 1,000 lines** needs a reason you could defend out loud.

Current offenders, for calibration: `functions/src/index.ts` 1,963 ·
`geminiService.ts` 1,952 · `JobMarketPage` 1,332 · `types.ts` 1,183.

Domain types belong to their module (`modules/jobs/types.ts`), not to one
1,183-line global `types.ts`.

---

## 6. Commits and PRs

- **Moves and logic changes never share a commit.** A `git mv`-only commit is
  reviewable at a glance; a mixed one hides behaviour changes inside a large
  diff. This matters most during the refactor.
- **One module per PR.** Never two.
- **Delete dead code as you find it.** Two `.backup` files are tracked in the
  repo today. Version control is the backup.
- Do not add `Co-Authored-By: Claude` trailers.

---

## 7. Tests

Coverage is ~6% (52 test files / 810 source files), so the rule is directional
rather than a threshold:

- **New modules ship with tests for their `api/` layer and pure logic.**
- **Before moving existing code**, pin its current behaviour with a
  characterization test — that is what makes "nothing broke" a fact instead of
  a hope.
- **Coverage may not go down.** No target, just a one-way door.

---

## 8. Known violations

Honest accounting, so nobody mistakes the current state for the standard:

| Violation | Count | Cleared in |
|---|---|---|
| `firebase/firestore` imported in UI | 65 | Per-module, phase 4+ |
| Deep relative imports (`../../../`) | ~209 | Per-module, phase 4+ |
| Hooks called conditionally | 6 | Own PR — these are latent crashes |
| Unreachable code | 2 | Own PR |
| Hand-rolled route branches | 75 | Phase 1 |
| Duplicated client/server modules | 1 pair | Phase 2 |

`npm run lint` reports all of these. `npm run lint:strict` fails on any of
them — the goal is for `lint:strict` to become `lint`.
