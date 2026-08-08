import SwiftUI

/// Daily Rep — one question a day, three minutes, streak fuel.
/// The phone is a habit device; this is the supply the streak UI was missing.

struct DailyQuestion: Identifiable, Codable, Equatable {
    var id: String
    var company: String          // "Google"
    var category: String         // "Behavioral"
    var prompt: String
}

enum DailyRepPicker {
    /// Deterministic pick: same question all day, changes at midnight,
    /// prefers the user's target company, never repeats yesterday's.
    static func questionFor(
        date: Date = .now,
        bank: [DailyQuestion],
        targetCompany: String? = nil
    ) -> DailyQuestion? {
        guard !bank.isEmpty else { return nil }
        let preferred = targetCompany.map { target in
            bank.filter { $0.company.caseInsensitiveCompare(target) == .orderedSame }
        }.flatMap { $0.isEmpty ? nil : $0 } ?? bank

        let day = Calendar.current.ordinality(of: .day, in: .era, for: date) ?? 0
        let today = preferred[day % preferred.count]
        let yesterday = preferred[(day - 1 + preferred.count) % preferred.count]
        if today == yesterday && preferred.count > 1 {
            return preferred[(day + 1) % preferred.count]
        }
        return today
    }
}

/// Hero card for the top of Home. Two states: today's rep waiting / completed.
struct DailyRepCard: View {
    let question: DailyQuestion
    let streak: Int
    let completedToday: Bool
    let onStart: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var glow = false

    var body: some View {
        Button(action: completedToday ? {} : onStart) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Label("Daily Rep", systemImage: completedToday ? "checkmark.seal.fill" : "bolt.fill")
                        .font(VividTheme.Text.caption)
                        .textCase(.uppercase)
                        .foregroundStyle(completedToday ? VividTheme.success : .white.opacity(0.9))
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill")
                        Text("\(streak)")
                            .contentTransition(.numericText(value: Double(streak)))
                    }
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(completedToday ? VividTheme.orange : .white)
                    .opacity(streak > 0 || completedToday ? 1 : 0.5)
                }

                if completedToday {
                    Text("Done for today — streak protected. 🔥")
                        .font(VividTheme.Text.card)
                        .foregroundStyle(.primary)
                    Text("Come back tomorrow for a fresh \(question.company)-style question.")
                        .font(VividTheme.Text.body)
                        .foregroundStyle(.secondary)
                } else {
                    Text(question.prompt.strippedMarkdown)
                        .font(VividTheme.Text.card)
                        .foregroundStyle(.white)
                        .lineLimit(3)
                        .multilineTextAlignment(.leading)
                    HStack(spacing: 8) {
                        chip("\(question.company) · \(question.category)")
                        chip("~3 min · voice")
                        Spacer()
                        Label("Start", systemImage: "mic.fill")
                            .font(.system(size: 14, weight: .black))
                            .foregroundStyle(VividTheme.purple)
                            .padding(.horizontal, 14).padding(.vertical, 8)
                            .background(.white, in: Capsule())
                    }
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                if completedToday {
                    RoundedRectangle(cornerRadius: VividTheme.cardRadius)
                        .fill(VividTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: VividTheme.cardRadius)
                            .strokeBorder(VividTheme.success.opacity(0.35), lineWidth: 1.5))
                } else {
                    RoundedRectangle(cornerRadius: VividTheme.cardRadius)
                        .fill(
                            LinearGradient(
                                colors: [VividTheme.purple, Color(red: 0.30, green: 0.24, blue: 0.70)],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            )
                        )
                        .shadow(color: VividTheme.purple.opacity(glow && !reduceMotion ? 0.45 : 0.25),
                                radius: glow ? 22 : 14, y: 8)
                }
            }
        }
        .buttonStyle(.plain)
        .pressable()
        .disabled(completedToday)
        .onAppear {
            withAnimation(.easeInOut(duration: 2.6).repeatForever(autoreverses: true)) { glow = true }
        }
        .accessibilityLabel(completedToday
            ? "Daily rep completed. Streak \(streak) days."
            : "Daily rep: \(question.prompt.strippedMarkdown). About three minutes. Tap to start.")
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(.white.opacity(0.95))
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(.white.opacity(0.16), in: Capsule())
    }
}

/// Streak bookkeeping in UserDefaults (swap for Firestore once accounts sync).
struct StreakStore {
    private static let lastDayKey = "vivid.dailyRep.lastDay"
    private static let streakKey = "vivid.dailyRep.streak"

    static var current: Int { UserDefaults.standard.integer(forKey: streakKey) }

    static var completedToday: Bool {
        guard let last = UserDefaults.standard.object(forKey: lastDayKey) as? Date else { return false }
        return Calendar.current.isDateInToday(last)
    }

    /// Call when today's rep finishes. Returns the new streak.
    @discardableResult
    static func markCompleted(on date: Date = .now) -> Int {
        let defaults = UserDefaults.standard
        let last = defaults.object(forKey: lastDayKey) as? Date
        var streak = defaults.integer(forKey: streakKey)
        if let last, Calendar.current.isDateInToday(last) {
            return streak // already counted today
        }
        if let last, Calendar.current.isDateInYesterday(last) {
            streak += 1   // consecutive day
        } else {
            streak = 1    // fresh start (or broken chain)
        }
        defaults.set(date, forKey: lastDayKey)
        defaults.set(streak, forKey: streakKey)
        return streak
    }
}
