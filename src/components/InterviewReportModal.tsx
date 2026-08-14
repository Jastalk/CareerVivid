import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { InterviewAnalysis, PracticeHistoryEntry } from '../types';
import FeedbackModal from './FeedbackModal';
import { useAuth } from '../contexts/AuthContext';
import { canReopenSubmittedDesign, reopenSubmittedDesign } from '../lib/reopenSubmittedDesign';
import {
    CoachingDashboard,
    ReportActions,
    ReportTabs,
    SessionSelector,
    TranscriptView,
} from './interviewReport/InterviewReportSections';
import { ReportTab, TranscriptFallback, resolveTranscript } from './interviewReport/reportShared';
import { useInterviewReportExport } from './interviewReport/useInterviewReportExport';

interface InterviewReportModalProps {
    jobHistoryEntry: PracticeHistoryEntry;
    onClose: () => void;
    isGuestMode?: boolean;
    /**
     * If provided, shows a button that reopens the workspace for a report.
     *
     * It receives the analysis currently selected in the session list, not the
     * newest one — otherwise picking an older session and clicking improve
     * silently reopens different work than the report on screen.
     */
    onImprove?: (analysis: InterviewAnalysis) => void;
    /** Defaults to "Improve my solution"; system design says "design". */
    improveLabel?: string;
    /**
     * Whether the selected session can be reopened at all.
     *
     * A job's history mixes stages — a voice round has no workspace to return
     * to, a whiteboard round does. Without this the button shows on every
     * session in the list and does nothing on most of them.
     */
    canImprove?: (analysis: InterviewAnalysis) => boolean;
    /**
     * Which session to show first. Defaults to the newest.
     *
     * Set when something outside the modal already knows which report the user
     * asked for — the agent's report card names one, and opening it on a
     * different session would answer a question nobody asked.
     */
    initialAnalysisId?: string;
    onNextProblem?: () => void;
    remainingProblems?: number;
}

const InterviewReportModal: React.FC<InterviewReportModalProps> = ({ jobHistoryEntry, onClose, isGuestMode = false, onImprove, improveLabel, canImprove, initialAnalysisId, onNextProblem, remainingProblems }) => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<ReportTab>('feedback');
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    const sortedHistory = useMemo(() => {
        if (!jobHistoryEntry?.interviewHistory) return [];
        return [...jobHistoryEntry.interviewHistory].sort((a, b) => b.timestamp - a.timestamp);
    }, [jobHistoryEntry.interviewHistory]);

    const [currentAnalysis, setCurrentAnalysis] = useState<InterviewAnalysis | null>(
        (initialAnalysisId ? sortedHistory.find((a) => a.id === initialAnalysisId) : undefined)
        ?? sortedHistory[0]
        ?? null,
    );
    /*
     * Reopening the work behind a report is the modal's own behaviour, not
     * something each screen opts into.
     *
     * It was opt-in, and every screen that forgot silently dropped it: the
     * button showed up in the report you got right after submitting and
     * nowhere else, so opening the same report from Interview Studio, the
     * dashboard, or the agent's report card left the footer with nothing but
     * "Rate this report" — while the diagram sat on the analysis the whole
     * time. Five render sites, five chances to forget.
     *
     * A caller that passes `onImprove` still wins outright; the battles restore
     * their own canvas and the quest page opens the whiteboard without leaving
     * the page, both of which beat routing. Everyone else gets the routing
     * fallback for free, including screens added later.
     */
    const callerOwnsImprove = Boolean(onImprove);
    const handleImprove = onImprove
        ?? ((analysis: InterviewAnalysis) => { reopenSubmittedDesign(jobHistoryEntry, analysis); });
    const allowImprove = canImprove
        ?? (callerOwnsImprove
            ? () => true
            : (analysis: InterviewAnalysis) => canReopenSubmittedDesign(jobHistoryEntry, analysis));
    const improveText = improveLabel ?? (callerOwnsImprove ? 'Improve my solution' : 'Open this design');

    const {
        isDownloading,
        isExportingDocument,
        handleDownloadTxt,
        handleDownloadPdf,
        handleDownloadDocx,
        handleGoogleDocsExport,
    } = useInterviewReportExport({
        currentAnalysis,
        currentUser,
        jobHistoryEntry,
    });

    useEffect(() => {
        if (sortedHistory[0] && (!currentAnalysis || !sortedHistory.some(item => item.id === currentAnalysis.id))) {
            setCurrentAnalysis(sortedHistory[0]);
        }
    }, [currentAnalysis, sortedHistory]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isFeedbackModalOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFeedbackModalOpen, onClose]);

    const currentTranscriptFallback = useMemo<TranscriptFallback>(() => {
        if (!currentAnalysis) {
            return {
                entries: [],
                sourceLabel: 'Transcript unavailable',
            };
        }

        return resolveTranscript(currentAnalysis, jobHistoryEntry);
    }, [currentAnalysis, jobHistoryEntry]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-800">
            {isFeedbackModalOpen && currentAnalysis && (
                <FeedbackModal
                    isOpen={isFeedbackModalOpen}
                    onClose={() => setIsFeedbackModalOpen(false)}
                    source="interview"
                    context={{
                        jobId: jobHistoryEntry.id,
                        jobTitle: jobHistoryEntry.job.title,
                        analysisId: currentAnalysis.id,
                    }}
                />
            )}

            <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-gray-800 md:flex-row">
                <SessionSelector sortedHistory={sortedHistory} currentAnalysis={currentAnalysis} onSelect={setCurrentAnalysis} variant="sidebar" />

                <div className="flex min-w-0 flex-grow flex-col overflow-hidden">
                    <header className="flex flex-shrink-0 items-start justify-between gap-4 border-b p-4 dark:border-gray-700">
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Interview Report</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {currentAnalysis ? `Analysis from ${new Date(currentAnalysis.timestamp).toLocaleString()}` : 'No session selected'}
                            </p>
                        </div>
                        <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white">
                            <X size={20} />
                        </button>
                    </header>

                    {currentAnalysis ? (
                        <>
                            <div className="flex flex-shrink-0 flex-col gap-3 border-b bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50 md:flex-row md:items-center md:justify-between">
                                <SessionSelector sortedHistory={sortedHistory} currentAnalysis={currentAnalysis} onSelect={setCurrentAnalysis} variant="select" />
                                <ReportTabs activeTab={activeTab} onChange={setActiveTab} />
                            </div>

                            <div className="flex-grow overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900/50 md:p-6">
                                {activeTab === 'feedback' ? (
                                    <CoachingDashboard analysis={currentAnalysis} />
                                ) : (
                                    <TranscriptView transcript={currentTranscriptFallback.entries} sourceLabel={currentTranscriptFallback.sourceLabel} />
                                )}
                            </div>

                            <ReportActions
                                isGuestMode={isGuestMode}
                                isDownloading={isDownloading}
                                isExportingDocument={isExportingDocument}
                                onDownloadTxt={handleDownloadTxt}
                                onDownloadPdf={handleDownloadPdf}
                                onExportGoogleDocs={handleGoogleDocsExport}
                                onDownloadDocx={handleDownloadDocx}
                                onRateReport={() => setIsFeedbackModalOpen(true)}
                                onImprove={currentAnalysis && allowImprove(currentAnalysis)
                                    ? () => handleImprove(currentAnalysis)
                                    : undefined}
                                improveLabel={improveText}
                                onNextProblem={onNextProblem}
                                remainingProblems={remainingProblems}
                            />
                        </>
                    ) : (
                        <div className="flex flex-grow items-center justify-center">
                            <p className="text-gray-500">No report available for this session.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InterviewReportModal;
