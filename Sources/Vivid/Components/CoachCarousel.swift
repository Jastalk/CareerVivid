import SwiftUI

/// ONE swipeable coach card replacing the three stacked cards on Home
/// (insight banner + "doing well" + "focus next" currently repeat the same text).
/// Pages: Trend · Strength · Focus. AI-authored text renders through AIText.
struct CoachInsight: Identifiable {
    enum Kind { case trend, strength, focus }
    let id = UUID()
    let kind: Kind
    let title: String
    let body: String    // raw AI text — may contain markdown, AIText handles it

    var icon: String {
        switch kind {
        case .trend: "chart.line.uptrend.xyaxis"
        case .strength: "checkmark.seal.fill"
        case .focus: "target"
        }
    }

    var tint: Color {
        switch kind {
        case .trend: VividTheme.purple
        case .strength: VividTheme.success
        case .focus: VividTheme.warn
        }
    }
}

struct CoachCarousel: View {
    let insights: [CoachInsight]
    @State private var page = 0

    var body: some View {
        VStack(spacing: 10) {
            TabView(selection: $page) {
                ForEach(Array(insights.enumerated()), id: \.element.id) { index, insight in
                    CoachCardView(insight: insight)
                        .tag(index)
                        .padding(.horizontal, 2)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 168)

            // Page dots
            HStack(spacing: 6) {
                ForEach(0..<insights.count, id: \.self) { i in
                    Capsule()
                        .fill(i == page ? VividTheme.purple : Color.primary.opacity(0.15))
                        .frame(width: i == page ? 18 : 6, height: 6)
                        .animation(Motion.snappy, value: page)
                }
            }
        }
        .sensoryFeedback(.selection, trigger: page)
    }
}

private struct CoachCardView: View {
    let insight: CoachInsight
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shimmerPhase: CGFloat = -1

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(insight.title, systemImage: insight.icon)
                .font(VividTheme.Text.caption)
                .foregroundStyle(insight.tint)
                .textCase(.uppercase)
            AIText(raw: insight.body)
                .foregroundStyle(.primary)
                .lineLimit(5)
                .frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(VividTheme.card, in: RoundedRectangle(cornerRadius: VividTheme.cardRadius))
        .overlay {
            // Slow-moving gradient border — the quiet "this is AI" signature.
            RoundedRectangle(cornerRadius: VividTheme.cardRadius)
                .strokeBorder(
                    AngularGradient(
                        colors: [
                            insight.tint.opacity(0.0),
                            insight.tint.opacity(0.45),
                            insight.tint.opacity(0.0),
                        ],
                        center: .center,
                        angle: .degrees(Double(shimmerPhase) * 360)
                    ),
                    lineWidth: 1.5
                )
        }
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                shimmerPhase = 1
            }
        }
    }
}
