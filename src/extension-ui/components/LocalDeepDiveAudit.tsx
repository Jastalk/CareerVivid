import React, { useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    Loader2,
    Search,
    Sparkles,
    Target,
} from 'lucide-react';
import type { LocalMatchAuditResult } from '../../utils/localMatchAudit';

type AuditTab = 'matched' | 'missing' | 'recommendations';

interface LocalDeepDiveAuditProps {
    audit: LocalMatchAuditResult | null;
    isLoading: boolean;
}

const tabs: Array<{ id: AuditTab; label: string; icon: React.ElementType }> = [
    { id: 'matched', label: 'Matched', icon: CheckCircle2 },
    { id: 'missing', label: 'Gaps', icon: AlertTriangle },
    { id: 'recommendations', label: 'Improve', icon: Lightbulb },
];

const skeletonRows = [0, 1, 2];

export const LocalDeepDiveAudit: React.FC<LocalDeepDiveAuditProps> = ({ audit, isLoading }) => {
    const [activeTab, setActiveTab] = useState<AuditTab>('matched');

    if (!audit && isLoading) {
        return (
            <section className="rounded-[22px] border border-[#ececf4] bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] dark:border-[#3a3834] dark:bg-[#262522] dark:shadow-none">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#f3f2ff] text-[#4a4392] dark:bg-[#302f49] dark:text-[#b8b3ff]">
                            <Loader2 size={15} className="animate-spin" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-950 dark:text-[#f4f1e9]">Preparing audit</p>
                            <p className="text-[10px] text-slate-500 dark:text-[#aaa39a]">Parsing the job detail pane.</p>
                        </div>
                    </div>
                </div>
                <div className="grid gap-2">
                    {skeletonRows.map(row => (
                        <div key={row} className="h-11 animate-pulse rounded-2xl bg-[#f1f4f8] dark:bg-[#302e2a]" />
                    ))}
                </div>
            </section>
        );
    }

    if (!audit) return null;

    const activeItems = activeTab === 'matched'
        ? audit.matchedSkills
        : activeTab === 'missing'
            ? audit.missingKeywords
            : [];

    return (
        <section className="relative overflow-hidden rounded-[22px] border border-[#ececf4] bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] dark:border-[#3a3834] dark:bg-[#262522] dark:shadow-none">
            {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/72 backdrop-blur-[2px] dark:bg-[#262522]/78">
                    <div className="w-[86%] rounded-2xl border border-[#ececf4] bg-white p-3 shadow-sm dark:border-[#3a3834] dark:bg-[#1f1f1d]">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#4a4392] dark:text-[#b8b3ff]">
                            <Loader2 size={13} className="animate-spin" />
                            Refreshing audit
                        </div>
                        <div className="grid gap-1.5">
                            {skeletonRows.map(row => (
                                <div key={row} className="h-3 animate-pulse rounded-full bg-[#f1f4f8] dark:bg-[#302e2a]" />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4a4392] dark:text-[#b8b3ff]">
                        <Sparkles size={13} />
                        Deep-Dive Audit
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-[#aaa39a]">
                        Instant resume-to-job comparison from the active listing text.
                    </p>
                </div>
                <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-2xl border border-[#d9d7fb] bg-[#f3f2ff] text-[#4f4a9f] dark:border-[#4d4a73] dark:bg-[#302f49] dark:text-[#d8d5ff]">
                    <span className="text-base font-bold leading-none">{audit.score}</span>
                    <span className="mt-0.5 text-[8px] font-semibold leading-none">FIT</span>
                </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-[#ececf4] bg-[#f8f8fb] px-3 py-2 dark:border-[#3a3834] dark:bg-[#1f1f1d]">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-[#f4f1e9]">{audit.coverageLabel}</span>
                <span className="text-[10px] text-slate-500 dark:text-[#aaa39a]">
                    {audit.matchedSkills.length} of {audit.signalCount} signals · {audit.missingKeywords.length} gaps
                </span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-[#f1f4f8] p-1 dark:bg-[#1f1f1d]">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const selected = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors ${
                                selected
                                    ? 'bg-white text-[#211b16] shadow-sm dark:bg-[#302e2a] dark:text-[#f4f1e9]'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]'
                            }`}
                        >
                            <Icon size={11} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'recommendations' ? (
                <div className="space-y-2">
                    {audit.recommendations.map((item, index) => (
                        <div key={`${item}-${index}`} className="flex gap-2 rounded-2xl border border-[#ececf4] bg-[#fffaf6] p-2.5 dark:border-[#3a3834] dark:bg-[#1f1f1d]">
                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[10px] font-bold text-[#4a4392] dark:bg-[#302f49] dark:text-[#b8b3ff]">
                                {index + 1}
                            </span>
                            <p className="text-[11px] leading-snug text-slate-700 dark:text-[#c9c3ba]">{item}</p>
                        </div>
                    ))}
                </div>
            ) : activeItems.length > 0 ? (
                <div className="space-y-2">
                    {activeItems.slice(0, 8).map(item => (
                        <div key={`${activeTab}-${item.term}`} className="rounded-2xl border border-[#ececf4] bg-white p-2.5 dark:border-[#3a3834] dark:bg-[#1f1f1d]">
                            <div className="flex items-center justify-between gap-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${
                                    activeTab === 'matched'
                                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                                        : 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
                                }`}>
                                    {activeTab === 'matched' ? <CheckCircle2 size={10} /> : <Target size={10} />}
                                    {item.term}
                                </span>
                                <span className="text-[9px] font-semibold capitalize text-slate-400 dark:text-[#8e887f]">{item.category}</span>
                            </div>
                            {item.evidence && (
                                <p className="mt-1.5 text-[10px] leading-snug text-slate-500 dark:text-[#aaa39a]">{item.evidence}</p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce2ec] bg-[#f8f8fb] px-4 py-6 text-center dark:border-[#3a3834] dark:bg-[#1f1f1d]">
                    <Search size={18} className="text-slate-400 dark:text-[#aaa39a]" />
                    <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-[#f4f1e9]">
                        {activeTab === 'matched' ? 'No direct matches yet' : 'No priority gaps found'}
                    </p>
                    <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-[#aaa39a]">
                        CareerVivid will update this as the page text changes.
                    </p>
                </div>
            )}
        </section>
    );
};
