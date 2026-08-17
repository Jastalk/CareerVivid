/**
 * The job list you can read without an account.
 *
 * `/jobs/recommend` is the signed-in feed and stays exactly as it is: it ranks
 * against your profile and your resume, which is only possible once you have
 * both. This page is the same listings shown impersonally — newest first, no
 * ranking — so that someone deciding whether CareerVivid is worth signing up
 * for can see the actual jobs first.
 *
 * The match score is the thing an account buys, and the locked state says so
 * plainly rather than teasing. It is not withheld for leverage: a score is a
 * comparison against a resume, and without a resume there is nothing to
 * compare.
 *
 * Pagination is real URLs (/jobs, /jobs/2, …) rather than a state variable,
 * so a page of results can be linked, shared, and crawled.
 *
 * The surface is the public desk: MenuBar, window chrome on each listing, and
 * --cvl-* tokens throughout. Every job is a little window on the desk, which is
 * also why the title bar carries the employer rather than the role — you scan a
 * grid of these by company first.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Briefcase, MapPin, ExternalLink, Lock, Building2, Clock, AlertCircle, Loader2,
} from 'lucide-react';
import { MenuBar, PublicFooter } from '../components/Landing/live/PublicShell';
import '../components/Landing/live/liveLanding.css';
import { navigate } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';
import { toSafeExternalUrl } from '../utils/safeUrl';

const FEED_URL = 'https://us-west1-jastalk-firebase.cloudfunctions.net/publicJobFeed';

export interface PublicJob {
    id: string;
    title: string;
    company: string;
    location: string;
    workModel: string;
    jobType: string;
    seniority: string;
    salary: string;
    postedAt: string;
    sourceLabel: string;
    applyUrl: string;
    description: string;
}

/**
 * Read the page number out of /jobs/{n}; /jobs is page 1.
 *
 * Only digits. /jobs/{slug} is the employer job board, so a non-numeric segment
 * is a company, never a page — reading "stripe" as a page number would have
 * this component answer for a route that is not its own.
 */
export const pageFromPath = (pathname: string): number => {
    const match = pathname.match(/^\/jobs\/(\d+)\/?$/);
    const n = match ? Number(match[1]) : 1;
    return Number.isFinite(n) && n >= 1 ? n : 1;
};

export const pathForPage = (page: number): string => (page <= 1 ? '/jobs' : `/jobs/${page}`);

/**
 * The page numbers to show.
 *
 * Always the first and last, always a window around the current one, with gaps
 * marked rather than rendered as forty buttons.
 */
