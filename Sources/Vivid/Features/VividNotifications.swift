import SwiftUI
import UserNotifications

/// Notification system — the reason to come back.
/// Three local notifications (no server needed to ship v1):
///   1. Report ready       — fired when analysis completes in-app
///   2. Streak reminder    — daily at the user's chosen hour, auto-skipped if done
///   3. Weekly recap       — Sunday evening growth summary
///
/// iOS best practice: NEVER show the system permission dialog cold.
/// Present `NotificationPrimerSheet` first; only call `requestAuthorization`
/// after the user taps "Enable" — a declined system prompt can't be re-shown.
@MainActor
final class VividNotifications: ObservableObject {
    static let shared = VividNotifications()

    @Published var authorized = false

    enum Identifier {
        static let streak = "vivid.streakReminder"
        static let weekly = "vivid.weeklyRecap"
        static let report = "vivid.reportReady"
    }

    func refreshStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorized = settings.authorizationStatus == .authorized
    }

    /// Call ONLY from the primer sheet's Enable button.
    func requestPermission() async {
        let granted = (try? await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        authorized = granted
        if granted { scheduleStreakReminder() ; scheduleWeeklyRecap() }
    }

    // MARK: Schedules

    /// Daily reminder at `hour` (default 19:00). Cancel + reschedule is idempotent.
    func scheduleStreakReminder(hour: Int = 19) {
        cancel(Identifier.streak)
        guard !StreakStore.completedToday else { return } // don't nag after today's rep
        let content = UNMutableNotificationContent()
        content.title = "Your daily rep is waiting"
        content.body = StreakStore.current > 0
            ? "3 minutes keeps your \(StreakStore.current)-day streak alive. 🔥"
            : "One question, three minutes. Start your streak today."
        content.sound = .default
        var date = DateComponents(); date.hour = hour
        let request = UNNotificationRequest(
            identifier: Identifier.streak,
            content: content,
            trigger: UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        )
        UNUserNotificationCenter.current().add(request)
    }

    /// Sunday 18:00 growth recap.
    func scheduleWeeklyRecap() {
        cancel(Identifier.weekly)
        let content = UNMutableNotificationContent()
        content.title = "Your week in review"
        content.body = "See how your interview scores moved this week — and what to focus on next."
        content.sound = .default
        var date = DateComponents(); date.weekday = 1; date.hour = 18
        let request = UNNotificationRequest(
            identifier: Identifier.weekly,
            content: content,
            trigger: UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        )
        UNUserNotificationCenter.current().add(request)
    }

    /// Fire when the AI report finishes while the app is backgrounded.
    func notifyReportReady(score: Int, question: String) {
        let content = UNMutableNotificationContent()
        content.title = "Your report is ready — \(score)/100"
        content.body = question.strippedMarkdown
        content.sound = .default
        let request = UNNotificationRequest(
            identifier: Identifier.report + UUID().uuidString,
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        )
        UNUserNotificationCenter.current().add(request)
    }

    private func cancel(_ id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }
}

// MARK: - Pre-permission primer (shown before the system dialog)

struct NotificationPrimerSheet: View {
    let onEnable: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "bell.badge.fill")
                .font(.system(size: 44))
                .foregroundStyle(VividTheme.purple)
                .padding(.top, 8)
            Text("Stay on your streak")
                .font(VividTheme.Text.page)
            VStack(alignment: .leading, spacing: 12) {
                primerRow(icon: "doc.text.fill", text: "Know the moment your AI report is ready")
                primerRow(icon: "flame.fill", text: "A gentle nudge before your streak breaks — never spam")
                primerRow(icon: "chart.line.uptrend.xyaxis", text: "One weekly recap of how your scores moved")
            }
            .padding(.horizontal, 6)
            Button(action: onEnable) {
                Text("Enable notifications")
                    .font(.system(size: 16, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(VividTheme.purple, in: RoundedRectangle(cornerRadius: 14))
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
            .pressable()
            Button("Maybe later", action: onSkip)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .padding(24)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    private func primerRow(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(VividTheme.purple)
                .frame(width: 30, height: 30)
                .background(VividTheme.purpleSoft, in: RoundedRectangle(cornerRadius: 9))
            Text(text)
                .font(VividTheme.Text.body)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
