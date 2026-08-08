import SwiftUI

/// Fixed three-slot floating tab bar. The orange capsule slides between slots
/// (`matchedGeometryEffect`) instead of the bar re-arranging itself per tab —
/// playful motion, predictable structure.
///
/// The mic is NOT a global tab: recording lives inside Mock, where it has context.
enum VividTab: String, CaseIterable, Identifiable {
    case home, skills, mock
    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Home"
        case .skills: "Skills"
        case .mock: "Mock"
        }
    }

    var icon: String {
        switch self {
        case .home: "house.fill"
        case .skills: "point.topleft.down.to.point.bottomright.curvepath.fill"
        case .mock: "mic.fill"
        }
    }
}

struct LiquidTabBar: View {
    @Binding var selection: VividTab
    @Namespace private var capsuleNS

    var body: some View {
        HStack(spacing: 6) {
            ForEach(VividTab.allCases) { tab in
                let isActive = selection == tab
                Button {
                    withAnimation(Motion.standard) { selection = tab }
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 17, weight: .semibold))
                        if isActive {
                            Text(tab.title)
                                .font(.system(size: 16, weight: .bold))
                                .transition(.opacity.combined(with: .move(edge: .trailing)))
                        }
                    }
                    .foregroundStyle(isActive ? .white : .secondary)
                    .padding(.horizontal, isActive ? 22 : 16)
                    .frame(height: 52)
                    .background {
                        if isActive {
                            Capsule()
                                .fill(
                                    LinearGradient(
                                        colors: [VividTheme.orange, VividTheme.orangeDeep],
                                        startPoint: .top, endPoint: .bottom
                                    )
                                )
                                .matchedGeometryEffect(id: "activeCapsule", in: capsuleNS)
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.title)
                .accessibilityAddTraits(isActive ? [.isSelected] : [])
            }
        }
        .padding(6)
        .background(.regularMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(VividTheme.stroke))
        .shadow(color: .black.opacity(0.10), radius: 18, y: 8)
        .sensoryFeedback(.selection, trigger: selection)
        .padding(.horizontal, 40)
    }
}

/// Safe-area-aware page header: content no longer scrolls under the clock.
/// Wrap each root screen's ScrollView with `.vividHeader(title:)`.
extension View {
    func vividHeader(_ title: String) -> some View {
        safeAreaInset(edge: .top, spacing: 0) {
            Text(title)
                .font(.system(size: 17, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
        }
    }
}
