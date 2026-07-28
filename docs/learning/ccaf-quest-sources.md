# CCA-F quest — question sources

The 3D quest at `/learning/ccaf-quest` adapts community study material for the
**Claude Certified Architect – Foundations** exam.

The five repos are registered in [`data/learning/sources.json`](../../data/learning/sources.json)
under module `ccaf-quest`, so they use the same tooling as every other
third-party learning source. To pull the usable ones locally:

```bash
node scripts/sync-learning-sources.mjs --id daronyondem-ccaf-exam-guide
```

They land in `third_party/learning-sources/<id>/` (gitignored), and each repo's
LICENSE is copied into `third_party/learning-sources/LICENSES/` (committed).
Omit `--id` to sync every downloadable source in the registry.

## Usable — licences permit reuse with attribution

| Source id | Licence | Used for |
|---|---|---|
| `avidevelops-ccaf-exam-prep` | CC BY 4.0 | Domains 1–2. 33 fully-explained questions; English question text, rationales, and takeaways reproduced verbatim. |
| `daronyondem-ccaf-exam-guide` | CC BY 4.0 | Domain 3, from §10 "Claude Code and Claude Agent SDK Workflows" + practice scenario 10. Mostly prose, so scenarios and distractors are ours, written to match its stated rationales. |
| `jamesbuckett-ccaf-practical` | MIT | Cloned and licence-cleared, not yet drawn on. |

CC BY 4.0 requires attribution **and** an indication of changes where material
was adapted. Both are carried in the header of
[`src/lib/ccafMissions.ts`](../../src/lib/ccafMissions.ts) and surfaced to users
in the mission dialog and page footers — keep them in sync if sources change.

## Not usable

`olivieralter-ccaf-exam` and `dnacenta-ccaf-study-guide` have no LICENSE file,
so all rights are reserved by default. Both are registered with
`downloadable: false` and are never cloned. No question text from either has
been copied.

The OlivierAlter README is still the reference for the **official domain split
and weights** below — facts, not expression.

## Exam domains and shipping status

| # | Domain | Weight | Status |
|---|---|---|---|
| 1 | Agentic Architecture & Orchestration | 27% | ✅ 13 missions, 14 steps |
| 2 | Tool Design & MCP Integration | 18% | ✅ 9 missions, 10 steps |
| 3 | Claude Code Configuration & Workflows | 20% | ✅ 8 missions, 9 steps |
| 4 | Prompt Engineering & Structured Output | 20% | ✅ 8 missions, 9 steps |
| 5 | Context Management & Reliability | 15% | ✅ 7 missions, 8 steps |

**All five domains ship: 45 missions, 50 question steps, 6580 XP, 100% of the
exam weight.** The domain split and weights are corroborated by two independent
sources (the OlivierAlter README and claudecertifiedarchitects.com), which agree
on both names and percentages while ordering them differently.

`readiness()` in `src/lib/questSource.ts` weights against the full 100%, so the
35% not yet built counts against the score rather than being hidden.

### Where each domain's material came from

- **Domain 1–2** — avidevelops Q7–Q13, Q15–Q18, Q20–Q25, Q27–Q28, Q31, Q33.
- **Domain 3** — daronyondem §10 + practice scenario 10.
- **Domain 4** — daronyondem practice scenarios 1, 4, 6 and §6
  (Principles vs Conditionals); avidevelops Q1, Q4, Q5, Q6, Q30.
- **Domain 5** — daronyondem practice scenarios 5, 13, §5 (Tool Result
  Compression) and §13 (Designing for Cache Stability); avidevelops Q19, Q26,
  Q29, Q32.

Where the upstream entry records no enumerated options (avidevelops Q29, and
every daronyondem prose section), the distractors are CareerVivid's, written to
match the rationale the source states. CC BY 4.0 requires that adaptation be
indicated; the `ccafMissions.ts` header and each step's `sourceQuestion` do so.

Still unused from avidevelops: Q2, Q3, Q14 (batch scheduling and business-rule
enforcement) — held back because domains 1 and 2 already cover batch recovery
and deterministic enforcement, and repeating them would pad rather than teach.

Adding a domain is data-only: append to `CCAF_DOMAINS` and the city grows a new
district automatically. Marker positions are derived in `questLayout.ts`, never
hand-placed. `LEVEL_THRESHOLDS` tops out at 6000, just under the 6220 XP now
available, so full completion lands on the final level.

## Coverage checked against claudecertifiedarchitects.com

`claudecertifiedarchitects.com` is an independent commercial CCA-F practice
site (© 2026 CCA Practice Platforms; its 400-question bank sits behind a
paywall and is not public). Its **domain blueprint** — names, weights, and
per-domain topic lists — is factual, agrees with the OlivierAlter README on
both names and percentages, and was used as a coverage checklist. Its
**practice questions are its own copyrighted commercial content and none has
been copied here**; every question in this course traces to a CC BY 4.0 source
via its `sourceQuestion` field.

That checklist did surface one genuine gap. The site calls the agentic loop
lifecycle "the most fundamental concept in this domain", and domain 1 had no
question on it at all. Three missions were added from daronyondem §8 and §12:

- `read-the-signal` — terminating on `stop_reason` rather than parsing prose
  or relying on an iteration cap.
- `two-truncations` — `max_tokens` vs `model_context_window_exceeded` vs
  `refusal`, none of which survives an unchanged retry.
- `dont-delegate` — when the coordinator should just do the work itself.

Those also fixed a proportionality problem: domain 1 is 27% of the exam but was
only 24% of the missions. It is now 13 of 45 (29%).

Their SPIDER / CALM / PRECISE / C-T-L mnemonics are that site's own teaching
devices, not exam content, and are deliberately not reproduced.
