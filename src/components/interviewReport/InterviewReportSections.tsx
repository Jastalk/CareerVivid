import React from 'react';
import { ArrowRight, Code2, Download, FileText, BarChart, Bot, User, Loader2, Star, TrendingUp, CheckCircle2, Target, FileType } from 'lucide-react';
import { InterviewAnalysis, TranscriptEntry } from '../../types';
import {
    DashboardMetric,
    ReportTab,
    clampScore,
    deriveDashboardData,
    emptyTranscriptMessage,
    scoreBand,
} from './reportShared';

const MarkdownRenderer: React.FC<{ text: string }> = ({ text = '' }) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <div className="whitespace-pre-wrap">
            {parts.map((part, i) =>
                part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={i} className="font-semibold text-primary-600 dark:text-primary-400">
                        {part.slice(2, -2)}
                    </strong>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </div>
    );
};

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
    const validScore = clampScore(score);
    const size = 132;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (validScore / 100) * circumference;

    const scoreColor = validScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : validScore >= 45 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
    const ringColor = validScore >= 70 ? 'stroke-emerald-500' : validScore >= 45 ? 'stroke-amber-500' : 'stroke-rose-500';

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
                <circle
                    className={`${ringColor} transition-all duration-1000 ease-out`}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    strokeDasharray={`${circumference} ${circumference}`}
                    style={{ strokeDashoffset: offset }}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${scoreColor}`}>{Math.round(validScore)}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Overall</span>
            </div>
        </div>
    );
};

const MetricBar: React.FC<{ metric: DashboardMetric }> = ({ metric }) => {
    const validScore = clampScore(metric.score);
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{metric.label}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{metric.helper}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {Math.round(validScore)}%
                </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div className="h-2 rounded-full bg-primary-500 transition-all duration-1000 ease-out" style={{ width: `${validScore}%` }} />
            </div>
        </div>
    );
};

export const SessionSelector: React.FC<{
    sortedHistory: InterviewAnalysis[];
    currentAnalysis: InterviewAnalysis | null;
    onSelect: (analysis: InterviewAnalysis) => void;
    variant: 'sidebar' | 'select';
}> = ({ sortedHistory, currentAnalysis, onSelect, variant }) => (
    <>
        {variant === 'sidebar' && (
            <aside className="hidden w-64 min-w-[220px] flex-col border-r bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 md:flex">
                <div className="border-b p-4 dark:border-gray-700">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Sessions</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sortedHistory.length} saved report{sortedHistory.length === 1 ? '' : 's'}</p>
                </div>
                <div className="flex-grow overflow-y-auto p-2">
                    {sortedHistory.map(analysisItem => (
                        <button
                            key={analysisItem.id}
                            onClick={() => onSelect(analysisItem)}
                            className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${currentAnalysis?.id === analysisItem.id
                                ? 'border-primary-200 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-100'
                                : 'border-transparent text-gray-700 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-700/60'
                                }`}
                        >
                            <p className="font-semibold">{new Date(analysisItem.timestamp).toLocaleDateString()}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{new Date(analysisItem.timestamp).toLocaleTimeString()}</p>
                            <p className="mt-2 text-xs font-medium">{Math.round(clampScore(analysisItem.overallScore))}/100 - {scoreBand(analysisItem.overallScore)}</p>
                        </button>
                    ))}
                </div>
            </aside>
        )}

        {variant === 'select' && (
            <div className="md:hidden">
                <label htmlFor="session-select" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Session</label>
                <select
                    id="session-select"
                    value={currentAnalysis?.id || ''}
                    onChange={e => {
                        const selected = sortedHistory.find(h => h.id === e.target.value);
                        if (selected) onSelect(selected);
                    }}
                    className="block w-full rounded-md border-gray-300 bg-white text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                >
                    {sortedHistory.map(analysisItem => (
                        <option key={analysisItem.id} value={analysisItem.id}>
                            {new Date(analysisItem.timestamp).toLocaleString()}
                        </option>
                    ))}
                </select>
            </div>
        )}
    </>
);

