import SwiftUI

/// Shimmering skeleton placeholders — loading states that feel alive
/// instead of a centered spinner.
extension View {
    /// Replaces content with a shimmering silhouette while `isLoading` is true.
    func skeleton(_ isLoading: Bool) -> some View {
        redacted(reason: isLoading ? .placeholder : [])
            .modifier(ShimmerModifier(active: isLoading))
            .allowsHitTesting(!isLoading)
    }
}

private struct ShimmerModifier: ViewModifier {
    let active: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var phase: CGFloat = -1.2

    func body(content: Content) -> some View {
        content
            .overlay {
                if active && !reduceMotion {
                    GeometryReader { geo in
                        LinearGradient(
                            colors: [.clear, .white.opacity(0.45), .clear],
                            startPoint: .leading, endPoint: .trailing
                        )
                        .frame(width: geo.size.width * 0.6)
                        .offset(x: geo.size.width * phase)
                        .blendMode(.plusLighter)
                    }
                    .clipped()
                    .onAppear {
                        withAnimation(.linear(duration: 1.3).repeatForever(autoreverses: false)) {
                            phase = 1.2
                        }
                    }
                }
            }
    }
}

/// Ready-made skeleton row for report/company lists.
struct SkeletonRow: View {
    var body: some View {
        HStack(spacing: 12) {
            Circle().fill(Color.primary.opacity(0.08)).frame(width: 52, height: 52)
            VStack(alignment: .leading, spacing: 8) {
                RoundedRectangle(cornerRadius: 5).fill(Color.primary.opacity(0.08))
                    .frame(width: 170, height: 14)
                RoundedRectangle(cornerRadius: 5).fill(Color.primary.opacity(0.06))
                    .frame(width: 120, height: 11)
            }
            Spacer()
        }
        .padding(16)
        .background(VividTheme.card, in: RoundedRectangle(cornerRadius: VividTheme.cardRadius))
        .skeleton(true)
    }
}
