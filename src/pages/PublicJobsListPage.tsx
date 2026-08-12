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
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Briefcase, MapPin, ExternalLink, Lock, Building2, Clock, AlertCircle, Loader2,
} from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import { navigate } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';

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

const Chip: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--cv-surface-warm-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--cv-text-muted)]">
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
        onClick={() => navigate(signedIn ? '/newresume' : '/signup')}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--cv-border-warm)] px-3 py-2.5 text-left transition-colors hover:border-[var(--cv-action-primary)] hover:bg-[var(--cv-action-soft-bg)]"
    >
        <span className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--cv-text-muted)]" />
            <span className="text-xs font-semibold text-[var(--cv-text-muted)]">
                {signedIn ? 'Add a resume to see your match' : 'See how well you match'}
            </span>
        </span>
        <span className="shrink-0 text-xs font-black text-[var(--cv-action-primary)] group-hover:underline">
            {signedIn ? 'Build one' : 'Free account'}
        </span>
    </button>
);

const JobCard: React.FC<{ job: PublicJob; signedIn: boolean }> = ({ job, signedIn }) => (
    <article className="cv-design-card cv-design-card-hover flex flex-col gap-3 p-5">
        <header className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--cv-surface-warm-muted)]">
                <Building2 className="h-5 w-5 text-[var(--cv-text-muted)]" />
            </div>
            <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-black leading-snug text-[var(--cv-text-heading)]">
                    {job.title}
                </h2>
                {job.company && (
                    <p className="truncate text-sm font-semibold text-[var(--cv-text-muted)]">{job.company}</p>
                )}
            </div>
        </header>

        <div className="flex flex-wrap gap-1.5">
            {job.location && <Chip icon={<MapPin className="h-3 w-3" />}>{job.location}</Chip>}
            {job.workModel && <Chip>{job.workModel}</Chip>}
            {job.jobType && <Chip icon={<Briefcase className="h-3 w-3" />}>{job.jobType}</Chip>}
            {job.seniority && <Chip>{job.seniority}</Chip>}
        </div>

        {job.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-[var(--cv-text-body)]">{job.description}</p>
        )}

        {job.salary && (
            <p className="text-sm font-bold text-[var(--cv-text-heading)]">{job.salary}</p>
        )}

        <LockedScore signedIn={signedIn} />

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            {job.postedAt ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--cv-text-muted)]">
                    <Clock className="h-3 w-3" />
                    {job.postedAt}
                </span>
            ) : <span />}
            <a
                href={job.applyUrl}
                target="_blank"
                // noopener because these are third-party ATS pages; noreferrer
                // keeps the employer from seeing which listing page sent them.
                rel="noopener noreferrer nofollow"
                className="cv-design-button-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-black"
            >
                View job
                <ExternalLink className="h-3.5 w-3.5" />
            </a>
        </div>
    </article>
);

const CardSkeleton: React.FC = () => (
    <div className="cv-design-card animate-pulse space-y-3 p-5">
        <div className="flex gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[var(--cv-border-warm)]" />
            <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-3/4 rounded bg-[var(--cv-border-warm)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--cv-border-warm)]" />
            </div>
        </div>
        <div className="h-16 rounded-xl bg-[var(--cv-surface-warm-muted)]" />
        <div className="h-10 rounded-xl bg-[var(--cv-surface-warm-muted)]" />
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
        <div className="min-h-screen bg-[var(--cv-bg-public)]">
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

            <PublicHeader variant="editorial" />

            <main className="pt-24">
                <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-black leading-tight text-[var(--cv-text-heading)] sm:text-4xl">
                        Open jobs, checked before you click
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--cv-text-body)]">
                        Every listing here was fetched from a company&rsquo;s own careers page and re-checked
                        before being shown, so the roles you open are still open. Browsing needs no account.
                    </p>
                </section>

                <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
                    {error && (
                        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
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
                        <p className="py-16 text-center text-[var(--cv-text-muted)]">
                            No open roles on this page right now. Try page one.
                        </p>
                    )}

                    {totalPages > 1 && (
                        <nav aria-label="Job list pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => goToPage(page - 1)}
                                disabled={page <= 1 || loading}
                                className="rounded-xl border border-[var(--cv-border-warm)] px-3.5 py-2 text-sm font-bold text-[var(--cv-text-body)] transition-colors hover:bg-[var(--cv-surface-warm-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>

                            {pageWindow(page, totalPages).map((entry, i) =>
                                entry === 'gap' ? (
                                    <span key={`gap-${i}`} className="px-1 text-[var(--cv-text-muted)]">…</span>
                                ) : (
                                    <a
                                        key={entry}
                                        // A real href so crawlers follow it and
                                        // people can open a page in a new tab.
                                        href={pathForPage(entry)}
                                        onClick={(e) => { e.preventDefault(); goToPage(entry); }}
                                        aria-current={entry === page ? 'page' : undefined}
                                        className={`min-w-[2.5rem] rounded-xl px-3 py-2 text-center text-sm font-bold transition-colors ${
                                            entry === page
                                                ? 'cv-design-button-primary'
                                                : 'border border-[var(--cv-border-warm)] text-[var(--cv-text-body)] hover:bg-[var(--cv-surface-warm-muted)]'
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
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--cv-border-warm)] px-3.5 py-2 text-sm font-bold text-[var(--cv-text-body)] transition-colors hover:bg-[var(--cv-surface-warm-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            </button>
                        </nav>
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default PublicJobsListPage;
