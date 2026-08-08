import SwiftUI

/// Tier-1 retention feature: make growth VISIBLE.
/// Every attempt is already saved — these views turn that archive into the
/// product's proof of value: "10 → 30 ↑20".
///
/// Model-agnostic: conform your existing report model to `PracticeAttempt`.
protocol PracticeAttempt: Identifiable {
    var score: Int { get }          // 0–100
    var date: Date { get }
}

// MARK: - Growth delta badge ("10 → 30 ↑20")

struct GrowthDeltaBadge: View {
    let previous: Int
    let current: Int

    private var delta: Int { current - previous }

    var body: some View {
        HStack(spacing: 6) {
            Text("\(previous)")
                .foregroundStyle(.secondary)
            Image(systemName: "arrow.right")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.tertiary)
            Text("\(current)")
                .foregroundStyle(VividTheme.scoreColor(current))
            if delta != 0 {
                Text("\(delta > 0 ? "↑" : "↓")\(abs(delta))")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(delta > 0 ? VividTheme.success : VividTheme.danger)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(
                        (delta > 0 ? VividTheme.successSoft : VividTheme.dangerSoft),
                        in: Capsule()
                    )
            }
        }
        .font(.system(size: 17, weight: .bold, design: .rounded))
        .monospacedDigit()
        .accessibilityLabel("Score changed from \(previous) to \(current)")
    }
}

// MARK: - Attempt sparkline (all tries of one question)

struct AttemptSparkline: View {
    let scores: [Int]           // chronological
    var height: CGFloat = 44

    var body: some View {
        GeometryReader { geo in
            let maxScore = 100.0
            let stepX = scores.count > 1 ? geo.size.width / CGFloat(scores.count - 1) : 0
            let points = scores.enumerated().map { i, s in
                CGPoint(x: CGFloat(i) * stepX,
                        y: geo.size.height * (1 - CGFloat(Double(s) / maxScore)))
            }
            ZStack {
                // Line
                Path { p in
                    guard let first = points.first else { return }
                    p.move(to: first)
                    points.dropFirst().forEach { p.addLine(to: $0) }
                }
                .stroke(VividTheme.purple, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                // Dots, best attempt highlighted
                ForEach(Array(points.enumerated()), id: \.offset) { i, pt in
                    Circle()
                        .fill(scores[i] == scores.max() ? VividTheme.success : VividTheme.purple)
                        .frame(width: i == points.count - 1 ? 9 : 6, height: i == points.count - 1 ? 9 : 6)
                        .position(pt)
                }
            }
        }
        .frame(height: height)
        .accessibilityLabel("Attempt scores: \(scores.map(String.init).joined(separator: ", "))")
    }
}

// MARK: - Growth card for the report screen

/// Place at the TOP of a report when the question has prior attempts.
/// Shows the delta, the sparkline, and the one-tap Retry — the loop that
/// turns a single practice into a habit.
struct AttemptGrowthCard<A: PracticeAttempt>: View {
    /// All attempts of THIS question, chronological (current attempt last).
    let attempts: [A]
    let onRetry: () -> Void

    private var scores: [Int] { attempts.map(\.score) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Your growth on this question", systemImage: "chart.line.uptrend.xyaxis")
                    .font(VividTheme.Text.caption)
                    .foregroundStyle(VividTheme.purple)
                    .textCase(.uppercase)
                Spacer()
                Text("\(attempts.count) attempts")
                    .font(VividTheme.Text.caption)
                    .foregroundStyle(.secondary)
            }

            if scores.count >= 2 {
                GrowthDeltaBadge(previous: scores[scores.count - 2], current: scores[scores.count - 1])
                AttemptSparkline(scores: scores)
                if let best = scores.max(), scores.last == best, scores.count > 1 {
                    Label("Personal best — this is the moment to keep going", systemImage: "trophy.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(VividTheme.warn)
                }
            } else {
                Text("First attempt recorded. Retry after reading the feedback — most users gain 15+ points on try two.")
                    .font(VividTheme.Text.body)
                    .foregroundStyle(.secondary)
            }

            Button(action: onRetry) {
                Label("Retry this question", systemImage: "arrow.counterclockwise")
                    .font(.system(size: 15, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        LinearGradient(colors: [VividTheme.orange, VividTheme.orangeDeep],
                                       startPoint: .top, endPoint: .bottom),
                        in: RoundedRectangle(cornerRadius: 14)
                    )
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
            .pressable()
        }
        .padding(16)
        .background(VividTheme.card, in: RoundedRectangle(cornerRadius: VividTheme.cardRadius))
    }
}