export function pageWindow(current: number, total: number): Array<number | 'gap'> {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = new Set<number>([1, total, current]);
    for (const offset of [-1, 1]) {
        const p = current + offset;
        if (p > 1 && p < total) pages.add(p);
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const out: Array<number | 'gap'> = [];
    let previous = 0;
    for (const p of sorted) {
        if (previous && p - previous > 1) out.push('gap');
        out.push(p);
        previous = p;
    }
    return out;
}

/** The employer, as the filename in a window's title bar. */
const cardFilename = (company: string): string => {
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${slug || 'listing'}.job`;
};

const Chip: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
    <span
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium"
        style={{
            background: 'var(--cvl-paper-2)',
            borderColor: 'var(--cvl-line)',
            color: 'var(--cvl-muted)',
        }}
    >
        {icon}
        {children}
    </span>
);

/**
 * The score, locked.
 *
 * Says what unlocks it and why, in that order. "Sign up to see more" is a
 * paywall; "we need a resume to compare against" is a reason, and a reason is
 * what makes someone click.
 */
const LockedScore: React.FC<{ signedIn: boolean }> = ({ signedIn }) => (
    <button
        type="button"
        onClick={() => navigate(signedIn ? '/newresume' : '/edit/new')}
        // .cvl-btn already carries the border, the paper fill and the hover that
        // pulls the border to purple; only the dash is this control's own — and
        // it has to be inline, because .cvl-btn sets the `border` shorthand and
        // would reset a `border-dashed` utility back to solid.
        className="cvl-btn group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left"
        style={{ borderStyle: 'dashed', color: 'var(--cvl-muted)' }}
    >
        <span className="flex items-center gap-2">
            <Lock size={13} className="shrink-0" />
            <span className="text-[12.5px] font-medium">
                {signedIn ? 'Add a resume to see your match' : 'See how well you match'}
            </span>
        </span>
        <span
            className="shrink-0 text-[12.5px] font-semibold group-hover:underline"
            style={{ color: 'var(--cvl-purple)' }}
        >
            {signedIn ? 'Build one' : 'Free account'}
        </span>
    </button>
);

const JobCard: React.FC<{ job: PublicJob; signedIn: boolean }> = ({ job, signedIn }) => (
    <article className="cvl-win cvl-win-lift flex flex-col">
        <div className="cvl-bar">
            <span className="cvl-dot cvl-dot-r" />
            <span className="cvl-dot cvl-dot-y" />
            <span className="cvl-dot cvl-dot-g" />
            <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                {cardFilename(job.company)}
            </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
            <header className="min-w-0">
                <h2 className="truncate text-[15px] font-semibold leading-snug tracking-tight">
                    {job.title}
                </h2>
                {job.company && (
                    <p
                        className="mt-1 flex items-center gap-1.5 truncate text-[13px]"
                        style={{ color: 'var(--cvl-muted)' }}
                    >
                        <Building2 size={12} className="shrink-0" />
                        <span className="truncate">{job.company}</span>
                    </p>
                )}
            </header>

            <div className="flex flex-wrap gap-1.5">
                {job.location && <Chip icon={<MapPin size={12} />}>{job.location}</Chip>}
                {job.workModel && <Chip>{job.workModel}</Chip>}
                {job.jobType && <Chip icon={<Briefcase size={12} />}>{job.jobType}</Chip>}
                {job.seniority && <Chip>{job.seniority}</Chip>}
            </div>

            {job.description && (
                <p className="line-clamp-3 text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                    {job.description}
                </p>
            )}

            {job.salary && (
                <p className="cvl-mono text-[13px] font-semibold" style={{ color: 'var(--cvl-green)' }}>
                    {job.salary}
                </p>
            )}

            <LockedScore signedIn={signedIn} />

            <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                {job.postedAt ? (
                    <span
                        className="cvl-mono inline-flex items-center gap-1.5 text-[11.5px]"
                        style={{ color: 'var(--cvl-faint)' }}
                    >
                        <Clock size={12} />
                        {job.postedAt}
                    </span>
                ) : <span />}
                {/*
                  * applyUrl comes from a scraped third-party feed, so it is not
                  * ours and it is not validated upstream. This is the only
                  * UNAUTHENTICATED page in the app that puts a third-party
                  * string in an href, and neither attribute below helps:
                  * browsers ignore target="_blank" for `javascript:` and run it
                  * in the current document, and rel has no bearing on scheme.
                  * toSafeExternalUrl rather than safeUrl because an apply link
                  * is always a web page — http/https only, no mailto, no
                  * relative path. A feed row that fails it renders as plain
                  * text rather than a live link.
                  */}
                {toSafeExternalUrl(job.applyUrl) ? (
                    <a
                        href={toSafeExternalUrl(job.applyUrl) as string}
                        target="_blank"
                        // noopener because these are third-party ATS pages; noreferrer
                        // keeps the employer from seeing which listing page sent them.
                        rel="noopener noreferrer nofollow"
                        className="cvl-cta inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition"
                    >
                        View job
                        <ExternalLink size={13} />
                    </a>
                ) : (
                    <span className="cvl-mono text-[11.5px]" style={{ color: 'var(--cvl-faint)' }}>
                        No apply link
                    </span>
                )}
            </div>
        </div>
    </article>
);

const CardSkeleton: React.FC = () => (
    <div className="cvl-win">
        <div className="cvl-bar">
            <span className="cvl-dot cvl-dot-r" />
            <span className="cvl-dot cvl-dot-y" />
            <span className="cvl-dot cvl-dot-g" />
        </div>
        <div className="animate-pulse space-y-3 p-5">
            <div className="h-4 w-3/4 rounded" style={{ background: 'var(--cvl-line)' }} />
            <div className="h-3 w-1/2 rounded" style={{ background: 'var(--cvl-line)' }} />
            <div className="h-16 rounded-xl" style={{ background: 'var(--cvl-paper-2)' }} />
            <div className="h-10 rounded-xl" style={{ background: 'var(--cvl-paper-2)' }} />
        </div>
    </div>
);

const PublicJobsListPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [page, setPage] = useState(() => pageFromPath(window.location.pathname));
    const [jobs, setJobs] = useState<PublicJob[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // This app has no <Router>; the path is the source of truth and popstate is
    // how Back reaches us. See src/utils/navigation.ts.
    useEffect(() => {
        const onPop = () => setPage(pageFromPath(window.location.pathname));
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');

        fetch(`${FEED_URL}?page=${page}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((data) => {
                if (cancelled) return;
                setJobs(Array.isArray(data.jobs) ? data.jobs : []);
                setTotalPages(Math.max(1, Number(data.totalPages) || 1));
            })
            .catch(() => {
                if (!cancelled) setError('We could not load jobs just now. Please try again in a moment.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [page]);

    const goToPage = useCallback((next: number) => {
        navigate(pathForPage(next));
        setPage(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const canonical = `https://careervivid.app${pathForPage(page)}`;

    return (
        <div className="cvl min-h-screen">
            <Helmet>
                {/* A single expression: Helmet rejects a <title> with more than one child. */}
                <title>{page > 1 ? `Open Jobs — Page ${page}` : 'Browse Open Jobs'}</title>
                <meta
                    name="description"
                    content="Browse verified, still-open job listings. Every posting is link-checked before it appears, so you never open a role that was filled weeks ago."
                />
                {/* Self-referencing per page: paginated results are distinct
                    pages, and canonicalising them all to page 1 would tell
                    Google the deeper pages do not exist. */}
                <link rel="canonical" href={canonical} />
                {page > 1 && <link rel="prev" href={`https://careervivid.app${pathForPage(page - 1)}`} />}
                {page < totalPages && <link rel="next" href={`https://careervivid.app${pathForPage(page + 1)}`} />}
            </Helmet>

            <MenuBar />

            <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8">
                <header className="max-w-2xl">
                    <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                        open roles
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                        Apply on the company&rsquo;s own site
                    </h1>
                    {/*
                     * The previous copy promised each role was "re-checked before being shown,
                     * so the roles you open are still open". Nothing re-checks them — the word
                     * appeared in this sentence and nowhere else in the codebase — and a listing
                     * can close between the fetch and the click. What is actually true, and more
                     * useful, is where the apply button sends you: straight to the employer.
                     */}
                    <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                        Every role is collected from a company&rsquo;s own careers page, and Apply opens
                        that page directly &mdash; you submit to the employer, not through CareerVivid.
                        No account needed to browse.
                    </p>
                </header>

                <section className="mt-9">
                    {error && (
                        <div
                            role="alert"
                            className="mb-6 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13.5px] font-medium"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--cvl-danger) 45%, transparent)',
                                background: 'var(--cvl-danger-soft)',
                                color: 'var(--cvl-danger)',
                            }}
                        >
                            <AlertCircle size={15} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {loading
                            ? Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)
                            : jobs.map((job) => (
                                <JobCard key={job.id} job={job} signedIn={Boolean(currentUser)} />
                            ))}
                    </div>

                    {!loading && !error && jobs.length === 0 && (
                        <p className="py-16 text-center text-[14px]" style={{ color: 'var(--cvl-muted)' }}>
                            No open roles on this page right now. Try page one.
                        </p>
                    )}

                    {totalPages > 1 && (
                        <nav aria-label="Job list pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => goToPage(page - 1)}
                                disabled={page <= 1 || loading}
                                className="cvl-btn rounded-lg px-3.5 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>

                            {pageWindow(page, totalPages).map((entry, i) =>
                                entry === 'gap' ? (
                                    <span key={`gap-${i}`} className="px-1" style={{ color: 'var(--cvl-faint)' }}>…</span>
                                ) : (
                                    <a
                                        key={entry}
                                        // A real href so crawlers follow it and
                                        // people can open a page in a new tab.
                                        href={pathForPage(entry)}
                                        onClick={(e) => { e.preventDefault(); goToPage(entry); }}
                                        aria-current={entry === page ? 'page' : undefined}
                                        /*
                                         * inline-flex because this is an <a>:
                                         * .cvl-cta and .cvl-btn set colour only,
                                         * and on an inline box min-width does
                                         * not apply at all while padding paints
                                         * without growing the line box — the
                                         * current page would render narrower
                                         * than its siblings with its fill
                                         * bleeding over the rows around it.
                                         */
                                        className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-lg px-3 py-2 text-center text-[13px] font-semibold ${
                                            entry === page ? 'cvl-cta' : 'cvl-btn'
                                        }`}
                                    >
                                        {entry}
                                    </a>
                                ),
                            )}

                            <button
                                type="button"
                                onClick={() => goToPage(page + 1)}
                                disabled={page >= totalPages || loading}
                                className="cvl-btn inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                                {loading && <Loader2 size={13} className="animate-spin" />}
                            </button>
                        </nav>
                    )}
                </section>
            </main>

            <PublicFooter />
        </div>
    );
};

export default PublicJobsListPage;
