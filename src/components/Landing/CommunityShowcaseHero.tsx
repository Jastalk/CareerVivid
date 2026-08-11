import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    Briefcase,
    CheckCircle2,
    AppWindow,
    FileText,
    LayoutDashboard,
    MessageSquareText,
    Mic,
    Wand2,
} from 'lucide-react';

const trustSignalKeys = ['direct_links', 'resume_prep', 'chrome_extension'];

const heroStoryAvatars = [
    { label: 'career-switcher', src: '/avatars/persona-maya.jpg', fallback: 'M', tone: 'bg-[#f3f2ff] text-[#625bd5]' },
    { label: 'new-grad', src: '/avatars/persona-alex.jpg', fallback: 'A', tone: 'bg-[#f7fff8] text-[#15803d]' },
    { label: 'busy-applicant', src: '/avatars/persona-jordan.jpg', fallback: 'J', tone: 'bg-[#fff7e8] text-[#a16207]' },
];

const ROTATION_MS = 7000;

const ProgressBar = ({ value, tone = 'bg-[#625bd5]' }: { value: number; tone?: string }) => (
    <div className="h-2 overflow-hidden rounded-full bg-[#ece2d2]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
    </div>
);

const MiniMetric = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
    <div className="rounded-xl border border-[#eadbc5] bg-white/85 p-2.5 shadow-sm">
        <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
            <LayoutDashboard size={15} />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7d6e5e]">{label}</p>
        <p className="mt-0.5 text-lg font-semibold text-[#211b16]">{value}</p>
    </div>
);

const ResumeEditorPreview = () => {
    const { t } = useTranslation();

    return <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(220px,250px)]">
        <div className="min-w-0 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a97935]">{t('landing.community_showcase.resume.my_resumes')}</p>
                    <h3 className="text-lg font-semibold text-[#211b16]">{t('landing.community_showcase.resume.workspace')}</h3>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#625bd5] px-3 text-sm font-bold text-white shadow-lg shadow-[#625bd5]/15">
                    <FileText size={16} />
                    {t('landing.community_showcase.resume.new_resume')}
                </button>
            </div>

            <div className="rounded-xl border border-[#eadbc5] bg-white/90 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#211b16]">{t('landing.community_showcase.resume.tailored_for')}</p>
                    <span className="rounded-full bg-[#f3f2ff] px-2.5 py-1 text-xs font-bold text-[#625bd5]">{t('landing.community_showcase.resume.preview')}</span>
                </div>
                <div className="rounded-lg border border-[#eadbc5] bg-[#fffaf1] p-3">
                    <div className="border-b border-[#eadbc5] pb-2">
                        <h4 className="text-base font-semibold text-[#211b16]">Jiawen Zhu</h4>
                        <p className="text-sm font-bold text-[#665a4a]">{t('landing.community_showcase.resume.role')}</p>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                        <div className="space-y-2">
                            {[
                                [t('landing.community_showcase.resume.sections.profile'), t('landing.community_showcase.resume.copy.profile')],
                                [t('landing.community_showcase.resume.sections.experience'), t('landing.community_showcase.resume.copy.experience')],
                                [t('landing.community_showcase.resume.sections.education'), t('landing.community_showcase.resume.copy.education')],
                            ].map(([label, copy]) => (
                                <div key={label}>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a97935]">{label}</p>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-[#665a4a]">{copy}</p>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a97935]">{t('landing.community_showcase.resume.sections.contact')}</p>
                                <p className="mt-1 text-xs font-semibold text-[#665a4a]">{t('landing.community_showcase.resume.contact_line')}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a97935]">{t('landing.community_showcase.resume.sections.skills')}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {['HTML', 'CSS', 'JavaScript', 'React'].map((skill) => (
                                        <span key={skill} className="rounded-full bg-[#f7fff8] px-2 py-1 text-[11px] font-bold text-[#137245]">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {['profile', 'experience', 'contact', 'skills', 'education', 'export'].map((section) => (
                        <span key={section} className="rounded-full border border-[#eadbc5] bg-[#f9efe0]/70 px-2.5 py-1 text-[11px] font-semibold text-[#665a4a]">
                            {t(`landing.community_showcase.resume.chips.${section}`)}
                        </span>
                    ))}
                </div>
            </div>
        </div>

        <aside className="border-t border-[#eadbc5] bg-[#f9efe0]/80 p-3 lg:border-l lg:border-t-0">
            <div className="rounded-xl border border-[#eadbc5] bg-white/90 p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a97935]">{t('landing.community_showcase.resume.create_section')}</p>
                <h4 className="mt-1 text-base font-semibold text-[#211b16]">{t('landing.community_showcase.resume.paste_title')}</h4>
                <p className="mt-3 text-sm font-medium leading-relaxed text-[#665a4a]">
                    {t('landing.community_showcase.resume.paste_body')}
                </p>
                <div className="mt-3 rounded-lg border border-dashed border-[#d8c6ad] bg-[#fffaf1] p-3 text-xs font-semibold leading-5 text-[#8a7865]">
                    {t('landing.community_showcase.resume.paste_placeholder')}
                </div>
                <button className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#625bd5] text-sm font-semibold text-white">
                    <Wand2 size={15} />
                    {t('landing.community_showcase.resume.tailor_job')}
                </button>
            </div>
        </aside>
    </div>;
};

