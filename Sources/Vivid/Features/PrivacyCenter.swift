import SwiftUI

/// Privacy Center — the trust page App Review looks for and users deserve.
/// Covers the three highest-rejection-rate items:
///   • Guideline 5.1.1: clear mic/data usage disclosure
///   • Guideline 5.1.1(v): in-app account deletion
///   • Data retention policy in plain language
///
/// Link it from Settings AND from the small lock line under the recording orb.
struct PrivacyCenterView: View {
    /// Wire these to your real actions.
    let onExportData: () -> Void
    let onDeleteAccount: () -> Void

    @State private var confirmingDelete = false

    var body: some View {
        List {
            // What we collect
            Section {
                privacyRow(icon: "mic.fill", tint: VividTheme.purple,
                           title: "Your voice recordings",
                           body: "Audio is captured only while you hold an active recording, transcribed, and sent for AI analysis. Raw audio is deleted after transcription — we keep the transcript and the report, not your voice.")
                privacyRow(icon: "doc.text.fill", tint: VividTheme.success,
                           title: "Your practice history",
                           body: "Questions, transcripts, scores, and streaks are stored in your account so you can track growth across attempts.")
                privacyRow(icon: "person.fill", tint: VividTheme.warn,
                           title: "Your profile",
                           body: "Role, experience level, and skills you select — used only to personalize questions. Never sold, never shared with employers.")
            } header: {
                Text("What we collect")
            }

            // What we never do
            Section {
                neverRow("Sell your data to anyone")
                neverRow("Share recordings or reports with employers")
                neverRow("Listen in the background — the mic is only live while recording")
                neverRow("Train third-party models on your answers")
            } header: {
                Text("What we never do")
            }

            // Retention
            Section {
                privacyRow(icon: "clock.arrow.circlepath", tint: VividTheme.purple,
                           title: "Retention",
                           body: "Transcripts and reports stay until you delete them or your account. Raw audio is discarded within minutes of transcription. Deleting your account erases everything within 30 days.")
            } header: {
                Text("How long we keep it")
            }

            // Controls
            Section {
                Button(action: onExportData) {
                    Label("Export my data", systemImage: "square.and.arrow.up")
                }
                Button(role: .destructive) {
                    confirmingDelete = true
                } label: {
                    Label("Delete my account & data", systemImage: "trash")
                }
            } header: {
                Text("Your controls")
            } footer: {
                Text("Questions? support@careervivid.app · Full policy: careervivid.app/privacy")
            }
        }
        .navigationTitle("Privacy")
        .confirmationDialog(
            "Delete your account?",
            isPresented: $confirmingDelete,
            titleVisibility: .visible
        ) {
            Button("Delete everything", role: .destructive, action: onDeleteAccount)
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("All recordings, transcripts, reports, and streaks will be permanently erased within 30 days. This cannot be undone.")
        }
    }

    private func privacyRow(icon: String, tint: Color, title: String, body: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 32, height: 32)
                .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 9))
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(size: 15, weight: .bold))
                Text(body).font(.system(size: 13)).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }

    private func neverRow(_ text: String) -> some View {
        Label {
            Text(text).font(.system(size: 14, weight: .medium))
        } icon: {
            Image(systemName: "xmark.circle.fill").foregroundStyle(VividTheme.danger)
        }
    }
}

// MARK: - Mic permission primer (before the FIRST recording)

/// Show once before the system microphone dialog — explains, then asks.
struct MicPermissionPrimer: View {
    let onContinue: () -> Void
    let onViewPrivacy: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "mic.badge.plus")
                .font(.system(size: 44))
                .foregroundStyle(VividTheme.purple)
                .padding(.top, 8)
            Text("Vivid needs your microphone")
                .font(VividTheme.Text.page)
                .multilineTextAlignment(.center)
            Text("Only while you record an answer. Audio is transcribed, analyzed, and the raw recording is deleted — we keep your transcript and report, never your voice.")
                .font(VividTheme.Text.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button(action: onContinue) {
                Text("Continue")
                    .font(.system(size: 16, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(VividTheme.purple, in: RoundedRectangle(cornerRadius: 14))
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
            .pressable()
            Button("Read our privacy promise", action: onViewPrivacy)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(VividTheme.purple)
        }
        .padding(24)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}
