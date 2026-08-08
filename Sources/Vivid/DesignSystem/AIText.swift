import SwiftUI

/// P0 trust fix: AI responses arrive with markdown (`**bold**`, `*italic*`)
/// and today the raw asterisks leak into the UI ("directly:** …*your growth*…").
///
/// Route EVERY AI-authored string through `AIText` (renders markdown) or
/// `String.strippedMarkdown` (plain contexts like list previews).
struct AIText: View {
    let raw: String
    var font: Font = VividTheme.Text.body

    var body: some View {
        Text(Self.attributed(from: raw))
            .font(font)
            .tint(VividTheme.purple)
    }

    static func attributed(from raw: String) -> AttributedString {
        let cleaned = raw.cleanedAIArtifacts
        if let parsed = try? AttributedString(
            markdown: cleaned,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        ) {
            return parsed
        }
        return AttributedString(cleaned.strippedMarkdown)
    }
}

extension String {
    /// Fixes the artifacts LLMs commonly leave: orphaned `**` after a colon
    /// (from a stripped heading), stray backticks, doubled whitespace.
    var cleanedAIArtifacts: String {
        var s = self
        s = s.replacingOccurrences(of: ":**", with: ":")   // "directly:** The…" → "directly: The…"
        s = s.replacingOccurrences(of: "：**", with: "：")
        // Leading "**Heading:** body" style is fine for the markdown parser; leave it.
        s = s.replacingOccurrences(of: "  ", with: " ")
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Removes markdown tokens entirely — for truncated previews and captions.
    var strippedMarkdown: String {
        var s = cleanedAIArtifacts
        for token in ["**", "__", "*", "_", "`", "###", "##", "#"] {
            s = s.replacingOccurrences(of: token, with: "")
        }
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
