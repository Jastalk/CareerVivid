/**
 * Parsing JSON that a model produced, which is not the same as parsing JSON.
 *
 * `JSON.parse(result.text)` assumes the model finished. It often hasn't: the
 * response is streamed, the proxy forwards whatever arrived, and a generation
 * that stops at its output-token ceiling looks exactly like one that stopped
 * because it was done. The user sees "Unterminated string in JSON at position
 * 2757" and an empty screen, having just paid for the call.
 *
 * So: strip the fences models add anyway, and if the text is cut off, close it
 * and keep what did arrive. A resume missing its last bullet is worth far more
 * to someone than a SyntaxError — they were going to edit it regardless.
 */

/** Thrown when the text is not recoverable, carrying enough to diagnose why. */
export class ModelJsonError extends Error {
    constructor(
        message: string,
        readonly detail: { raw: string; repaired?: string; truncated: boolean },
    ) {
        super(message);
        this.name = 'ModelJsonError';
    }
}

/** Models wrap JSON in markdown fences regardless of what the schema says. */
export function stripJsonFence(text: string): string {
    const trimmed = text.trim();
    if (!trimmed.startsWith('```')) return trimmed;
    return trimmed
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/\n?```$/, '')
        .trim();
}

/**
 * Close a JSON document that was cut off mid-flight.
 *
 * Walks the text tracking string/escape state and a stack of open brackets,
 * remembering the last offset at which a COMPLETE value had just been written.
 * Everything after that is a half-written element, so it is dropped and the
 * open containers are closed in reverse.
 *
 * A closing quote only counts as a completed value when the next meaningful
 * character is not `:` — otherwise it was a key, and cutting there would leave
 * `{"a": {"b"}}`, which is not JSON.
 *
 * Returns null when there is nothing recoverable.
 */
export function repairTruncatedJson(text: string): string | null {
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    let lastComplete = -1;

    const nextMeaningful = (from: number): string => {
        for (let j = from; j < text.length; j++) {
            if (!/\s/.test(text[j])) return text[j];
        }
        return '';
    };

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') {
                inString = false;
                // A key is followed by a colon; a value is not.
                if (stack.length > 0 && nextMeaningful(i + 1) !== ':') lastComplete = i + 1;
            }
            continue;
        }

        if (ch === '"') { inString = true; continue; }
        if (ch === '{' || ch === '[') { stack.push(ch); continue; }
        if (ch === '}' || ch === ']') {
            stack.pop();
            lastComplete = i + 1;
            continue;
        }
        // A comma proves the value before it was complete. Cut BEFORE it, so the
        // half-written element that follows is discarded along with the comma.
        if (ch === ',' && stack.length > 0) lastComplete = i;
    }

    if (lastComplete <= 0) return null;

    let head = text.slice(0, lastComplete).replace(/[\s,]+$/, '');

    // Re-walk the kept portion: dropping the tail can close containers, so the
    // stack from the full text is not the stack of what we are keeping.
    const open: string[] = [];
    let s = false;
    let esc = false;
    for (const ch of head) {
        if (s) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === '"') s = false;
            continue;
        }
        if (ch === '"') s = true;
        else if (ch === '{' || ch === '[') open.push(ch);
        else if (ch === '}' || ch === ']') open.pop();
    }

    while (open.length) head += open.pop() === '{' ? '}' : ']';
    return head;
}

export interface ParsedModelJson<T> {
    value: T;
    /** True when the text arrived cut off and was closed to salvage it. */
    repaired: boolean;
}

/**
 * Parse model output into JSON, salvaging a truncated response if possible.
 *
 * Callers that can act on it should check `repaired` — it means the model ran
 * out of room, so the result is real but incomplete, and telling the user that
 * is better than letting them wonder why a section is missing.
 */
export function parseModelJson<T = any>(text: unknown): ParsedModelJson<T> {
    const raw = typeof text === 'string' ? stripJsonFence(text) : '';
    if (!raw) {
        throw new ModelJsonError('The AI returned an empty response.', { raw: '', truncated: false });
    }

    try {
        return { value: JSON.parse(raw) as T, repaired: false };
    } catch {
        // fall through to repair
    }

    const repaired = repairTruncatedJson(raw);
    if (repaired) {
        try {
            return { value: JSON.parse(repaired) as T, repaired: true };
        } catch {
            throw new ModelJsonError('The AI response was cut off and could not be recovered.', {
                raw,
                repaired,
                truncated: true,
            });
        }
    }

    throw new ModelJsonError('The AI returned a response that was not valid JSON.', {
        raw,
        truncated: false,
    });
}
