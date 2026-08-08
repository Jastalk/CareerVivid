import SwiftUI

/// 13-week activity heatmap: ONE hue ramp (brand purple) instead of the current
/// purple/blue/green mix; green marks only today. Cells cascade in with a
/// 15ms stagger and today's cell gently pulses.
struct ActivityHeatmap: View {
    /// 13 columns × 7 rows, values 0…4 (intensity), row-major by weekday.
    let weeks: [[Int]]
    let todayIndex: (week: Int, day: Int)?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false
    @State private var pulse = false

    private func cellColor(_ v: Int) -> Color {
        switch v {
        case 0: Color.primary.opacity(0.06)
        case 1: VividTheme.purple.opacity(0.25)
        case 2: VividTheme.purple.opacity(0.45)
        case 3: VividTheme.purple.opacity(0.70)
        default: VividTheme.purple
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 4) {
                ForEach(0..<weeks.count, id: \.self) { w in
                    VStack(spacing: 4) {
                        ForEach(0..<7, id: \.self) { d in
                            let isToday = todayIndex.map { $0 == (w, d) } ?? false
                            RoundedRectangle(cornerRadius: 3.5)
                                .fill(isToday ? VividTheme.success : cellColor(weeks[w][d]))
                                .aspectRatio(1, contentMode: .fit)
                                .scaleEffect(appeared ? (isToday && pulse && !reduceMotion ? 1.18 : 1) : 0.3)
                                .opacity(appeared ? 1 : 0)
                                .animation(Motion.stagger(w * 7 + d, base: Motion.snappy), value: appeared)
                        }
                    }
                }
            }
            HStack(spacing: 5) {
                Text("Less").font(VividTheme.Text.caption).foregroundStyle(.secondary)
                ForEach(0..<5) { v in
                    RoundedRectangle(cornerRadius: 2.5)
                        .fill(cellColor(v))
                        .frame(width: 10, height: 10)
                }
                Text("More").font(VividTheme.Text.caption).foregroundStyle(.secondary)
                Spacer()
                HStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 2.5).fill(VividTheme.success).frame(width: 10, height: 10)
                    Text("Today").font(VividTheme.Text.caption).foregroundStyle(.secondary)
                }
            }
        }
        .onAppear {
            appeared = true
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true).delay(1)) {
                pulse = true
            }
        }
        .accessibilityLabel("Practice activity over the last 13 weeks")
    }
}

/// Stat tile with count-up + a proper streak zero-state
/// ("🔥 0 day streak" demotivates; invite instead of shame).
struct StatTile: View {
    let value: Int
    let label: String
    let icon: String
    let tint: Color
    /// When true and value == 0, shows the invitation state instead of a dead zero.
    var isStreak = false

    @State private var shown = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(isStreak && value == 0 ? Color.secondary : tint)
                .frame(width: 34, height: 34)
                .background((isStreak && value == 0 ? Color.primary.opacity(0.05) : tint.opacity(0.12)),
                            in: RoundedRectangle(cornerRadius: 10))
            if isStreak && value == 0 {
                Text("Start today")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
                Text("practice to light the streak")
                    .font(VividTheme.Text.caption)
                    .foregroundStyle(.tertiary)
            } else {
                Text("\(shown)")
                    .font(VividTheme.Text.stat)
                    .contentTransition(.numericText(value: Double(shown)))
                Text(label)
                    .font(VividTheme.Text.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(VividTheme.card, in: RoundedRectangle(cornerRadius: VividTheme.cardRadius))
        .onAppear { withAnimation(Motion.gentle) { shown = value } }
    }
}
