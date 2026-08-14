import React from 'react';
import {
    Briefcase,
    Building2,
    ExternalLink,
    GraduationCap,
    Search,
    Sparkles,
    X,
} from 'lucide-react';
import type { JobBoardRoute, ResumeSearchQueryResult } from '../../utils/jobBoardRouter';

interface JobDiscoveryModalProps {
    open: boolean;
    onClose: () => void;
    routes: JobBoardRoute[];
    queryResult: ResumeSearchQueryResult;
    activeResumeTitle?: string | null;
}

const routeIcons: Record<JobBoardRoute['id'], React.ElementType> = {
    linkedin: Briefcase,
    indeed: Search,
    handshake: GraduationCap,
    builtin: Building2,
};

const routeAccentClasses: Record<JobBoardRoute['id'], string> = {
    linkedin: 'bg-[#eef5ff] text-[#2563eb] dark:bg-[#1d2a42] dark:text-[#93c5fd]',
    indeed: 'bg-[#eef0ff] text-[#4a4392] dark:bg-[#302f49] dark:text-[#b8b3ff]',
    handshake: 'bg-[#fff7ed] text-[#a16207] dark:bg-[#332a1f] dark:text-[#facc15]',
    builtin: 'bg-[#ecfdf5] text-[#047857] dark:bg-[#123126] dark:text-[#86efac]',
};

export const JobDiscoveryModal: React.FC<JobDiscoveryModalProps> = ({
    open,
    onClose,
    routes,
    queryResult,
    activeResumeTitle,
}) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-3 pb-3 pt-8 backdrop-blur-sm dark:bg-black/55">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="job-discovery-title"
                className="max-h-[92vh] w-full overflow-hidden rounded-[26px] border border-[#e6dac8] bg-[#fffaf6] shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-[#3a3834] dark:bg-[#1f1f1d] dark:shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
            >
                <div className="flex items-start justify-between gap-3 border-b border-[#efe5d6] px-4 py-4 dark:border-[#3a3834]">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e6dac8] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#665a4a] dark:border-[#3a3834] dark:bg-[#262522] dark:text-[#c9c3ba]">
                            <Sparkles size={12} className="text-[#4a4392] dark:text-[#b8b3ff]" />
                            Resume-powered search
                        </div>
                        <h2 id="job-discovery-title" className="mt-2 text-lg font-semibold leading-tight text-[#211b16] dark:text-[#f4f1e9]">
                            No job description found here
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-[#665a4a] dark:text-[#aaa39a]">
                            CareerVivid could not detect a usable job post on this page, so these boards are preloaded with your strongest resume signal.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close job discovery modal"
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#e6dac8] bg-white text-[#665a4a] transition-colors hover:bg-[#fff4e2] hover:text-[#211b16] dark:border-[#3a3834] dark:bg-[#262522] dark:text-[#c9c3ba] dark:hover:bg-[#302e2a] dark:hover:text-[#f4f1e9]"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="max-h-[calc(92vh-112px)] overflow-y-auto px-4 py-4">
                    <div className="rounded-2xl border border-[#e6dac8] bg-white p-3 dark:border-[#3a3834] dark:bg-[#262522]">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b7a67] dark:text-[#aaa39a]">
                            Search query
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {queryResult.terms.map(term => (
                                <span
                                    key={term}
                                    className="rounded-full border border-[#d9d7fb] bg-[#f3f2ff] px-2.5 py-1 text-[11px] font-semibold text-[#4f4a9f] dark:border-[#4d4a73] dark:bg-[#302f49] dark:text-[#d8d5ff]"
                                >
                                    {term}
                                </span>
                            ))}
                        </div>
                        {activeResumeTitle && (
                            <p className="mt-2 truncate text-[11px] text-[#8b7a67] dark:text-[#aaa39a]">
                                From {activeResumeTitle}
                            </p>
                        )}
                    </div>

                    <div className="mt-3 grid gap-2">
                        {routes.map(route => {
                            const Icon = routeIcons[route.id];
                            return (
                                <a
                                    key={route.id}
                                    href={route.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group flex items-center gap-3 rounded-2xl border border-[#ececf4] bg-white p-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all hover:border-[#c8c7f4] hover:shadow-[0_12px_26px_rgba(15,23,42,0.08)] dark:border-[#3a3834] dark:bg-[#262522] dark:shadow-none dark:hover:border-[#4d4a73] dark:hover:bg-[#302e2a]"
                                >
                                    <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${routeAccentClasses[route.id]}`}>
                                        <Icon size={18} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-slate-950 dark:text-[#f4f1e9]">
                                            {route.label}
                                        </span>
                                        <span className="mt-0.5 block text-[11px] leading-snug text-[#64748b] dark:text-[#aaa39a]">
                                            {route.description}
                                        </span>
                                    </span>
                                    <ExternalLink size={14} className="flex-shrink-0 text-[#9ca3af] transition-colors group-hover:text-[#4a4392] dark:text-[#6d675f] dark:group-hover:text-[#b8b3ff]" />
                                </a>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
};
