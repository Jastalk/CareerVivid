/**
 * Reopening the whiteboard on a design a past report was scored from.
 *
 * Every system design submission stores its own diagram on the analysis, so
 * "what did I actually submit here?" is answerable for any saved report — but
 * only the quest page can answer it, because only it can build the brief and
 * mount the whiteboard. A report opened anywhere else (the agent's report card,
 * the dashboard) has to get the user there, carrying which design to restore.
 *
 * Lives here rather than in either caller so the two agree on when the button
 * appears. A button that shows up on a report it cannot actually reopen is
 * worse than no button, and that is exactly what a second, drifting copy of
 * this rule produces.
 */

import { navigate } from '../utils/navigation';
import { findQuestSlugForCompany } from './localInterviewGuides';
import type { InterviewAnalysis, PracticeHistoryEntry } from '../types';

/** The quest route that can reopen this analysis, or null if none can. */
const routeFor = (
    entry: PracticeHistoryEntry | null | undefined,
    analysis: InterviewAnalysis | null | undefined,
): string | null => {
    const artifact = analysis?.questArtifact;
    if (artifact?.type !== 'system_design' || !artifact.challengeId) return null;

    // The company is what ties a saved report back to a quest; practice history
    // stores no slug of its own.
    const slug = findQuestSlugForCompany(entry?.job?.company);
    if (!slug) return null;

    const params = new URLSearchParams({
        stage: 'system_design',
        systemDesignChallenge: artifact.challengeId,
    });
    // Which submission, not just which prompt — a challenge practised three
    // times has three diagrams, and the report names one of them.
    if (analysis?.id) params.set('analysis', analysis.id);
    return `/quest/${slug}?${params.toString()}`;
};

export const canReopenSubmittedDesign = (
    entry: PracticeHistoryEntry | null | undefined,
    analysis: InterviewAnalysis | null | undefined,
): boolean => routeFor(entry, analysis) !== null;

/** Navigates to the whiteboard for this report. Returns false if it cannot. */
export const reopenSubmittedDesign = (
    entry: PracticeHistoryEntry | null | undefined,
    analysis: InterviewAnalysis | null | undefined,
): boolean => {
    const route = routeFor(entry, analysis);
    if (!route) return false;
    navigate(route);
    return true;
};
