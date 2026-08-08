# Vivid (iOS) — Design Review & Motion Plan

Review of the current iOS MVP (screenshots 2026-07-19). Goal: 灵动感 (fluid, alive), less clutter, natural trust, professional UX.

## 1. Naming

Recommendation: **Vivid**.

The app already calls itself Vivid in its own copy ("Vivid will turn real company interviews into a focused challenge path"). One word, memorable, brand-consistent with CareerVivid, and reads as a product rather than a codename.

- App display name: `Vivid`
- App Store title: `Vivid — AI Interview Coach`
- App Store subtitle: `Mock interviews · Skill tree · Real company questions`
- Bundle id: `app.careervivid.vivid` · Source dir: `Sources/Vivid`

Runners-up if Vivid is unavailable on the App Store: `VividPrep`, `Vivid Coach`, `CareerVivid Go`.

## 2. Trust killers to fix first (P0)

1. **Raw markdown leaking into UI.** "Address the core question directly:** …*your growth*…" shows literal `**` and `*` in Focus-next cards, the Home insight banner, and reports. Nothing says "unpolished AI product" faster. Strip or render markdown (AttributedString(markdown:)) at the API boundary — one shared formatter, everywhere.
2. **Score colors don't encode meaning.** 30, 10, 20 all render in the same pink circle. Map score → color (0–39 red, 40–69 amber, 70+ green) and use it consistently in report rows, report header, and company badges (5.5/10 green vs 8/10 pink is currently backwards).
3. **Duplicated coach content on Home.** "Your recent scores are holding steady" banner repeats the exact Focus-next text, then "What you are doing well" and "Focus next" repeat again below. One insight should appear once.
4. **Truncation everywhere.** "Engineering Manage…", "Tell me about the path tha…" — allow 2-line titles: role + company on line 1, question on line 2.
5. **Content scrolls under the status bar.** Add a safe-area material header (ultraThinMaterial + soft shadow on scroll).
6. **🔥 0 day streak** is demotivating. Zero-state: "Practice today to start a streak" with a subdued flame; only light it when ≥1.
7. **Privacy microcopy under the record button**: "Audio is processed securely and never shared." Voice apps earn trust by saying this exactly where the anxiety is.

## 3. De-clutter (structure)

- **Home** → 4 blocks max: greeting · activity card (heatmap + 3 stats merged into ONE card) · ONE swipeable Coach card (insight / doing-well / focus-next as pages with dots) · Recent reports. Everything else goes.
- **Skill Tree setup** → currently one long scroll with 3 numbered sections. Make it a 3-page wizard (Who → Skills → Goal) with a progress bar and one decision per page; "Build my challenge tree" as the only CTA on the last page. Halves perceived effort.
- **Company cards (Mock)** → two lines + score badge collapsed by default; "Interview loop" progress bar only after the first attempt. Card tap expands (spring) to reveal loop + actions instead of showing everything to everyone.
- **Tab bar** → the floating pill currently morphs (label + icon set changes per tab), which is disorienting. Keep a fixed 3-slot pill: Home · Skills · Mock; the ACTIVE slot expands into the orange capsule and slides between slots (liquid-pill, `matchedGeometryEffect`). The mic belongs inside Mock, not as a global 4th mystery button.

## 4. 灵动感 — motion plan (SwiftUI)

Signature moments (do these four first):
1. **Recording orb.** Idle: slow breathing scale (1.0→1.04). Recording: live waveform ring (TimelineView + Canvas sampling mic level) + pulsing concentric rings; timer color shifts amber→red only in the last 15s. Stop: orb collapses into the transcript card (`matchedGeometryEffect`).
2. **Skill tree path.** Draw the connector as one curved Path animated with `.trim` on appear; a progress dot travels along it. Unlock = lock icon pops (spring scale + rotation), node fills with its color, subtle particle burst. Nodes closer together — current spacing wastes 2 screens.
3. **Score count-up.** Report opens: numbers roll with `contentTransition(.numericText())`, metric bars fill left→right staggered 80ms, ring gauges sweep. Success haptic (`.sensoryFeedback(.success)`) when the overall score lands.
4. **Card navigation.** Company card → quest detail and report row → report use `matchedGeometryEffect`/`navigationTransition(.zoom)` (iOS 18) so cards feel like they open, not push.

Ambient polish:
- Heatmap cells cascade in with 15ms stagger; today's cell gently pulses.
- Lists use `.scrollTransition` — cards scale 0.96→1 and fade as they enter.
- All buttons: `.interactiveSpring` press-down to 0.97 + soft haptic.
- Skeleton shimmer for loading states instead of spinners.
- Coach cards get a slow-moving gradient border (AI signature), 8s loop, subtle.
- Respect `accessibilityReduceMotion` everywhere: fall back to opacity fades.

One motion system: define `Motion.swift` with 3 springs (snappy 0.25/0.8, standard 0.35/0.85, gentle 0.5/0.9) and use only those — coherence is what reads as "professional".

## 5. Visual system tightening

- Heatmap uses purple→blue→green mixed hues; switch to a single brand-purple ramp (green reserved for success/today).
- Type ramp: 28 bold (page) / 20 semibold (card) / 15 body / 12 caption — currently card titles and section heads compete.
- Two accent families only: brand purple (actions/AI) + warm orange (primary CTA). Green/red reserved for semantics (score, success, error). The current mix of blue/green/orange/purple chips on one screen dilutes both brands.
- Logos already round ✓ — keep the site-wide rule.

## 6. Trust builders (additive)

- "Built from real company interviews · techinterview.org" attribution ✓ — keep it visible on question cards.
- Report screens: add "How scoring works" disclosure (one sentence + link) under metrics.
- After a finished report, a quiet "Saved automatically" toast — reinforces "every attempt is saved" without the current explainer sentence on Home.
- App Store rating prompt ONLY after a personal-best score moment.

## 7. Suggested execution order

| # | Work | Effort |
|---|------|--------|
| 1 | Markdown formatter + score color semantics + 2-line titles | S |
| 2 | Home de-clutter (merge stats card, Coach carousel) | M |
| 3 | Fixed liquid-pill tab bar | M |
| 4 | Recording orb waveform + collapse transition | M |
| 5 | Skill tree: curved path, trim animation, unlock moment, wizard setup | L |
| 6 | Report count-up + staggered bars + haptics | S |
| 7 | scrollTransition / skeletons / press springs everywhere | M |
| 8 | Rename to Vivid (target, bundle, folder) | S |
