import SwiftUI

/// The Vivid motion system — exactly three springs, used everywhere.
/// Coherent timing is what reads as "professional"; ad-hoc curves read as noise.
enum Motion {
    /// Button presses, chip toggles, small state flips.
    static let snappy = Animation.spring(response: 0.25, dampingFraction: 0.80)
    /// Card expansion, tab capsule slide, sheet-like moves.
    static let standard = Animation.spring(response: 0.35, dampingFraction: 0.85)
    /// Large reveals: skill-tree path draw, report score sweep.
    static let gentle = Animation.spring(response: 0.55, dampingFraction: 0.90)

    /// Per-index stagger for list/grid cascades (15ms steps, capped).
    static func stagger(_ index: Int, base: Animation = standard) -> Animation {
        base.delay(Double(min(index, 20)) * 0.015)
    }
}

// MARK: - Reduce-motion aware animation

extension View {
    /// Applies the animation unless the user prefers reduced motion,
    /// in which case state changes fall back to a plain opacity-friendly default.
    func vividAnimation<V: Equatable>(_ animation: Animation, value: V) -> some View {
        modifier(ReduceMotionAnimation(animation: animation, value: value))
    }
}

private struct ReduceMotionAnimation<V: Equatable>: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let animation: Animation
    let value: V

    func body(content: Content) -> some View {
        content.animation(reduceMotion ? .easeInOut(duration: 0.15) : animation, value: value)
    }
}

// MARK: - Pressable: the one press effect for every tappable card/button

extension View {
    /// Scale-down on press + soft haptic. Apply to cards and custom buttons.
    func pressable(scale: CGFloat = 0.97) -> some View {
        modifier(PressableModifier(scale: scale))
    }
}

private struct PressableModifier: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let scale: CGFloat
    @GestureState private var pressed = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(pressed && !reduceMotion ? scale : 1)
            .animation(Motion.snappy, value: pressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .updating($pressed) { _, state, _ in state = true }
            )
            .sensoryFeedback(.impact(flexibility: .soft), trigger: pressed) { old, new in !old && new }
    }
}

// MARK: - Scroll entrance (iOS 17)

extension View {
    /// Cards scale 0.96→1 and fade as they enter the viewport.
    func scrollEntrance() -> some View {
        scrollTransition(.animated(Motion.standard)) { content, phase in
            content
                .opacity(phase.isIdentity ? 1 : 0.25)
                .scaleEffect(phase.isIdentity ? 1 : 0.96)
        }
    }
}