export const ReportTabs: React.FC<{ activeTab: ReportTab; onChange: (tab: ReportTab) => void }> = ({ activeTab, onChange }) => (
    <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-900/70">
        <button
            onClick={() => onChange('feedback')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'feedback' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
        >
            <BarChart size={16} /> Dashboard
        </button>
        <button
            onClick={() => onChange('transcript')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'transcript' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
        >
            <FileText size={16} /> Transcript
        </button>
    </div>
);

export const CoachingDashboard: React.FC<{ analysis: InterviewAnalysis }> = ({ analysis }) => {
    const dashboard = deriveDashboardData(analysis);

    return (
        <div className="space-y-5">
            <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                    <ScoreRing score={analysis.overallScore} />
                    <div className="min-w-0 flex-1">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                            <TrendingUp size={14} /> {scoreBand(analysis.overallScore)}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Top summary</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{dashboard.summary}</p>
                    </div>
                </div>
            </section>

            {/* NOTE: Demonstrated skills are currently displayed only on iOS, but the rendering markup is kept here for future web dashboard alignment. */}
            {analysis.skills && analysis.skills.length > 0 && (
                <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Demonstrated skills</h3>
                    <div className="flex flex-wrap gap-2">
                        {analysis.skills.map(skill => (
                            <span
                                key={skill}
                                className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-100 dark:border-primary-800/30"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <div className="mb-3 flex items-center gap-2">
                    <BarChart size={18} className="text-primary-600 dark:text-primary-400" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Metric breakdown</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {dashboard.metrics.map(metric => <MetricBar key={metric.label} metric={metric} />)}
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/70 dark:bg-emerald-950/30">
                    <div className="mb-3 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">What went well</h3>
                    </div>
                    <div className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                        <MarkdownRenderer text={dashboard.strengths} />
                    </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/70 dark:bg-amber-950/30">
                    <div className="mb-3 flex items-center gap-2">
                        <Target size={18} className="text-amber-600 dark:text-amber-400" />
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Practice next</h3>
                    </div>
                    <div className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                        <MarkdownRenderer text={dashboard.practiceNext} />
                    </div>
                </div>
            </section>
        </div>
    );
};

export const TranscriptView: React.FC<{ transcript: TranscriptEntry[]; sourceLabel?: string }> = ({ transcript, sourceLabel }) => {
    if (!transcript.length) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <FileText className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{emptyTranscriptMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sourceLabel && (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    Transcript source: {sourceLabel}
                </div>
            )}
            {transcript.map((entry, index) => (
                <div key={`${entry.speaker}-${entry.timestamp || index}`} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
                    {entry.speaker === 'ai' && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
                            <Bot size={18} />
                        </div>
                    )}
                    <div className={`max-w-[82%] rounded-lg p-3 text-sm leading-6 ${entry.speaker === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100'}`}>
                        <p className="whitespace-pre-wrap">{entry.text}</p>
                    </div>
                    {entry.speaker === 'user' && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-500 text-white">
                            <User size={18} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export const ReportActions: React.FC<{
    isGuestMode: boolean;
    isDownloading: boolean;
    isExportingDocument: boolean;
    onDownloadTxt: () => void;
    onDownloadPdf: () => void;
    onExportGoogleDocs: () => void;
    onDownloadDocx: () => void;
    onRateReport: () => void;
    /** If provided, shows a button that reopens the workspace for this report. */
    onImprove?: () => void;
    /** What that button says — a diagram is not a "solution". */
    improveLabel?: string;
    /**
     * Move to another problem at the same company.
     *
     * Finishing a problem used to end at "improve this one or leave", which is
     * a dead end for someone who wanted to keep going. `remainingProblems`
     * decides what the button offers: another problem here, or — when the pool
     * is empty — a way out to a different company.
     */
    onNextProblem?: () => void;
    remainingProblems?: number;
}> = ({ isGuestMode, isDownloading, isExportingDocument, onDownloadTxt, onDownloadPdf, onExportGoogleDocs, onDownloadDocx, onRateReport, onImprove, improveLabel, onNextProblem, remainingProblems }) => (
    <footer className="flex flex-shrink-0 flex-col gap-3 border-t p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {onImprove && (
                <button
                    onClick={onImprove}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-[#625bd5] bg-[#f3f2ff] px-4 py-2 text-sm font-semibold text-[#625bd5] shadow-sm transition-colors hover:bg-[#e8e6ff] dark:border-[#7069dc] dark:bg-[#312d6b]/50 dark:text-[#c8c5ff] dark:hover:bg-[#312d6b]"
                >
                    <Code2 size={16} /> {improveLabel ?? 'Improve my solution'}
                </button>
            )}
            {onNextProblem && (
                <button
                    onClick={onNextProblem}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                >
                    <ArrowRight size={16} />
                    {remainingProblems && remainingProblems > 0
                        ? `Next problem (${remainingProblems} left)`
                        : 'Try another company'}
                </button>
            )}
            {!isGuestMode && (
                <button
                    onClick={onRateReport}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    <Star size={17} /> Rate this report
                </button>
            )}
        </div>

        {isGuestMode ? (
            <a href="/signin" className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-700">
                Sign Up to Save & Download Report
            </a>
        ) : (
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-row">
                <button
                    onClick={onDownloadTxt}
                    disabled={isDownloading || isExportingDocument}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-gray-800 disabled:opacity-50"
                >
                    <Download size={18} /> Download TXT
                </button>
                <button
                    onClick={onDownloadPdf}
                    disabled={isDownloading || isExportingDocument}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                    onClick={onExportGoogleDocs}
                    disabled={isDownloading || isExportingDocument}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-700 disabled:opacity-50"
                >
                    {isExportingDocument ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                    Google Docs
                </button>
                <button
                    onClick={onDownloadDocx}
                    disabled={isDownloading || isExportingDocument}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-md ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
                >
                    <FileType size={18} /> DOCX
                </button>
            </div>
        )}
    </footer>
);
