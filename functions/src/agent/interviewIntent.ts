/** Normalize frequent speech-to-text variants before searching the company catalog. */
export function normalizeSpokenCompanyQuery(input: string): string {
    const normalized = input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (/\bopen\s*(a\s*i|eye|ai)\b/.test(normalized)) return "openai";
    return normalized;
}

const ADVANCED_CUES = /\b(interview|system\s*design|open\s*(?:a\s*i|eye|ai)|current\s+question|my\s+(?:diagram|design|solution|architecture|code)|can\s+you\s+see|is\s+this\s+correct|review\s+(?:this|my)|whiteboard|canvas)\b/i;

export function shouldUseAdvancedCareerModel(message: string, hasWorkspace: boolean): boolean {
    return hasWorkspace || ADVANCED_CUES.test(message);
}
