import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    Check,
    AlertCircle,
    Copy,
    Gift,
    Link as LinkIcon,
    RefreshCw,
    Share2,
    Sparkles,
    Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getReferralStats } from '../services/referralService';
import {
    isReferralCacheFresh,
    readReferralCache,
    writeReferralCache,
    type ReferralStats,
    type ReferralUser,
} from '../lib/referralCache';
import { navigate } from '../utils/navigation';

const emptyStats: ReferralStats = {
    code: '',
    totalReferred: 0,
    maxReferrals: 15,
    referredUsers: [],
};

type CopiedValue = 'link' | 'code' | 'message' | null;

const writeTextToClipboard = async (value: string): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            // Some embedded browsers expose the API but deny clipboard permission.
        }
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
};

const formatSignupDate = (signupDate: ReferralUser['signupDate']) => {
    if (typeof signupDate === 'string') {
        const date = new Date(signupDate);
        return Number.isNaN(date.valueOf()) ? 'Recently' : date.toLocaleDateString();
    }

    if (
        signupDate &&
        typeof signupDate === 'object' &&
        'toDate' in signupDate &&
        typeof signupDate.toDate === 'function'
    ) {
        return signupDate.toDate().toLocaleDateString();
    }

    return 'Recently';
};

const ReferralPage: React.FC = () => {
    const { currentUser, isPremium } = useAuth();
    const [stats, setStats] = useState<ReferralStats>(emptyStats);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [copiedValue, setCopiedValue] = useState<CopiedValue>(null);

    const referralLink = useMemo(
        () => (stats.code ? `${window.location.origin}/referral?ref=${stats.code}` : ''),
        [stats.code],
    );

    const shareMessage = useMemo(
        () => `I use CareerVivid to practice company-specific interviews. Use my referral link to get 2 months of Premium free: ${referralLink}`,
        [referralLink],
    );

    const applyStats = useCallback((nextStats: ReferralStats) => {
        setStats(nextStats);
        setErrorMessage('');
    }, []);

    const loadReferralData = useCallback(async (forceRefresh = false) => {
        if (!currentUser) return;

        const cached = forceRefresh ? null : readReferralCache(currentUser.uid);
        if (cached) {
            applyStats(cached.stats);
            setLoading(false);
            if (isReferralCacheFresh(cached)) return;
        }

        if (!cached) setLoading(true);
        setRefreshing(Boolean(cached || forceRefresh));

        try {
            // The stats endpoint lazily creates a referral code, so one request supplies the whole screen.
            const referralStats = await getReferralStats(currentUser.uid);
            writeReferralCache(currentUser.uid, referralStats);
            applyStats(referralStats);
        } catch (error) {
            console.error('Error loading referral data:', error);
            setErrorMessage('We could not refresh your referral details. Your last saved details are still available.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [applyStats, currentUser]);

    useEffect(() => {
        if (!currentUser) {
            navigate('/signin');
            return;
        }

        if (!isPremium) {
            navigate('/pricing');
            return;
        }

        void loadReferralData();
    }, [currentUser, isPremium, loadReferralData]);

    const copyToClipboard = async (value: string, copied: Exclude<CopiedValue, null>) => {
        try {
            const didCopy = await writeTextToClipboard(value);
            if (!didCopy) throw new Error('Clipboard access is unavailable');
            setCopiedValue(copied);
            window.setTimeout(() => setCopiedValue(null), 2000);
        } catch (error) {
            console.error('Failed to copy referral content:', error);
        }
    };

    const shareReferral = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Practice your next interview with CareerVivid',
                    text: shareMessage,
                    url: referralLink,
                });
                return;
            }
            await copyToClipboard(shareMessage, 'message');
        } catch (error) {
            if ((error as DOMException).name !== 'AbortError') {
                console.error('Failed to share referral link:', error);
            }
        }
    };

    const progressPercentage = Math.min(100, (stats.totalReferred / stats.maxReferrals) * 100);
    const remainingReferrals = Math.max(0, stats.maxReferrals - stats.totalReferred);

    return (
        <div className="min-h-screen bg-[var(--cv-bg-product)] text-[var(--cv-text-heading-product)]">
            <header className="sticky top-0 z-20 border-b border-[var(--cv-border-subtle)] bg-[color:var(--cv-surface)]/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-[var(--cv-text-heading-product)] transition-colors hover:bg-[var(--cv-surface-muted)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--cv-focus-ring)]"
                    >
                        <ArrowLeft size={16} aria-hidden="true" />
                        Dashboard
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <section className="mb-8 flex flex-col gap-5 border-b border-[var(--cv-border-subtle)] pb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--cv-action-soft-border)] bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-soft-text)]">
                            <Gift size={19} aria-hidden="true" />
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cv-text-muted)]">Referral program</p>
                            <h1 className="text-2xl font-bold leading-tight text-[var(--cv-text-heading-product)] sm:text-3xl">Share CareerVivid. Earn premium time.</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cv-text-body-product)]">Your friends receive two months of Premium. You receive one month for every successful referral, up to fifteen months.</p>
                        </div>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--cv-action-soft-border)] bg-[var(--cv-action-soft-bg)] px-3 py-1.5 text-xs font-bold text-[var(--cv-action-soft-text)]">
                        <Sparkles size={14} aria-hidden="true" />
                        Premium member benefit
                    </div>
                </section>

                {loading ? (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]" aria-label="Loading referrals">
                        <div className="h-80 animate-pulse rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)]" />
                        <div className="h-80 animate-pulse rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)]" />
                    </div>
                ) : (
                    <>
                        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
                            <div className="rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] p-5 shadow-[var(--cv-shadow-card)] sm:p-6">
                                <div className="flex flex-col gap-4 border-b border-[var(--cv-border-subtle)] pb-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-[var(--cv-text-heading-product)]">Your referral link</p>
                                        <p className="mt-1 text-sm text-[var(--cv-text-body-product)]">Send one link. Your friend’s reward is applied when they sign up.</p>
                                    </div>
                                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--cv-success-50)] px-2.5 py-1 text-[11px] font-bold text-[var(--cv-success-700)]">
                                        <Check size={13} aria-hidden="true" />
                                        Ready to share
                                    </span>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--cv-border-product)] bg-[var(--cv-surface-muted)] px-3 py-3">
                                        <LinkIcon size={16} className="shrink-0 text-[var(--cv-text-muted)]" aria-hidden="true" />
                                        <span className="min-w-0 truncate font-mono text-xs text-[var(--cv-text-body-product)]">{referralLink}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void copyToClipboard(referralLink, 'link')}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--cv-action-solid)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--cv-action-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--cv-focus-ring)]"
                                    >
                                        {copiedValue === 'link' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                                        {copiedValue === 'link' ? 'Copied' : 'Copy link'}
                                    </button>
                                </div>

                                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--cv-text-muted)]">Your code</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="font-mono text-lg font-bold tracking-[0.15em] text-[var(--cv-text-heading-product)]">{stats.code}</span>
                                            <button
                                                type="button"
                                                aria-label="Copy referral code"
                                                onClick={() => void copyToClipboard(stats.code, 'code')}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--cv-border-product)] text-[var(--cv-text-muted)] transition-colors hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-soft-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--cv-focus-ring)]"
                                            >
                                                {copiedValue === 'code' ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void shareReferral()}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--cv-action-soft-border)] bg-[var(--cv-action-soft-bg)] px-4 py-2.5 text-sm font-bold text-[var(--cv-action-soft-text)] transition-colors hover:bg-[var(--cv-action-soft-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--cv-focus-ring)]"
                                    >
                                        {copiedValue === 'message' ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
                                        {copiedValue === 'message' ? 'Message copied' : 'Share message'}
                                    </button>
                                </div>
                            </div>

                            <aside className="rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] p-5 shadow-[var(--cv-shadow-card)] sm:p-6">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-[var(--cv-text-heading-product)]">Your progress</p>
                                        <p className="mt-1 text-sm text-[var(--cv-text-body-product)]">{remainingReferrals} successful referrals to reach the maximum reward.</p>
                                    </div>
                                    <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[var(--cv-action-soft-bg)] px-2 font-bold text-[var(--cv-action-soft-text)]">{stats.totalReferred}/{stats.maxReferrals}</div>
                                </div>
                                <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--cv-surface-muted)]">
                                    <div className="h-full rounded-full bg-[var(--cv-action-solid)] transition-[width] duration-300" style={{ width: `${progressPercentage}%` }} />
                                </div>
                                <div className="mt-6 space-y-4 border-t border-[var(--cv-border-subtle)] pt-5">
                                    <div className="flex gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--cv-success-50)] text-[var(--cv-success-600)]"><Users size={16} aria-hidden="true" /></div>
                                        <div><p className="text-sm font-bold text-[var(--cv-text-heading-product)]">Your friend gets</p><p className="mt-0.5 text-xs leading-5 text-[var(--cv-text-body-product)]">2 months of Premium and 1,000 AI credits each month.</p></div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-soft-text)]"><Gift size={16} aria-hidden="true" /></div>
                                        <div><p className="text-sm font-bold text-[var(--cv-text-heading-product)]">You get</p><p className="mt-0.5 text-xs leading-5 text-[var(--cv-text-body-product)]">One month of Premium for every successful referral, up to fifteen months.</p></div>
                                    </div>
                                </div>
                            </aside>
                        </section>

                        <section className="mt-5 rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] shadow-[var(--cv-shadow-card)]">
                            <div className="flex flex-col gap-3 border-b border-[var(--cv-border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div>
                                    <h2 className="text-base font-bold text-[var(--cv-text-heading-product)]">Referral activity</h2>
                                    <p className="mt-1 text-sm text-[var(--cv-text-body-product)]">Successful signups appear here automatically.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void loadReferralData(true)}
                                    disabled={refreshing}
                                    className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-surface-muted)] hover:text-[var(--cv-text-heading-product)] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--cv-focus-ring)]"
                                >
                                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
                                    {refreshing ? 'Refreshing' : 'Refresh'}
                                </button>
                            </div>

                            {errorMessage && (
                                <div className="mx-5 mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-[var(--cv-warning-50)] px-4 py-3 text-sm text-[var(--cv-warning-600)] sm:mx-6">
                                    <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    <p>{errorMessage}</p>
                                </div>
                            )}

                            {stats.referredUsers.length > 0 ? (
                                <ul className="divide-y divide-[var(--cv-border-subtle)]">
                                    {stats.referredUsers.map((user) => (
                                        <li key={user.uid} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-[var(--cv-text-heading-product)]">{user.email}</p>
                                                <p className="mt-1 text-xs text-[var(--cv-text-body-product)]">Joined {formatSignupDate(user.signupDate)}</p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-[var(--cv-success-50)] px-2.5 py-1 text-[11px] font-bold text-[var(--cv-success-700)]">Reward applied</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center px-5 py-12 text-center sm:px-6">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cv-surface-muted)] text-[var(--cv-text-muted)]"><Users size={19} aria-hidden="true" /></div>
                                    <h3 className="mt-4 text-sm font-bold text-[var(--cv-text-heading-product)]">Your first referral will appear here</h3>
                                    <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--cv-text-body-product)]">Send your link to a friend preparing for their next role. Their Premium reward is applied after signup.</p>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
};

export default ReferralPage;
