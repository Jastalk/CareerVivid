export interface StoredConversationTurn<T = unknown> {
    role: 'user' | 'assistant';
    text: string;
    effects?: T[];
    via?: 'text' | 'voice';
}

const PUNCTUATION_WITHOUT_LEADING_SPACE = /^[,.;:!?%…)}\]]/;
const OPENING_PUNCTUATION = /[(\[{“‘]$/;
const CJK_CHARACTER = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/** Join streamed transcript fragments without introducing awkward punctuation. */
export function joinTranscriptFragments(previous: string, next: string): string {
    const left = previous.trim();
    const right = next.trim();
    if (!left) return right;
    if (!right) return left;

    const lastCharacter = left.at(-1) ?? '';
    const firstCharacter = right[0] ?? '';
    const shouldJoinDirectly = PUNCTUATION_WITHOUT_LEADING_SPACE.test(right)
        || OPENING_PUNCTUATION.test(left)
        || CJK_CHARACTER.test(lastCharacter)
        || CJK_CHARACTER.test(firstCharacter);

    return `${left}${shouldJoinDirectly ? '' : ' '}${right}`;
}

/**
 * Rebuild complete voice messages when a saved session is opened.
 *
 * Live transcription is persisted in small fragments so a connection loss does
 * not lose the whole answer. The conversation UI should present consecutive
 * fragments from one speaker as one readable turn, while preserving deliberate
 * text messages as separate bubbles.
 */
export function mergeVoiceTranscriptTurns<T extends StoredConversationTurn>(turns: readonly T[]): T[] {
    return turns.reduce<T[]>((merged, turn) => {
        const normalized = { ...turn, text: turn.text.trim() } as T;
        if (!normalized.text) return merged;

        const previous = merged[merged.length - 1];
        if (previous?.via === 'voice' && normalized.via === 'voice' && previous.role === normalized.role) {
            const effects = [...(previous.effects ?? []), ...(normalized.effects ?? [])];
            merged[merged.length - 1] = {
                ...previous,
                text: joinTranscriptFragments(previous.text, normalized.text),
                ...(effects.length > 0 ? { effects } : {}),
            } as T;
            return merged;
        }

        merged.push(normalized);
        return merged;
    }, []);
}
