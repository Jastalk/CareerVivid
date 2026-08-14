/**
 * Opens the report the Career Agent's card points at, over the current page.
 *
 * Mounted once beside the drawer rather than per page, because the card can be
 * clicked from anywhere the agent is — the dashboard, the resume editor, a
 * whiteboard mid-review. Navigating to a page that owns a report modal would
 * discard whatever the user was looking at, which is the behaviour this
 * replaces.
 *
 * Reads the one document by id instead of subscribing to practiceHistory. The
 * hook that does the latter streams the whole collection to keep a list live,
 * and this needs a single entry, once, at the moment of a click.
 */

import React, { Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PracticeHistoryEntry } from '../../types';
import {
    closeAgentReport,
    getAgentReportRequest,
    subscribeAgentReport,
} from './reportViewer';

const InterviewReportModal = React.lazy(() => import('../../components/InterviewReportModal'));

const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40">{children}</div>
);

const AgentReportViewer: React.FC = () => {
    const { currentUser } = useAuth();
    const request = useSyncExternalStore(subscribeAgentReport, getAgentReportRequest, () => null);
    const [entry, setEntry] = useState<PracticeHistoryEntry | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!request || !currentUser) {
            setEntry(null);
            setError('');
            return;
        }

        let cancelled = false;
        setEntry(null);
        setError('');

        (async () => {
            try {
                const snap = await getDoc(doc(db, 'users', currentUser.uid, 'practiceHistory', request.sessionId));
                if (cancelled) return;
                if (!snap.exists()) {
                    setError('That practice session is no longer saved.');
                    return;
                }
                setEntry({ id: snap.id, ...snap.data() } as PracticeHistoryEntry);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load that report.');
            }
        })();

        return () => { cancelled = true; };
    }, [currentUser, request]);

    if (!request) return null;

    if (error) {
        return (
            <Backdrop>
                <div className="max-w-sm rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] p-5 text-center shadow-[var(--cv-shadow-modal)]">
                    <p className="text-sm font-semibold text-[var(--cv-text-heading)]">{error}</p>
                    <button
                        type="button"
                        onClick={closeAgentReport}
                        className="mt-4 rounded-lg border border-[var(--cv-border-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--cv-text-muted)] transition hover:text-[var(--cv-text-heading)]"
                    >
                        Close
                    </button>
                </div>
            </Backdrop>
        );
    }

    if (!entry) {
        return <Backdrop><Loader2 className="animate-spin text-white" size={28} /></Backdrop>;
    }

    return (
        <Suspense fallback={<Backdrop><Loader2 className="animate-spin text-white" size={28} /></Backdrop>}>
            <div className="fixed inset-0 z-[80]">
                <InterviewReportModal
                    jobHistoryEntry={entry}
                    initialAnalysisId={request.analysisId}
                    onClose={closeAgentReport}
                />
            </div>
        </Suspense>
    );
};

export default AgentReportViewer;
