/**
 * Which report the Career Agent has been asked to open, held outside React.
 *
 * "Open the full report" on the agent's report card used to call
 * `navigate('/interview-studio')` — a fixed route that ignored the card
 * entirely. It took you to the practice catalog and left you to find the
 * report yourself, which is worse than the card not offering the link, because
 * the click also threw away whatever page you were on. Somebody reviewing a
 * whiteboard lost the whiteboard.
 *
 * The card already carries `sessionId` and `analysisId`, so it can name the
 * exact report. This holds that request so a host mounted beside the drawer can
 * open it over the current page instead of navigating away from it.
 *
 * A module rather than context for the same reason as [drawerMode]: the writer
 * (a card inside the drawer, which remounts per route) and the reader (a host
 * mounted once at the app root) are not on one provider path. Not persisted —
 * a request is a click, and reopening a report on reload would be a surprise.
 */

export interface AgentReportRequest {
    /** The practiceHistory document id. */
    sessionId: string;
    /** Which analysis inside it to select; the newest when absent. */
    analysisId?: string;
}

let current: AgentReportRequest | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const getAgentReportRequest = (): AgentReportRequest | null => current;

export function openAgentReport(request: AgentReportRequest): void {
    current = request;
    emit();
}

export function closeAgentReport(): void {
    if (current === null) return;
    current = null;
    emit();
}

export function subscribeAgentReport(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
