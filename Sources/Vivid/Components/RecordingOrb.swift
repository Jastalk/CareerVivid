import SwiftUI

/// The recording orb — Vivid's signature interaction.
///
/// Idle:      slow breathing (1.0 → 1.04) that invites the tap.
/// Recording: a live waveform ring driven by mic level + soft pulse rings.
/// Timer:     neutral → amber at 25% remaining → red at 10% (red is a warning,
///            not the default: a red "0:06" reads as an error).
///
/// Feed `level` (0…1) from your AVAudioRecorder metering at ~20 Hz.
struct RecordingOrb: View {
    enum Phase { case idle, recording, done }

    let phase: Phase
    let level: CGFloat              // live mic level 0…1 (ignored unless .recording)
    let elapsed: TimeInterval
    let limit: TimeInterval         // e.g. 90
    let onTap: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var breathing = false
    @State private var history: [CGFloat] = Array(repeating: 0.08, count: 48)

    private var remainingFraction: Double { max(0, 1 - elapsed / max(limit, 1)) }

    private var timerColor: Color {
        switch remainingFraction {
        case ..<0.10: return VividTheme.danger
        case ..<0.25: return VividTheme.warn
        default: return .secondary
        }
    }

    private var orbColor: Color {
        switch phase {
        case .idle: return VividTheme.purple
        case .recording: return VividTheme.success
        case .done: return VividTheme.purple
        }
    }

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                // Pulse rings while recording
                if phase == .recording && !reduceMotion {
                    PulseRing(color: orbColor, delay: 0)
                    PulseRing(color: orbColor, delay: 0.8)
                }

                // Waveform ring: 48 bars around the orb, animated by mic level history
                WaveformRing(samples: history, color: orbColor)
                    .frame(width: 190, height: 190)
                    .opacity(phase == .recording ? 1 : 0.25)

                // Progress ring (time used)
                Circle()
                    .trim(from: 0, to: elapsed / max(limit, 1))
                    .stroke(timerColor.opacity(0.9), style: StrokeStyle(lineWidth: 5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: 210, height: 210)
                    .animation(.linear(duration: 0.2), value: elapsed)

                // The orb
                Button(action: onTap) {
                    ZStack {
                        Circle()
                            .fill(
                                RadialGradient(
                                    colors: [orbColor.opacity(0.95), orbColor],
                                    center: .topLeading, startRadius: 10, endRadius: 150
                                )
                            )
                        VStack(spacing: 6) {
                            Image(systemName: phase == .recording ? "stop.fill" : "mic.fill")
                                .font(.system(size: 30, weight: .semibold))
                            Text(phase == .recording ? "Tap to stop" : phase == .done ? "Record again" : "Tap to record")
                                .font(.system(size: 14, weight: .bold))
                        }
                        .foregroundStyle(.white)
                    }
                }
                .buttonStyle(.plain)
                .frame(width: 150, height: 150)
                .scaleEffect(phase == .idle && breathing && !reduceMotion ? 1.04 : 1.0)
                .shadow(color: orbColor.opacity(0.35), radius: 24, y: 10)
                .sensoryFeedback(.impact(weight: .medium), trigger: phase == .recording)
            }
            .frame(width: 230, height: 230)

            // Timer + privacy line (trust lives next to the anxiety)
            VStack(spacing: 4) {
                Text(timeString(elapsed))
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(timerColor)
                    .contentTransition(.numericText(value: elapsed))
                Label("Audio is processed securely and never shared", systemImage: "lock.fill")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.tertiary)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 2.4).repeatForever(autoreverses: true)) {
                breathing = true
            }
        }
        .onChange(of: level) { _, newLevel in
            guard phase == .recording else { return }
            history.removeFirst()
            history.append(max(0.08, min(1, newLevel)))
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(phase == .recording ? "Recording, \(timeString(elapsed)) elapsed. Tap to stop." : "Tap to record your answer")
    }

    private func timeString(_ t: TimeInterval) -> String {
        let s = Int(t)
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}

/// 48 radial bars whose length follows the mic-level history — the voice made visible.
private struct WaveformRing: View {
    let samples: [CGFloat]
    let color: Color

    var body: some View {
        Canvas { context, size in
            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            let innerRadius = min(size.width, size.height) / 2 - 22
            let count = samples.count
            for i in 0..<count {
                let angle = (Double(i) / Double(count)) * 2 * .pi - .pi / 2
                let magnitude = 4 + samples[i] * 18
                let from = CGPoint(
                    x: center.x + cos(angle) * innerRadius,
                    y: center.y + sin(angle) * innerRadius
                )
                let to = CGPoint(
                    x: center.x + cos(angle) * (innerRadius + magnitude),
                    y: center.y + sin(angle) * (innerRadius + magnitude)
                )
                var path = Path()
                path.move(to: from)
                path.addLine(to: to)
                context.stroke(
                    path,
                    with: .color(color.opacity(0.35 + samples[i] * 0.65)),
                    style: StrokeStyle(lineWidth: 3, lineCap: .round)
                )
            }
        }
        .animation(.linear(duration: 0.05), value: samples)
    }
}

/// Soft expanding ring behind the orb while recording.
private struct PulseRing: View {
    let color: Color
    let delay: Double
    @State private var animate = false

    var body: some View {
        Circle()
            .stroke(color.opacity(0.35), lineWidth: 2)
            .frame(width: 150, height: 150)
            .scaleEffect(animate ? 1.55 : 1)
            .opacity(animate ? 0 : 0.8)
            .onAppear {
                withAnimation(.easeOut(duration: 1.8).repeatForever(autoreverses: false).delay(delay)) {
                    animate = true
                }
            }
    }
}
