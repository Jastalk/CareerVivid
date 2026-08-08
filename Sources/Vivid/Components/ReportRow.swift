import SwiftUI

/// Recent-report row: two-line titles end the "Engineering Manage…" truncation,
/// and the score circle finally means something (semantic color + sweep).
struct ReportRow: View {
    let score: Int
    let roleAndCompany: String   // "Engineering Manager · Google"
    let question: String         // may contain AI markdown — stripped for preview
    let date: Date
    var index: Int = 0
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 14) {
                ScoreBadge(score: score, size: 52)
                VStack(alignment: .leading, spacing: 3) {
                    Text(roleAndCompany)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    Text(question.strippedMarkdown)
                        .font(VividTheme.Text.body)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 8)
                VStack(alignment: .trailing, spacing: 4) {
                    Text(date, format: .dateTime.month(.abbreviated).day())
                        .font(VividTheme.Text.caption)
                        .foregroundStyle(.tertiary)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(16)
            .background(VividTheme.card, in: RoundedRectangle(cornerRadius: VividTheme.cardRadius))
        }
        .buttonStyle(.plain)
        .pressable()
        .scrollEntrance()
        .accessibilityLabel("\(roleAndCompany), score \(score). \(question.strippedMarkdown)")
    }
}