const MockInterviewPreview = () => {
    const { t } = useTranslation();

    return <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(220px,250px)]">
        <div className="min-w-0 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a97935]">{t('landing.community_showcase.interview.workspace')}</p>
                    <h3 className="text-lg font-semibold text-[#211b16]">{t('landing.community_showcase.interview.title')}</h3>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#625bd5] px-3 text-sm font-bold text-white shadow-lg shadow-[#625bd5]/15">
                    <Mic size={16} />
                    {t('landing.community_showcase.interview.start_mode')}
                </button>
            </div>

            <div className="rounded-xl border border-[#eadbc5] bg-white/90 p-3 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#fff6f6] p-2.5 text-[#b64a5a]">
                        <MessageSquareText size={21} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a97935]">{t('landing.community_showcase.interview.prompt')}</p>
                        <p className="mt-2 text-base font-semibold leading-6 text-[#211b16]">{t('landing.community_showcase.interview.prompt_body')}</p>
                    </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {[
                        [t('landing.community_showcase.interview.mode'), t('landing.community_showcase.interview.behavioral'), 'bg-[#f3f2ff] text-[#625bd5]'],
                        [t('landing.community_showcase.interview.difficulty'), t('landing.community_showcase.interview.standard'), 'bg-[#fff7e8] text-[#9a651f]'],
                        [t('landing.community_showcase.interview.duration'), t('landing.community_showcase.interview.duration_value'), 'bg-[#f7fff8] text-[#137245]'],
                    ].map(([label, value, tone]) => (
                        <div key={label} className="rounded-lg border border-[#eadbc5] bg-[#f9efe0]/60 p-3">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
                            <p className="mt-3 text-sm font-semibold text-[#211b16]">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-4 rounded-lg border border-[#eadbc5] bg-[#f9efe0]/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a97935]">{t('landing.community_showcase.interview.career_paths')}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {['technology', 'finance', 'creative'].map((path) => (
                            <span key={path} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#665a4a]">
                                {t(`landing.community_showcase.interview.paths.${path}`)}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <aside className="border-t border-[#eadbc5] bg-[#f9efe0]/80 p-3 lg:border-l lg:border-t-0">
            <div className="rounded-xl border border-[#eadbc5] bg-white/90 p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a97935]">{t('landing.community_showcase.interview.recent_sessions')}</p>
                <h4 className="mt-1 text-base font-semibold text-[#211b16]">{t('landing.community_showcase.interview.saved_count')}</h4>
                <div className="mt-3 space-y-2">
                    {[
                        [t('landing.community_showcase.interview.sessions.fraud'), t('landing.community_showcase.interview.practice_again')],
                        [t('landing.community_showcase.interview.sessions.incident'), t('landing.community_showcase.interview.report')],
                        [t('landing.community_showcase.interview.sessions.refactor'), t('landing.community_showcase.interview.practice_again')],
                    ].map(([title, action]) => (
                        <div key={title} className="rounded-lg border border-[#eadbc5] bg-[#fffaf1] p-3">
                            <p className="text-sm font-semibold leading-tight text-[#211b16]">{title}</p>
                            <p className="mt-1 text-xs font-bold text-[#625bd5]">{action}</p>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    </div>;
};

const JobPipelinePreview = () => {
    const { t } = useTranslation();

    return <div className="grid gap-0">
        <div className="min-w-0 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a97935]">{t('landing.community_showcase.pipeline.label')}</p>
                    <h3 className="text-lg font-semibold text-[#211b16]">{t('landing.community_showcase.pipeline.title')}</h3>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#625bd5] px-3 text-sm font-bold text-white shadow-lg shadow-[#625bd5]/15">
                    <Briefcase size={16} />
                    {t('landing.community_showcase.pipeline.track_new')}
                </button>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
                <MiniMetric label={t('landing.community_showcase.pipeline.metrics.total')} value="36" tone="bg-[#f7f1e7] text-[#665a4a]" />
                <MiniMetric label={t('landing.community_showcase.pipeline.metrics.active')} value="29" tone="bg-[#f3f2ff] text-[#625bd5]" />
                <MiniMetric label={t('landing.community_showcase.pipeline.metrics.interviews')} value="3" tone="bg-[#fff7e8] text-[#9a651f]" />
            </div>

            <div className="mb-3 rounded-xl border border-[#eadbc5] bg-white/90 p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a97935]">{t('landing.community_showcase.pipeline.controls')}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <span className="rounded-lg border border-[#eadbc5] bg-[#fffaf1] px-3 py-2 text-xs font-bold text-[#8a7865]">{t('landing.community_showcase.pipeline.search_jobs')}</span>
                    <span className="rounded-lg border border-[#eadbc5] bg-[#fffaf1] px-3 py-2 text-xs font-bold text-[#665a4a]">{t('landing.community_showcase.pipeline.kanban')}</span>
                    <span className="rounded-lg border border-[#eadbc5] bg-[#fffaf1] px-3 py-2 text-xs font-bold text-[#665a4a]">{t('landing.community_showcase.pipeline.strategy')}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                    { title: t('landing.community_showcase.pipeline.columns.to_apply'), count: 3, color: 'bg-[#7d6e5e]', cards: [[t('landing.community_showcase.pipeline.cards.ux_role'), 'Google', t('landing.community_showcase.pipeline.match_61')]] },
                    { title: t('landing.community_showcase.pipeline.columns.applied'), count: 33, color: 'bg-[#625bd5]', cards: [[t('landing.community_showcase.pipeline.cards.ai_role'), 'OpenAI', t('landing.community_showcase.pipeline.match_86')]] },
                    { title: t('landing.community_showcase.pipeline.columns.interview'), count: 0, color: 'bg-[#a97935]', cards: [[t('landing.community_showcase.pipeline.cards.when_interviews'), t('landing.community_showcase.pipeline.cards.drop_here'), '']] },
                ].map((column) => (
                    <div key={column.title} className="min-h-[150px] min-w-0 overflow-hidden rounded-xl border border-[#eadbc5] bg-[#f9efe0]/70 p-2 sm:p-2.5">
                        <div className="mb-2 flex items-center justify-between gap-1.5">
                            <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold leading-tight text-[#211b16] sm:text-xs">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${column.color}`} />
                                <span className="truncate">{column.title}</span>
                            </span>
                            <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#665a4a] shadow-sm sm:px-2 sm:text-xs">{column.count}</span>
                        </div>
                        <div className="space-y-2">
                            {column.cards.map(([role, company, meta]) => (
                                <div key={`${company}-${role}`} className="min-w-0 rounded-lg border border-[#eadbc5] bg-white/90 p-2 shadow-sm sm:p-2.5">
                                    <p className="break-words text-[12px] font-semibold leading-snug text-[#211b16] sm:text-[13px]">{role}</p>
                                    <p className="mt-1 truncate text-[11px] font-semibold text-[#665a4a] sm:text-xs">{company}</p>
                                    {meta && <p className="mt-2 text-[11px] font-bold leading-tight text-[#625bd5] sm:text-xs">{meta}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <aside className="border-t border-[#eadbc5] bg-[#f9efe0]/80 p-3">
            <div className="grid gap-3 rounded-xl border border-[#eadbc5] bg-white/90 p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a97935]">{t('landing.community_showcase.pipeline.plan_summary')}</p>
                    <h4 className="mt-1 text-base font-semibold text-[#211b16]">{t('landing.community_showcase.pipeline.next_actions')}</h4>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-[#665a4a]">
                    {t('landing.community_showcase.pipeline.next_actions_body')}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:w-[200px]">
                    {[
                        t('landing.community_showcase.pipeline.summary_due'),
                        t('landing.community_showcase.pipeline.summary_next'),
                        t('landing.community_showcase.pipeline.summary_high_fit'),
                        t('landing.community_showcase.pipeline.summary_prep'),
                    ].map((item) => (
                        <span key={item} className="rounded-lg border border-[#eadbc5] bg-[#fffaf1] px-2 py-2 text-center text-xs font-semibold text-[#665a4a]">
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </aside>
    </div>;
};

const ProductPreview = () => {
    const { t } = useTranslation();
    const [activeSlide, setActiveSlide] = useState(0);
    const previewTabs = [
        { label: t('landing.community_showcase.tabs.resume_builder'), icon: FileText },
        { label: t('landing.community_showcase.tabs.interview_studio'), icon: Mic },
        { label: t('landing.community_showcase.tabs.career_pipeline'), icon: Briefcase },
    ];

    useEffect(() => {
        const timer = window.setInterval(() => {
            setActiveSlide((current) => (current + 1) % previewTabs.length);
        }, ROTATION_MS);
        return () => window.clearInterval(timer);
    }, []);

    const renderSlide = () => {
        if (activeSlide === 0) return <ResumeEditorPreview />;
        if (activeSlide === 1) return <MockInterviewPreview />;
        return <JobPipelinePreview />;
    };

    return (
        <div className="relative">
            <div className="absolute -inset-4 rounded-[28px] bg-[#d7b27a]/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-xl border border-[#e4d3bc] bg-[#fffaf1] shadow-2xl shadow-[#8b5a16]/10">
                <div className="flex items-center justify-between border-b border-[#eadbc5] bg-[#f9efe0] px-4 py-2">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-rose-400" />
                        <span className="h-3 w-3 rounded-full bg-amber-400" />
                        <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="hidden items-center gap-2 rounded-full border border-[#e4d3bc] bg-[#fffaf1] px-3 py-1 text-xs font-semibold text-[#665a4a] sm:flex">
                        <AppWindow size={14} />
                        {t('landing.community_showcase.workspace_label')}
                    </div>
                </div>

                <div className="border-b border-[#eadbc5] bg-[#fffaf1] px-3 py-2">
                    <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label={t('landing.community_showcase.workspace_preview')}>
                        {previewTabs.map(({ label, icon: Icon }, index) => {
                            const isActive = activeSlide === index;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setActiveSlide(index)}
                                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                        isActive
                                            ? 'border-[#625bd5] bg-[#f3f2ff] text-[#625bd5]'
                                            : 'border-[#eadbc5] bg-white/70 text-[#665a4a] hover:border-[#d8c6ad]'
                                    }`}
                                >
                                    <Icon size={15} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2" aria-hidden="true">
                        {previewTabs.map(({ label }, index) => (
                            <div key={label} className="h-1.5 overflow-hidden rounded-full bg-[#eadbc5]">
                                <div className={`h-full rounded-full transition-all duration-500 ${activeSlide === index ? 'w-full bg-[#625bd5]' : 'w-0 bg-[#625bd5]'}`} />
                            </div>
                        ))}
                    </div>
                </div>

                <div key={activeSlide} className="animate-in fade-in duration-500">
                    {renderSlide()}
                </div>
            </div>
        </div>
    );
};

const CompactProductPreview = () => {
    const { t } = useTranslation();

    return <div className="rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-4 shadow-lg shadow-[#8b5a16]/10">
        <div className="mb-4 flex items-center justify-between gap-3">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a97935]">{t('landing.community_showcase.compact.saved_role')}</p>
                <h3 className="mt-1 text-lg font-semibold leading-tight text-[#211b16]">{t('landing.community_showcase.compact.role')}</h3>
                <p className="mt-1 text-sm font-semibold text-[#665a4a]">{t('landing.community_showcase.compact.company_line')}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3f2ff] text-[#625bd5]">
                <Briefcase size={22} />
            </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
            {[
                [t('landing.community_showcase.compact.match'), '75%'],
                [t('landing.community_showcase.compact.status'), t('landing.community_showcase.compact.to_apply')],
                [t('landing.community_showcase.compact.prep'), t('landing.community_showcase.compact.ready')],
            ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#eadbc5] bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a97935]">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-[#211b16]">{value}</p>
                </div>
            ))}
        </div>
    </div>;
};

export function CommunityShowcaseHero() {
    const { t } = useTranslation();

    return (
        <section className="relative overflow-hidden border-b border-[#e6dac8] bg-[#f7f1e7] pt-16 pb-6 text-[#211b16] sm:pt-24 sm:pb-8 xl:pt-20 xl:pb-6 2xl:pt-28 2xl:pb-10">
            <div className="pointer-events-none absolute inset-0 opacity-55 cv-warm-grid" />
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-12 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div>
                        <div className="mb-4 flex max-w-xl items-center gap-3 rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 px-3 py-2.5 shadow-sm sm:mb-5 sm:px-4 sm:py-3">
                            <div className="flex -space-x-3" aria-hidden="true">
                                {heroStoryAvatars.map(({ label, src, fallback, tone }) => (
                                    <span
                                        key={label}
                                        className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#fffaf1] text-sm font-semibold shadow-sm sm:h-10 sm:w-10 ${tone}`}
                                    >
                                        {src ? (
                                            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                                        ) : (
                                            fallback
                                        )}
                                    </span>
                                ))}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a97935]">{t('landing.community_showcase.hero.story_label')}</p>
                                <p className="mt-1 text-xs font-bold leading-5 text-[#211b16] sm:text-sm">
                                    {t('landing.community_showcase.hero.story_quote')}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a97935]">
                            {t('landing.community_showcase.hero.eyebrow')}
                        </p>

                        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[0.96] tracking-tight text-[#211b16] sm:text-5xl xl:text-6xl 2xl:text-7xl">
                            {t('landing.community_showcase.hero.title')}
                        </h1>

                        <div className="mt-5 max-w-2xl rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/80 p-4 shadow-sm shadow-[#8b5a16]/5 sm:mt-7 sm:p-5">
                            <p className="text-base font-medium leading-7 text-[#665a4a] sm:text-[17px] sm:leading-8">
                                {t('landing.community_showcase.hero.body')}
                            </p>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                            <a
                                href="/signup"
                                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl bg-[#211b16] px-6 py-4 text-base font-semibold text-white shadow-xl shadow-[#8b5a16]/10 transition hover:-translate-y-0.5 hover:bg-[#3a2b20]"
                            >
                                {t('landing.community_showcase.hero.start_free')} <ArrowRight size={19} />
                            </a>
                            <a
                                href="/learning"
                                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl border border-[#d8c6ad] bg-[#fffaf1] px-6 py-4 text-base font-semibold text-[#211b16] shadow-sm transition hover:-translate-y-0.5 hover:border-[#bfa782]"
                            >
                                {t('landing.community_showcase.hero.view_tracker')}
                            </a>
                        </div>

                        <div className="mt-8 hidden gap-3 xl:grid xl:grid-cols-3">
                            {trustSignalKeys.map((signal) => (
                                <div key={signal} className="flex items-start gap-2 rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/80 p-3 text-sm font-bold text-[#665a4a] shadow-sm">
                                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#137245]" />
                                    <span>{t(`landing.community_showcase.trust.${signal}`)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 hidden sm:block md:hidden">
                            <CompactProductPreview />
                        </div>
                    </div>

                    <div className="hidden xl:block">
                        <ProductPreview />
                    </div>
                </div>
            </div>
        </section>
    );
}

export default CommunityShowcaseHero;
