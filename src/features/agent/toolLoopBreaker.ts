/**
 * Circuit breaker for a Live agent stuck calling the same tool forever.
 *
 * The turn-based agent stops after MAX_ITERATIONS. The Live surface has no
 * equivalent, because there is no loop to bound — the model calls a tool, the
 * client answers, it calls again, indefinitely. A real session did exactly
 * that: the panel flipped between Thinking and Working for minutes while the
 * user's question went unanswered, because every repeat of a write returned a
 * fresh "awaiting approval" that read to the model like progress.
 *
 * Counting only CONSECUTIVE identical calls is what makes this safe to enforce
 * client-side. Anything either side says calls `spoke()` and resets the count,
 * so a model that is making progress is never touched. The breaker can only
 * fire on a model that has said nothing and keeps asking for the same thing
 * with the same arguments.
 */

/**
 * How many times the model may repeat the exact same call, in a row and without
 * speaking, before the client stops relaying it.
 *
 * Three leaves room for a genuine retry after a transient failure, and is short
 * enough that a stuck agent recovers within one breath rather than minutes.
 */
export const MAX_REPEATED_TOOL_CALLS = 3;

export interface ToolLoopBreaker {
    /** Record one batch of calls. Returns null to proceed, or the refusal text. */
    check: (calls: Array<{ name?: string; args?: unknown }>) => string | null;
    /** Progress. Clears the count. */
    spoke: () => void;
}

export function createToolLoopBreaker(limit = MAX_REPEATED_TOOL_CALLS): ToolLoopBreaker {
    let signature = '';
    let repeats = 0;

    return {
        check(calls) {
            const next = calls.map((c) => `${c.name}:${JSON.stringify(c.args ?? {})}`).join('|');
            repeats = next === signature ? repeats + 1 : 1;
            signature = next;
            if (repeats <= limit) return null;

            const names = [...new Set(calls.map((c) => c.name).filter(Boolean))].join(', ') || 'that tool';
            // Written for the model, which reads it as the tool's result. It has
            // to be unambiguous that retrying is not an option, and say what to
            // do instead — otherwise it just tries a different tool and loops on.
            return (
                `You have called ${names} with the same arguments ${repeats} times without saying anything. ` +
                'It will not be run again. Stop calling tools, answer the user out loud with what you ' +
                'already have, and if something is genuinely blocked, say what it is.'
            );
        },
        spoke() {
            signature = '';
            repeats = 0;
        },
    };
}
