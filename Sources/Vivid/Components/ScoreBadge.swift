import SwiftUI

/// Score circle with SEMANTIC color (0–39 red · 40–69 amber · 70+ green)
/// and a rolling count-up. Replaces the all-pink circles on report rows.
struct ScoreBadge: View {
    let score: Int
    var maxScore: Int = 100
    var size: CGFloat = 52

    @State private var shown = 0

    private var color: Color { VividTheme.scoreColor(score, outOf: maxScore) }

    var body: some View {
        ZStack {
            Circle()
                .fill(VividTheme.scoreSoftColor(score, outOf: maxScore))
            Circle()
                .trim(from: 0, to: CGFloat(shown) / CGFloat(max(maxScore, 1)))
                .stroke(color, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(shown)")
                .font(.system(size: size * 0.36, weight: .bold, design: .rounded))
                .foregroundStyle(color)
                .contentTransition(.numericText(value: Double(shown)))
        }
        .frame(width: size, height: size)
        .onAppear {
            withAnimation(Motion.gentle) { shown = score }
        }
        .sensoryFeedback(.success, trigger: shown) { _, new in
            new == score && Double(score) / Double(max(maxScore, 1)) >= 0.7
        }
        .accessibilityLabel("Score \(score) out of \(maxScore)")
    }
}

/// Horizontal metric bar with staggered fill — for report breakdown rows
/// (Communication / Confidence / Answer relevance).
struct MetricBar: View {
    let title: String
    let subtitle: String
    let value: Int          // 0–100
    var index: Int = 0      // stagger position

    @State private var fill: CGFloat = 0

    private var color: Color { VividTheme.scoreColor(value) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(VividTheme.Text.card)
                    Text(subtitle).font(VividTheme.Text.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Text("\(value)%")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(VividTheme.scoreSoftColor(value), in: Capsule())
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.primary.opacity(0.06))
                    Capsule()
                        .fill(color)
                        .frame(width: geo.size.width * fill)
                }
            }
            .frame(height: 7)
        }
        .padding(16)
        .background(VividTheme.card, in: RoundedRectangle(cornerRadius: VividTheme.cardRadius))
        .onAppear {
            withAnimation(Motion.stagger(index, base: Motion.gentle)) {
                fill = CGFloat(value) / 100
            }
        }
    }
}
