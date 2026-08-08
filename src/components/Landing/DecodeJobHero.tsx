import React, { useState } from 'react';
import { ArrowRight, Check, ClipboardPaste, Compass, GraduationCap, Layers, ListChecks, Sparkles } from 'lucide-react';
import { SAMPLE_JOB_DECODES, DEFAULT_DECODE_ID, type JobDecode } from '../../data/sampleJobDecodes';

/**
 * Landing hero: decode a job posting into what it actually wants.
 *
 * The hero IS the product rather than a description of it — a visitor sees a
 * real decode before signing up, or being asked for anything.
 *
 * The paste field is deliberately disabled until the public
 * `decodeJobDescription` endpoint ships. Accepting someone's posting and
 * returning one of the hand-written samples would read as "we analysed this"
 * when nothing was analysed, so the samples are labelled as examples and the
 * input announces itself as the next step instead.
 */

const card =
    'rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] shadow-sm dark:border-[#37332d] dark:bg-[#262522]';
const heading = 'text-[#211b16] dark:text-[#f4f1e9]';
const muted = 'text-[#8b6a3f] dark:text-[#caa26c]';

const BlockTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
    <h3 className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${muted}`}>
        {icon}
        {children}
    </h3>
);

const DecodeResult: React.FC<{ decode: JobDecode }> = ({ decode }) => (
    <div className="mt-6 space-y-4">
        {/* 1 — what the role actually is */}
        <div className={`${card} p-5 sm:p-6`}>
            <BlockTitle icon={<Compass size={13} />}>What this role actually is</BlockTitle>
            <p className={`mt-1.5 text-lg font-extrabold leading-snug ${heading}`}>
                {decode.roleTitle} · {decode.company}
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-[#4a3f35] dark:text-[#cfc7b8]">{decode.summary}</p>
        </div>

        {/* 2 — must-have vs nice-to-have */}
        <div className="grid gap-4 sm:grid-cols-2">
            <div className={`${card} p-5`}>
                <BlockTitle icon={<ListChecks size={13} />}>Actually required</BlockTitle>
                <ul className="mt-2.5 space-y-2">
                    {decode.mustHave.map((item) => (
                        <li key={item} className="flex gap-2 text-sm leading-snug text-[#4a3f35] dark:text-[#cfc7b8]">
                            <Check size={15} className="mt-0.5 shrink-0 text-[#8b5a16] dark:text-[#caa26c]" />
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
            <div className={`${card} p-5`}>
                <BlockTitle icon={<Layers size={13} />}>Listed, but negotiable</BlockTitle>
                <ul className="mt-2.5 space-y-2">
                    {decode.niceToHave.map((item) => (
                        <li key={item} className="flex gap-2 text-sm leading-snug text-[#6b6055] dark:text-[#a89e90]">
                            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#bfa782]" />
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        {/* 3 — the skills underneath */}
        <div className={`${card} p-5 sm:p-6`}>
            <BlockTitle icon={<Sparkles size={13} />}>The skills underneath</BlockTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {decode.skills.map((skill) => (
                    <div key={skill.name} className="rounded-xl bg-[#f6ecdd]/60 p-3.5 dark:bg-[#302e2a]">
                        <p className={`text-sm font-bold ${heading}`}>{skill.name}</p>
                        <p className="mt-1 text-[13px] leading-snug text-[#6b6055] dark:text-[#a89e90]">{skill.why}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* 4 — the interview it leads to */}
        <div className={`${card} p-5 sm:p-6`}>
            <BlockTitle icon={<GraduationCap size={13} />}>The interview this leads to</BlockTitle>
            <ol className="mt-3 space-y-2.5">
                {decode.interviewLoop.map((stage, i) => (
                    <li key={stage.stage} className="flex gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#211b16] text-[10px] font-bold text-white dark:bg-[#caa26c] dark:text-[rgb(33,27,22)]">
                            {i + 1}
                        </span>
                        <p className="text-sm leading-snug text-[#4a3f35] dark:text-[#cfc7b8]">
                            <span className={`font-bold ${heading}`}>{stage.stage}.</span> {stage.detail}
                        </p>
                    </li>
                ))}
            </ol>
        </div>

        {/* 5 — the gap plan: the part only CareerVivid can answer */}
        <div className="rounded-2xl border border-[#d9c09a] bg-gradient-to-br from-[#fff6e6] to-[#fdeed6] p-5 shadow-sm dark:border-[#4a4034] dark:from-[#2b2822] dark:to-[#302a21] sm:p-6">
            <BlockTitle icon={<ArrowRight size={13} />}>Close the gap</BlockTitle>
            <div className="mt-3 space-y-2.5">
                {decode.gapPlan.map((step) => (
                    <a
                        key={`${step.skill}-${step.href}`}
                        href={step.href}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-[#e4d3bc] bg-white/70 px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#bfa782] hover:shadow-md dark:border-[#3f3931] dark:bg-[#262522]/70"
                    >
                        <div className="min-w-0">
                            <p className={`truncate text-sm font-bold ${heading}`}>{step.action}</p>
                            <p className={`mt-0.5 truncate text-[12px] font-semibold ${muted}`}>
                                {step.skill} · {step.meta}
                            </p>
                        </div>
                        <ArrowRight
                            size={15}
                            className="shrink-0 text-[#bfa782] transition group-hover:translate-x-0.5 group-hover:text-[#8b5a16]"
                        />
                    </a>
                ))}
            </div>
        </div>
    </div>
);

const DecodeJobHero: React.FC = () => {
    const [activeId, setActiveId] = useState<string>(DEFAULT_DECODE_ID);
    const active = SAMPLE_JOB_DECODES.find((d) => d.id === activeId) ?? SAMPLE_JOB_DECODES[0];

    return (
        <section className="border-b border-[#eadfcd] bg-[#fdf8ef] py-14 dark:border-[#2f2c27] dark:bg-[#1d1c1a] sm:py-20">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <p className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] ${muted}`}>
                    <Sparkles size={13} /> Decode a job posting
                </p>

                <h1 className={`mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl ${heading}`}>
                    Most tools help you apply.
                    <br />
                    We make you the candidate they call back.
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5a5047] dark:text-[#b9b0a2] sm:text-lg">
                    Paste a job posting and see what it actually wants — the requirements that are real, the
                    skills underneath the buzzwords, the interview it leads to, and exactly what to study first.
                </p>

                {/* Input — announces itself as the next step rather than faking a result */}
                <div className={`${card} mt-7 p-4 sm:p-5`}>
                    <label htmlFor="jd-paste" className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${muted}`}>
                        <ClipboardPaste size={13} /> Paste a job description
                    </label>
                    <textarea
                        id="jd-paste"
                        disabled
                        rows={2}
                        placeholder="Live analysis of your own posting is landing shortly — try a real example below in the meantime."
                        className="mt-2.5 w-full resize-none rounded-xl border border-[#e4d3bc] bg-[#faf3e7] px-3.5 py-3 text-sm text-[#4a3f35] placeholder:text-[#a3937d] disabled:cursor-not-allowed dark:border-[#3f3931] dark:bg-[#211f1c] dark:text-[#cfc7b8] dark:placeholder:text-[#7d7365]"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`mr-1 text-[12px] font-bold ${muted}`}>Or decode a real posting:</span>
                        {SAMPLE_JOB_DECODES.map((decode) => {
                            const isActive = decode.id === active.id;
                            return (
                                <button
                                    key={decode.id}
                                    type="button"
                                    onClick={() => setActiveId(decode.id)}
                                    aria-pressed={isActive}
                                    className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition ${
                                        isActive
                                            ? 'bg-[#211b16] text-white shadow-sm dark:bg-[#caa26c] dark:text-[rgb(33,27,22)]'
                                            : 'border border-[#e4d3bc] bg-white/60 text-[#6b6055] hover:border-[#bfa782] dark:border-[#3f3931] dark:bg-[#262522]/60 dark:text-[#a89e90]'
                                    }`}
                                >
                                    {decode.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <p className={`mt-3 text-[12px] font-semibold ${muted}`}>
                    Example decodes, written by our team — not generated for this page.
                </p>

                <DecodeResult decode={active} />

                <div className="mt-7 flex flex-wrap items-center gap-3">
                    <a
                        href="/signup"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#211b16] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#8b5a16]/10 transition hover:-translate-y-0.5 hover:bg-[#3a2b20]"
                    >
                        Start for free <ArrowRight size={16} />
                    </a>
                    <a
                        href="/learning"
                        className="inline-flex items-center gap-2 rounded-xl border border-[#e4d3bc] px-5 py-3 text-sm font-semibold text-[#211b16] transition hover:border-[#bfa782] hover:bg-white/60 dark:border-[#3f3931] dark:text-[#f4f1e9] dark:hover:bg-[#262522]/60"
                    >
                        Browse the courses
                    </a>
                    <span className={`text-[12px] font-semibold ${muted}`}>No credit card. Coding Interview Patterns is free.</span>
                </div>
            </div>
        </section>
    );
};

export default DecodeJobHero;
