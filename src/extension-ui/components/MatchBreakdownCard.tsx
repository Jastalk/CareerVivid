import React, { useMemo, useState } from 'react';
import {
    Briefcase,
    ChevronDown,
    ChevronUp,
    DollarSign,
    FileText,
    MapPin,
    Search,
    Sparkles,
    UserCheck,
} from 'lucide-react';

interface ScrapedJob {
    title: string;
    company: string;
    location?: string;
    description?: string;
    salary?: string;
}

interface MatchBreakdownCardProps {
    isJobSite: boolean;
    scrapedJob: ScrapedJob | null;
}

const truncate = (text: string, maxLength = 170) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}...`;
};

const compactText = (text?: string | null) => String(text || '').replace(/\s+/g, ' ').trim();

const extractSalary = (job: ScrapedJob | null): string | null => {
    const explicitSalary = compactText(job?.salary);
    if (explicitSalary) return explicitSalary;

    const source = compactText(`${job?.location || ''} ${job?.description || ''}`);
    const match = source.match(/\$[\d,.]+(?:\s?[Kk])?(?:\s*(?:-|–|to)\s*\$?[\d,.]+(?:\s?[Kk])?)?(?:\s*(?:\/|per\s*)\s*(?:yr|year|hr|hour|mo|month))?/i);
    return match?.[0]?.trim() || null;
};

const extractWorkMode = (job: ScrapedJob | null): string | null => {
    const source = compactText(`${job?.location || ''} ${job?.description || ''}`).toLowerCase();
    if (!source) return null;
    if (/\bremote\b/.test(source)) return 'Remote';
    if (/\bhybrid\b/.test(source)) return 'Hybrid';
    if (/\bon[-\s]?site\b|\bin office\b/.test(source)) return 'On-site';
    return null;
};

const extractLocation = (job: ScrapedJob | null): string | null => {
    const location = compactText(job?.location)
        .replace(/\b(remote|hybrid|on[-\s]?site|full[-\s]?time|part[-\s]?time|contract)\b/gi, '')
        .replace(/[·•|]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    if (!location || location.length > 80) return null;
    return location;
};

const getCandidateProfiles = (job: ScrapedJob | null): string[] => {
    const title = compactText(job?.title).toLowerCase();
    const description = compactText(job?.description).toLowerCase();
    const source = `${title} ${description}`;
    const profiles: string[] = [];

    const addProfile = (label: string, pattern: RegExp) => {
        if (profiles.length < 3 && pattern.test(source) && !profiles.includes(label)) {
            profiles.push(label);
        }
    };

    addProfile('React frontend builder', /\breact(?:\.js)?\b|front[-\s]?end|frontend/);
    addProfile('Modern JavaScript engineer', /\bjavascript\b|\bes6\b/);
    addProfile('TypeScript product engineer', /\btypescript\b|\bnext\.?js\b/);
    addProfile('API integration experience', /\brest(?:ful)?\b|\bapi\b|backend services/);
    addProfile('Responsive UI specialist', /\bresponsive\b|cross[-\s]?browser|accessible|accessibility|ui\/ux|ux\/ui/);
    addProfile('Agile collaborator', /\bagile\b|scrum|cross[-\s]?functional|product managers|designers|backend engineers/);
    addProfile('AI workflow operator', /\bai\b|machine learning|llm|automation/);

    if (profiles.length === 0 && job?.title) {
        profiles.push(`${job.title} candidate`);
    }

    return profiles.slice(0, 3);
};

const getRoleSignals = (job: ScrapedJob | null): string[] => {
    const description = compactText(job?.description).toLowerCase();
    const signals = [
        { label: 'React', pattern: /\breact(?:\.js)?\b/ },
        { label: 'JavaScript', pattern: /\bjavascript\b|\bes6\b/ },
        { label: 'TypeScript', pattern: /\btypescript\b/ },
        { label: 'Next.js', pattern: /\bnext\.?js\b/ },
        { label: 'REST APIs', pattern: /\brest(?:ful)?\b|\bapis?\b/ },
        { label: 'Reusable components', pattern: /reusable components|component-based/ },
        { label: 'Performance', pattern: /performance|speed|scalability|optimi[sz]e/ },
        { label: 'Cross-browser quality', pattern: /cross[-\s]?browser|browser compatibility/ },
        { label: 'Agile delivery', pattern: /\bagile\b|scrum/ },
        { label: 'Testing', pattern: /\bjest\b|\bcypress\b|testing framework/ },
        { label: 'CI/CD', pattern: /\bci\/cd\b|deployment practices|pipelines/ },
    ];

    return signals
        .filter(signal => signal.pattern.test(description))
        .map(signal => signal.label)
        .slice(0, 5);
};

const buildRoleSummary = (job: ScrapedJob | null, profiles: string[], signals: string[]): string[] => {
    const title = compactText(job?.title) || 'this role';
    const company = compactText(job?.company) || 'The company';
    const profile = profiles[0]?.replace(/\s*candidate$/i, '') || title;
    const signalText = signals.length
        ? signals.join(', ')
        : 'role-specific execution, collaboration, and clear delivery habits';

    return [
        `${company} is looking for a ${profile.toLowerCase()} who can deliver the core responsibilities of ${title}.`,
        `The strongest signals in this posting are ${signalText}, so the best resume angle should make those capabilities easy to scan.`,
    ];
};

export const MatchBreakdownCard: React.FC<MatchBreakdownCardProps> = ({
    isJobSite,
    scrapedJob,
}) => {
    const [isContextOpen, setIsContextOpen] = useState(false);
    const hasJobMetadata = Boolean(scrapedJob?.title || scrapedJob?.company);
    const hasJobDescription = Boolean(scrapedJob?.description?.trim());
    const salary = useMemo(() => extractSalary(scrapedJob), [scrapedJob]);
    const workMode = useMemo(() => extractWorkMode(scrapedJob), [scrapedJob]);
    const location = useMemo(() => extractLocation(scrapedJob), [scrapedJob]);
    const candidateProfiles = useMemo(() => getCandidateProfiles(scrapedJob), [scrapedJob]);
    const roleSignals = useMemo(() => getRoleSignals(scrapedJob), [scrapedJob]);
    const summarySentences = useMemo(
        () => buildRoleSummary(scrapedJob, candidateProfiles, roleSignals),
        [scrapedJob, candidateProfiles, roleSignals]
    );
    const contextHighlights = useMemo(() => {
        const description = scrapedJob?.description?.trim() || '';
        if (!description) return [];

        const bulletItems = description
            .split(/\n|•|·|●/)
            .map(item => item.trim())
            .filter(item => item.length > 32)
            .slice(0, 4);

        if (bulletItems.length >= 2) return bulletItems;

        return (description.match(/[^.!?]+[.!?]+/g) || [description])
            .map(item => item.trim())
            .filter(Boolean)
            .slice(0, 4);
    }, [scrapedJob?.description]);

    const metadataChips = [
        salary ? { key: 'salary', label: salary, icon: DollarSign, tone: 'emerald' } : null,
        workMode ? { key: 'workMode', label: workMode, icon: Briefcase, tone: 'indigo' } : null,
        location ? { key: 'location', label: location, icon: MapPin, tone: 'slate' } : null,
        candidateProfiles[0] ? { key: 'profile', label: candidateProfiles[0], icon: UserCheck, tone: 'amber' } : null,
    ].filter(Boolean) as Array<{ key: string; label: string; icon: typeof DollarSign; tone: 'emerald' | 'indigo' | 'slate' | 'amber' }>;

    const toneClasses = {
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
        indigo: 'border-[#d9d7fb] bg-[#f3f2ff] text-[#4a4392] dark:border-[#4d4a73] dark:bg-[#302f49] dark:text-[#b8b3ff]',
        slate: 'border-[#dce2ec] bg-[#f4f5f8] text-[#43546d] dark:border-[#3a3834] dark:bg-[#302e2a] dark:text-[#c9c3ba]',
        amber: 'border-[#e6dac8] bg-[#fffaf1] text-[#7c5b2c] dark:border-[#4a4035] dark:bg-[#302e2a] dark:text-[#d8c7a8]',
    };

    return (
        <section className="rounded-[22px] border border-[#ececf4] bg-white p-3.5 text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-[#3a3834] dark:bg-[#262522] dark:text-[#f4f1e9] dark:shadow-none">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e9ef] bg-[#f4f5f8] px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:border-[#3a3834] dark:bg-[#302e2a] dark:text-[#c9c3ba]">
                            <span className={`h-1.5 w-1.5 rounded-full ${hasJobMetadata ? 'bg-[#3b82f6]' : isJobSite ? 'bg-[#f2b705]' : 'bg-slate-400'}`} />
                            {hasJobMetadata ? 'Job detected' : isJobSite ? 'Scanning page' : 'No job detected'}
                        </span>
                    </div>
                    <h2 className="line-clamp-2 text-[15px] font-semibold leading-tight text-slate-950 dark:text-[#f4f1e9]">
                        {scrapedJob ? scrapedJob.title : isJobSite ? 'Scanning for job details' : 'No job detected'}
                    </h2>
                    {isJobSite && scrapedJob && (
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-[#aaa39a]">
                            {scrapedJob.company || 'Company detected'}
                        </p>
                    )}
                </div>
                {isJobSite && (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-[#e2e4ff] bg-[#eef0ff] text-[#4a4392] dark:border-[#4d4a73] dark:bg-[#302f49] dark:text-[#b8b3ff]">
                        <Briefcase size={15} />
                    </div>
                )}
            </div>

            {isJobSite && (!scrapedJob || !hasJobDescription) && (
                <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/80 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <div className="flex items-start gap-2">
                        <Search size={15} className="mt-0.5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
                        <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                                {hasJobMetadata ? 'Job found. Description still syncing.' : 'Scanning job page'}
                            </h4>
                            <p className="mt-0.5 text-[10px] leading-normal text-amber-800 dark:text-amber-300/80">
                                CareerVivid will refresh the brief once the page exposes a readable job description.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {isJobSite && scrapedJob && (
                <div className="mt-3 rounded-2xl border border-[#ececf4] bg-[#f8f8fb] p-3 dark:border-[#3a3834] dark:bg-[#1f1f1d]">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#4a4392] dark:text-[#b8b3ff]">
                        <Sparkles size={13} />
                        Job Brief
                    </div>

                    {metadataChips.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {metadataChips.map(chip => {
                                const Icon = chip.icon;
                                return (
                                    <span
                                        key={chip.key}
                                        className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${toneClasses[chip.tone]}`}
                                    >
                                        <Icon size={10} className="flex-shrink-0" />
                                        <span className="truncate">{chip.label}</span>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        {summarySentences.map(sentence => (
                            <p key={sentence} className="text-[11px] leading-snug text-slate-700 dark:text-[#c9c3ba]">
                                {sentence}
                            </p>
                        ))}
                    </div>

                    {roleSignals.length > 0 && (
                        <div className="mt-3">
                            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-[#8e887f]">
                                Core signals
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {roleSignals.map(signal => (
                                    <span
                                        key={signal}
                                        className="rounded-full border border-[#dce2ec] bg-white px-2 py-1 text-[9px] font-semibold text-[#43546d] dark:border-[#3a3834] dark:bg-[#262522] dark:text-[#c9c3ba]"
                                    >
                                        {signal}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {contextHighlights.length > 0 && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-[#ececf4] bg-white dark:border-[#3a3834] dark:bg-[#262522]">
                            <button
                                onClick={() => setIsContextOpen(prev => !prev)}
                                className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition-colors hover:bg-[#f4f3ff] dark:hover:bg-[#302f49]"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <FileText size={12} className="flex-shrink-0 text-[#7b75df] dark:text-[#b8b3ff]" />
                                    <span className="truncate text-[11px] font-semibold text-slate-800 dark:text-[#f4f1e9]">Captured job context</span>
                                </span>
                                {isContextOpen ? <ChevronUp size={12} className="text-slate-400 dark:text-[#aaa39a]" /> : <ChevronDown size={12} className="text-slate-400 dark:text-[#aaa39a]" />}
                            </button>
                            {isContextOpen && (
                                <div className="space-y-1.5 px-2.5 pb-2">
                                    {contextHighlights.map((item, index) => (
                                        <div key={`${item}-${index}`} className="flex items-start gap-1.5 text-[10px] leading-snug text-slate-600 dark:text-[#c9c3ba]">
                                            <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-[#aaa6ee] dark:bg-[#b8b3ff]" />
                                            <span>{truncate(item, 155)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};
