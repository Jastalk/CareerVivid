# Vivid Polish Kit — Integration Guide

Drop the `Sources/Vivid/` folder into the Xcode project (File → Add Files, "Create groups").
Zero external dependencies. Baseline: iOS 17.

## Rename first

Target name → `Vivid` · Display Name → `Vivid` · Bundle ID → `app.careervivid.vivid`.
App Store title: **Vivid — AI Interview Coach**.

## Screen-by-screen swap map

### Every screen with AI text (P0 — do this first)
```swift
// BEFORE: Text(insight.body)         → shows raw ** and * asterisks
AIText(raw: insight.body)             // renders markdown properly
Text(insight.body.strippedMarkdown)   // for truncated previews
```

### Home
```swift
ScrollView {
    ActivityHeatmap(weeks: viewModel.weeks, todayIndex: viewModel.today)
    HStack(spacing: 10) {
        StatTile(value: 85, label: "reports", icon: "doc.text.fill", tint: VividTheme.purple)
        StatTile(value: 0, label: "day streak", icon: "flame.fill", tint: VividTheme.orange, isStreak: true)
        StatTile(value: 48, label: "average", icon: "chart.line.uptrend.xyaxis", tint: VividTheme.success)
    }
    CoachCarousel(insights: [   // replaces the 3 stacked repeating cards
        .init(kind: .trend, title: "Trend", body: trendText),
        .init(kind: .strength, title: "Doing well", body: strengthText),
        .init(kind: .focus, title: "Focus next", body: focusText),
    ])
    ForEach(Array(reports.enumerated()), id: \.element.id) { i, r in
        ReportRow(score: r.score, roleAndCompany: r.title, question: r.question,
                  date: r.date, index: i) { open(r) }
    }
}
.vividHeader("Your practice")   // content no longer scrolls under the clock
```

### Tab bar (replace the morphing pill)
```swift
@State private var tab: VividTab = .home
ZStack(alignment: .bottom) {
    content(for: tab)
    LiquidTabBar(selection: $tab)
}
```

### Recording screen
```swift
RecordingOrb(
    phase: recorder.isRecording ? .recording : (hasTranscript ? .done : .idle),
    level: recorder.normalizedLevel,   // 0…1 from updateMeters() at ~20 Hz
    elapsed: recorder.elapsed,
    limit: 90,
    onTap: toggleRecording
)
```
Mic level feed:
```swift
recorder.isMeteringEnabled = true
// on a 0.05s timer:
recorder.updateMeters()
let db = recorder.averagePower(forChannel: 0)          // -160…0
normalizedLevel = CGFloat(max(0, (db + 50) / 50))      // clamp to 0…1
```

### Report metrics
```swift
MetricBar(title: "Communication", subtitle: "Clarity, structure, and pacing", value: 30, index: 0)
MetricBar(title: "Confidence", subtitle: "Presence and specificity", value: 25, index: 1)
MetricBar(title: "Answer relevance", subtitle: "Connection to this question", value: 10, index: 2)
```

### Skill tree
```swift
SkillTreePath(nodes: [
    .init(id: "story", title: "Tell your engineering story", icon: "person.wave.2.fill",
          tint: VividTheme.purple, state: .active),
    .init(id: "cloud", title: "Design for cloud scale", icon: "cloud.fill",
          tint: .blue, state: .locked),
    // …
], onTap: startChallenge)
```
Setup flow: split the current single scroll into a 3-page `TabView(.page)` wizard —
Who → Skills → Goal — one decision per page, "Build my challenge tree" only on page 3.

### Loading states
```swift
if loading { ForEach(0..<3) { _ in SkeletonRow() } }
yourCard.skeleton(isLoadingDetail)
```

### Universal modifiers
```swift
.pressable()        // press spring + soft haptic on any tappable card
.scrollEntrance()   // scale/fade as cards enter the viewport
.vividAnimation(Motion.standard, value: state)   // reduce-motion aware
```

## Tier-1 features (Sources/Vivid/Features/)

### Growth loop — report screen
```swift
// Conform your report model:
extension InterviewReport: PracticeAttempt {}   // needs: score: Int, date: Date

// Top of the report view, when the question has history:
AttemptGrowthCard(attempts: attemptsForThisQuestion) {
    startInterview(question: report.question)   // one-tap retry
}
```

### Daily Rep — top of Home
```swift
let today = DailyRepPicker.questionFor(bank: questionBank,
                                       targetCompany: profile.targetCompany)
if let today {
    DailyRepCard(
        question: today,
        streak: StreakStore.current,
        completedToday: StreakStore.completedToday,
        onStart: { startInterview(dailyQuestion: today) }
    )
}
// When the daily question's report completes:
let newStreak = StreakStore.markCompleted()
VividNotifications.shared.scheduleStreakReminder()   // re-arm for tomorrow
```

### Notifications
```swift
// App launch:
Task { await VividNotifications.shared.refreshStatus() }

// After the user's FIRST completed report (best moment to ask):
.sheet(isPresented: $showNotifPrimer) {
    NotificationPrimerSheet(
        onEnable: { Task { await VividNotifications.shared.requestPermission() } },
        onSkip: { showNotifPrimer = false }
    )
}

// Report finishes while backgrounded:
VividNotifications.shared.notifyReportReady(score: 72, question: q.prompt)
```

### Privacy Center
```swift
// Settings / profile menu:
NavigationLink("Privacy") {
    PrivacyCenterView(onExportData: exportData, onDeleteAccount: deleteAccount)
}

// BEFORE the first-ever recording (then trigger the system mic dialog):
.sheet(isPresented: $showMicPrimer) {
    MicPermissionPrimer(onContinue: requestMicAndRecord,
                        onViewPrivacy: { showPrivacy = true })
}
```

## Info.plist keys (required)

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Vivid records your voice only while you answer a practice question. Audio is transcribed for AI feedback and the raw recording is deleted.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>Used to show your live transcript while you answer.</string>
```

## App Store Privacy Nutrition Label (answers)

| Data | Collected? | Linked to user | Tracking |
|---|---|---|---|
| Audio Data | Yes (transient — deleted after transcription) | Yes | No |
| User Content (transcripts, reports) | Yes | Yes | No |
| Identifiers (user ID) | Yes | Yes | No |
| Usage Data (streak, activity) | Yes | Yes | No |
| Contact Info (email) | Yes | Yes | No |

Also required for review: account deletion reachable in-app (PrivacyCenterView provides it) and a working privacy-policy URL (careervivid.app/privacy).

## The rules that keep it professional

1. Only `Motion.snappy / .standard / .gentle` — never inline spring parameters.
2. Score colors only via `VividTheme.scoreColor` — no hand-picked reds/greens.
3. Every AI string through `AIText` / `.strippedMarkdown` — no exceptions.
4. Orange = primary CTA only; purple = actions/AI; green/red = semantics only.
5. Every animated view honors Reduce Motion (the kit's components already do).
