import SwiftUI

/// Vivid design tokens — one source of truth for color semantics and type.
///
/// Rules this file enforces (from docs/mobile-design-review.md):
///  - Two accent families only: brand purple (actions/AI) + warm orange (primary CTA).
///  - Green/red are SEMANTIC (score, success, error) — never decorative.
///  - Score color is a function of the value, identical on every screen.
enum VividTheme {

    // MARK: Brand

    static let purple = Color(red: 0.42, green: 0.36, blue: 0.90)      // actions, AI, active states
    static let purpleSoft = Color(red: 0.42, green: 0.36, blue: 0.90).opacity(0.10)
    static let orange = Color(red: 0.98, green: 0.55, blue: 0.15)      // primary CTA only
    static let orangeDeep = Color(red: 0.95, green: 0.42, blue: 0.10)

    // MARK: Surfaces

    static let background = Color(UIColor.systemGroupedBackground)
    static let card = Color(UIColor.secondarySystemGroupedBackground)
    static let stroke = Color.primary.opacity(0.07)

    // MARK: Semantic

    static let success = Color(red: 0.08, green: 0.50, blue: 0.24)
    static let successSoft = Color(red: 0.08, green: 0.50, blue: 0.24).opacity(0.12)
    static let warn = Color(red: 0.85, green: 0.56, blue: 0.10)
    static let warnSoft = Color(red: 0.85, green: 0.56, blue: 0.10).opacity(0.12)
    static let danger = Color(red: 0.75, green: 0.20, blue: 0.30)
    static let dangerSoft = Color(red: 0.75, green: 0.20, blue: 0.30).opacity(0.12)

    /// Score → color, the SAME mapping everywhere (report rows, headers, badges).
    /// 0–39 danger · 40–69 warn · 70+ success.
    static func scoreColor(_ score: Int, outOf maxScore: Int = 100) -> Color {
        let pct = maxScore > 0 ? Double(score) / Double(maxScore) : 0
        switch pct {
        case ..<0.40: return danger
        case ..<0.70: return warn
        default: return success
        }
    }

    static func scoreSoftColor(_ score: Int, outOf maxScore: Int = 100) -> Color {
        scoreColor(score, outOf: maxScore).opacity(0.13)
    }

    // MARK: Type ramp — four sizes, no in-betweens.

    enum Text {
        static let page = Font.system(size: 28, weight: .bold)         // screen title
        static let card = Font.system(size: 20, weight: .semibold)     // card title
        static let body = Font.system(size: 15, weight: .regular)
        static let caption = Font.system(size: 12, weight: .semibold)
        static let stat = Font.system(size: 30, weight: .bold, design: .rounded)
    }

    // MARK: Shape

    static let cardRadius: CGFloat = 20
    static let chipRadius: CGFloat = 12
}
