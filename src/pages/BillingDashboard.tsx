import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../utils/navigation';
import {
    ArrowRight,
    ArrowLeft,
    Check,
    CreditCard,
    Users,
    Shield,
    Settings,
    Plus,
    Trash2,
    Zap,
    Layout,
    Database,
    Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { trackUsage } from '../services/trackingService';
import {
    FREE_PLAN_CREDIT_LIMIT,
    PRO_PLAN_CREDIT_LIMIT,
    PRO_MAX_PLAN_CREDIT_LIMIT,
    ENTERPRISE_PLAN_CREDIT_LIMIT
} from '../config/creditCosts';
import { SUBSCRIPTION_CATALOG } from '../config/subscriptionCatalog';
import RetentionModal from '../components/RetentionModal';
import CancellationFeedbackModal from '../components/CancellationFeedbackModal';
import { usePrefersReducedMotion } from '../components/Landing/live/liveHooks';
import '../components/Landing/live/liveLanding.css';

type BillingInterval = 'monthly' | 'yearly';
type CancellationStep = 'idle' | 'offer_10' | 'offer_20' | 'feedback' | 'confirm';

const LABEL = 'cvl-mono text-[11px] uppercase tracking-[0.18em]';
const CTA = 'cvl-cta inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] font-semibold transition disabled:opacity-60';
const BTN = 'cvl-btn inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] font-semibold disabled:opacity-60';

/** Each tier gets one accent from the token set. No new colours. */
type PlanTone = 'green' | 'purple' | 'ink' | 'amber';

const planTone: Record<PlanTone, { ink: string; soft: string }> = {
    green: { ink: 'var(--cvl-green)', soft: 'var(--cvl-green-soft)' },
    purple: { ink: 'var(--cvl-purple)', soft: 'var(--cvl-purple-soft)' },
    ink: { ink: 'var(--cvl-ink)', soft: 'var(--cvl-chrome)' },
    amber: { ink: 'var(--cvl-amber)', soft: 'var(--cvl-amber-soft)' },
};

/**
 * The quietest label tier. `on="inset"` steps it up one, because
 * `.cvl-panel-inset` is --cvl-paper-2 — a shade darker than --cvl-paper — and
 * --cvl-faint is only rated against paper. 11px uppercase at 0.18em tracking is
 * the hardest text on the page to read; it does not get the thin end of a
 * margin as well.
 */
const Eyebrow: React.FC<{ children: React.ReactNode; id?: string; on?: 'panel' | 'inset' }> = ({ children, id, on = 'panel' }) => (
    <p id={id} className={LABEL} style={{ color: on === 'inset' ? 'var(--cvl-muted)' : 'var(--cvl-faint)' }}>{children}</p>
);

const BillingDashboard: React.FC = () => {
    const { currentUser, userProfile, isPremium, aiUsage } = useAuth();
    const { t } = useTranslation();
    const reducedMotion = usePrefersReducedMotion();
    const [isLoading, setIsLoading] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelStep, setCancelStep] = useState<CancellationStep>('idle');
    const [feedbackData, setFeedbackData] = useState<{ reason: string; feedback: string } | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [newTeamMember, setNewTeamMember] = useState('');
    const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
    const [showSuccess, setShowSuccess] = useState(false);

    // Stripe sends buyers back to /billing?success=true. This page renders for both
    // /billing and /subscription, so it owns the confirmation — the equivalent
    // handler in SubscriptionPage.tsx never ran because no route renders that file.
    useEffect(() => {
        if (!window.location.search.includes('success=true')) return;
        setShowSuccess(true);
        // Drop the parameter so a refresh does not re-announce the purchase.
        window.history.replaceState(null, '', window.location.pathname);
    }, []);

    const currentPlan = userProfile?.plan || 'free';
    const subscriptionStatus = (userProfile as any)?.subscriptionStatus || userProfile?.stripeSubscriptionStatus || null;
    const isEnterprise = currentPlan === 'enterprise';
    const isFreeCurrentPlan = currentPlan === 'free';
    const isCancellationScheduled = subscriptionStatus === 'active_canceling';
    const enterpriseSeats = Math.max(SUBSCRIPTION_CATALOG.enterprise.minimumSeats, userProfile?.seats || 1);
    const isYearly = billingInterval === 'yearly';

    const plans = [
        {
            id: 'free',
            name: 'Free',
            description: 'Start your job-search workspace before paying.',
            price: '$0',
            period: 'forever',
            credits: `${FREE_PLAN_CREDIT_LIMIT.toLocaleString()} credits / mo`,
            note: 'No credit card needed',
            cta: isFreeCurrentPlan ? 'Current plan' : isCancellationScheduled ? 'Cancel scheduled' : 'Cancel to Free',
            limit: FREE_PLAN_CREDIT_LIMIT,
            priceId: null,
            tone: 'green' as const,
            features: [
                'Resume builder and job tracker',
                'Chrome extension workflow',
                'Job search and profile setup',
                'Manual editing stays free',
            ],
        },
        {
            id: 'pro',
            name: 'Pro',
            description: 'For active job seekers tailoring applications every week.',
            price: `$${isYearly ? SUBSCRIPTION_CATALOG.pro.annualMonthlyEquivalent : SUBSCRIPTION_CATALOG.pro.monthlyPrice}`,
            period: 'USD / month',
            credits: `${PRO_PLAN_CREDIT_LIMIT.toLocaleString()} credits / mo`,
            note: isYearly ? `Billed yearly as $${SUBSCRIPTION_CATALOG.pro.annualPrice}/year` : 'Cancel or change anytime',
            cta: (currentPlan === 'pro' || ['premium', 'pro_monthly', 'pro_sprint'].includes(currentPlan)) ? (isCancellationScheduled ? 'Cancel scheduled' : 'Current plan') : 'Start Pro',
            limit: PRO_PLAN_CREDIT_LIMIT,
            priceId: isYearly ? SUBSCRIPTION_CATALOG.pro.annualPriceId : SUBSCRIPTION_CATALOG.pro.monthlyPriceId,
            tone: 'purple' as const,
            featured: true,
            features: [
                'Everything in Free',
                'AI resume tailoring',
                'Interview prep from saved roles',
                'Unlisted posts and custom domains',
            ],
        },
        {
            id: 'max',
            name: 'Max',
            description: 'For heavier searches, recruiters, and repeated AI workflows.',
            price: `$${isYearly ? SUBSCRIPTION_CATALOG.max.annualMonthlyEquivalent : SUBSCRIPTION_CATALOG.max.monthlyPrice}`,
            period: 'USD / month',
            credits: `${PRO_MAX_PLAN_CREDIT_LIMIT.toLocaleString()} credits / mo`,
            note: isYearly ? `Billed yearly as $${SUBSCRIPTION_CATALOG.max.annualPrice}/year` : 'Cancel or change anytime',
            cta: (currentPlan === 'max' || currentPlan === 'pro_max') ? (isCancellationScheduled ? 'Cancel scheduled' : 'Current plan') : 'Get Max',
            limit: PRO_MAX_PLAN_CREDIT_LIMIT,
            priceId: isYearly ? SUBSCRIPTION_CATALOG.max.annualPriceId : SUBSCRIPTION_CATALOG.max.monthlyPriceId,
            tone: 'ink' as const,
            features: [
                'Everything in Pro',
                '4.5x more AI capacity than Pro',
                'Priority model access',
                'Advanced portfolio and workflow use',
            ],
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'For teams, cohorts, and career programs with shared credits.',
            price: `$${SUBSCRIPTION_CATALOG.enterprise.monthlyPrice}`,
            period: 'USD / seat / month',
            credits: `${ENTERPRISE_PLAN_CREDIT_LIMIT.toLocaleString()} pooled credits / seat`,
            note: `${SUBSCRIPTION_CATALOG.enterprise.minimumSeats}-seat minimum, monthly billing`,
            cta: currentPlan === 'enterprise' ? (isCancellationScheduled ? 'Cancel scheduled' : 'Current plan') : 'Start team plan',
            limit: SUBSCRIPTION_CATALOG.enterprise.minimumSeats * ENTERPRISE_PLAN_CREDIT_LIMIT,
            priceId: SUBSCRIPTION_CATALOG.enterprise.monthlyPriceId,
            minimumSeats: SUBSCRIPTION_CATALOG.enterprise.minimumSeats,
            tone: 'amber' as const,
            features: [
                'Private team workspaces',
                'Pooled credits across seats',
                'Team roles and audit logs',
                'SSO and SCIM provisioning',
            ],
        }
    ];

    const handleUpgrade = async (priceId: string, quantity = 1) => {
        if (!currentUser) return;
        setError('');
        setNotice('');
        setIsLoading(true);
        try {
            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
            const result: any = await createCheckoutSession({
                priceId,
                quantity,
                successUrl: `${window.location.origin}/billing?success=true`,
                cancelUrl: `${window.location.origin}/billing`,
            });
            if (result.data.url) window.location.href = result.data.url;
        } catch (err) {
            setError('Checkout failed. Please try again.');
            setIsLoading(false);
        }
    };

    const startCancellationFlow = () => {
        if (isFreeCurrentPlan || isCancellationScheduled || isCanceling) return;
        setError('');
        setNotice('');
        setFeedbackData(null);
        setCancelStep('offer_10');
    };

    const handleAcceptDiscount = async (discountType: 'RETENTION_10' | 'RETENTION_20') => {
        if (!currentUser) return;
        setError('');
        setNotice('');
        setIsCanceling(true);
        try {
            const applyDiscountFn = httpsCallable(functions, 'applyDiscount');
            const result: any = await applyDiscountFn({ discountType });
            setCancelStep('idle');
            setNotice(
                result.data?.status === 'fixed_state'
                    ? 'Your subscription status was already out of sync, so we updated your account state.'
                    : `Your ${discountType === 'RETENTION_10' ? '10%' : '20%'} retention discount has been applied.`
            );
        } catch (err) {
            setError('Could not apply the retention discount. Please try again or contact support.');
        } finally {
            setIsCanceling(false);
        }
    };

    const handleFeedbackSubmit = (data: { reason: string; feedback: string }) => {
        setFeedbackData(data);
        setCancelStep('confirm');
    };

    const handleCancelSubscription = async () => {
        if (!currentUser || isFreeCurrentPlan || isCancellationScheduled) return;
        setError('');
        setNotice('');
        setIsCanceling(true);
        try {
            const cancelSubscription = httpsCallable(functions, 'cancelSubscription');
            const result: any = await cancelSubscription({
                cancellationReason: feedbackData?.reason || 'downgrade_to_free',
                feedbackText: feedbackData?.feedback || 'User confirmed cancellation from the billing page.',
            });
            setCancelStep('idle');
            setNotice(
                result.data?.status === 'fixed_state'
                    ? 'Your account has been moved back to Free because no active Stripe subscription was found.'
                    : 'Your cancellation is scheduled. You will keep paid access until the end of the current billing period.'
            );
        } catch (err) {
            setError('Could not schedule cancellation. Please try again or contact support.');
        } finally {
            setIsCanceling(false);
        }
    };

    const getReadablePlanName = (plan: string) => {
        switch (plan) {
            case 'pro': return 'Pro';
            case 'max':
            case 'pro_max': return 'Max';
            case 'enterprise': return 'Enterprise';
            case 'premium':
            case 'pro_monthly':
            case 'pro_sprint':
                return 'Pro (Legacy)';
            case 'free': return 'Free';
            default: return plan;
        }
    };

    const readablePlan = getReadablePlanName(currentPlan);

    // The meter reads off the same numbers the header bar does; nothing is
    // recalculated here, it is only painted with the token ramp.
    const usedCredits = aiUsage?.count ?? 0;
    const creditLimit = aiUsage?.limit ?? 0;
    const usedPercent = creditLimit > 0 ? Math.min(100, (usedCredits / creditLimit) * 100) : 0;
    const creditsRemaining = Math.max(0, creditLimit - usedCredits);
    const meterTone = usedPercent >= 90
        ? { ink: 'var(--cvl-danger)', soft: 'var(--cvl-danger-soft)' }
        : usedPercent >= 70
            ? { ink: 'var(--cvl-amber)', soft: 'var(--cvl-amber-soft)' }
            : { ink: 'var(--cvl-green)', soft: 'var(--cvl-green-soft)' };

    return (
        <div className="cvl min-h-screen">
            <header
                className="sticky top-0 z-30 border-b backdrop-blur"
                style={{ borderColor: 'var(--cvl-line)', background: 'color-mix(in srgb, var(--cvl-paper) 88%, transparent)' }}
            >
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="cvl-btn-ghost -ml-2 inline-flex min-h-10 items-center gap-2 px-2 text-[13px] font-semibold"
                    >
                        <ArrowLeft size={16} aria-hidden="true" />
                        Dashboard
                    </button>
                    <span
                        className="cvl-mono inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em]"
                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
                    >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--cvl-purple)' }} aria-hidden="true" />
                        {readablePlan}
                    </span>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.45 }}
                    className="space-y-6"
                >
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Plan and billing</h1>
                        <p className="mt-1 text-[13.5px]" style={{ color: 'var(--cvl-muted)' }}>
                            What you are on, what you have used, and what else is available.
                        </p>
                    </div>

                    {showSuccess && (
                        <div
                            className="flex items-start gap-3 rounded-xl border px-4 py-3.5"
                            style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-green-soft)' }}
                            role="status"
                        >
                            <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--cvl-green)' }} aria-hidden="true" />
                            <div className="text-[13.5px]">
                                <p className="font-semibold">{t('billing.successTitle', 'Payment received — your plan is active.')}</p>
                                <p className="mt-1 leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                    {t('billing.successBody', 'Your new credit allowance is available now. A receipt is on its way to your email.')}
                                </p>
                            </div>
                        </div>
                    )}
                    {error && (
                        <p
                            className="rounded-xl border px-4 py-3.5 text-[13.5px] font-semibold"
                            style={{ borderColor: 'var(--cvl-danger)', background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                            role="alert"
                        >
                            {error}
                        </p>
                    )}
                    {notice && (
                        <p
                            className="rounded-xl border px-4 py-3.5 text-[13.5px] font-semibold"
                            style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-green-soft)' }}
                            role="status"
                        >
                            {notice}
                        </p>
                    )}

                    {/* Where you are: the plan you pay for and the credits it bought. */}
                    <section className="cvl-panel p-5 sm:p-6" aria-labelledby="account-summary-heading">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                            >
                                <CreditCard size={16} aria-hidden="true" />
                            </span>
                            <h2 id="account-summary-heading" className="text-[17px] font-semibold tracking-tight">Your account</h2>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                            <div className="cvl-panel-inset min-w-0 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <Eyebrow on="inset">Active plan</Eyebrow>
                                    <Shield size={15} className="shrink-0" style={{ color: 'var(--cvl-purple)' }} aria-hidden="true" />
                                </div>
                                <p className="mt-2 break-words text-2xl font-semibold tracking-tight" style={{ color: 'var(--cvl-purple)' }}>
                                    {readablePlan}
                                </p>
                                <p className="mt-1 text-[12.5px]" style={{ color: 'var(--cvl-muted)' }}>
                                    {isFreeCurrentPlan ? 'Free subscription' : isCancellationScheduled ? 'Moving to Free at period end' : 'Monthly subscription'}
                                </p>
                                {!isFreeCurrentPlan && (
                                    isCancellationScheduled ? (
                                        <p
                                            className="cvl-mono mt-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em]"
                                            style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                        >
                                            <Check size={13} aria-hidden="true" /> Cancel scheduled
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={startCancellationFlow}
                                            disabled={isCanceling}
                                            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition hover:opacity-85 disabled:opacity-60"
                                            style={{ borderColor: 'var(--cvl-danger)', background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                                        >
                                            <Trash2 size={14} aria-hidden="true" /> Cancel to Free
                                        </button>
                                    )
                                )}
                            </div>

                            <div className="cvl-panel-inset min-w-0 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <Eyebrow on="inset">AI credits this month</Eyebrow>
                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meterTone.ink }} aria-hidden="true" />
                                </div>
                                {aiUsage ? (
                                    <>
                                        <p className="mt-2 flex items-baseline gap-1.5">
                                            <span className="text-2xl font-semibold leading-none tracking-tight" style={{ color: meterTone.ink }}>
                                                {usedCredits.toLocaleString()}
                                            </span>
                                            <span className="cvl-mono text-[12px]" style={{ color: 'var(--cvl-muted)' }}>
                                                / {creditLimit.toLocaleString()} used
                                            </span>
                                        </p>
                                        <div
                                            className="mt-3 h-2 overflow-hidden rounded-full"
                                            style={{ background: 'var(--cvl-chrome)' }}
                                            role="progressbar"
                                            aria-valuenow={Math.round(usedPercent)}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label="AI credits used this month"
                                        >
                                            <div
                                                className="h-full rounded-full transition-[width] duration-500"
                                                style={{ width: `${usedPercent}%`, background: meterTone.ink }}
                                            />
                                        </div>
                                        {/*
                                          * Running out is its own state, not a "0 left"
                                          * sentence in the same grey as every other line.
                                          * The meter this replaced said LIMIT REACHED in
                                          * red, and losing that made the one moment a
                                          * user needs to act look like every other month.
                                          */}
                                        {creditsRemaining <= 0 ? (
                                            <p
                                                className="cvl-mono mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em]"
                                                style={{ background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                                            >
                                                Limit reached
                                            </p>
                                        ) : (
                                            <p className="mt-2.5 text-[12.5px]" style={{ color: 'var(--cvl-muted)' }}>
                                                {creditsRemaining.toLocaleString()} left on {isPremium ? readablePlan : 'Free'}. Credits reset on the 1st.
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="cvl-mono mt-3 text-[12px]" style={{ color: 'var(--cvl-muted)' }}>loading usage…</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* The tiers. */}
                    <section className="cvl-panel p-5 sm:p-6" aria-labelledby="plans-heading">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <Eyebrow>available tiers</Eyebrow>
                                <h2 id="plans-heading" className="mt-2 text-[19px] font-semibold tracking-tight">Choose your plan</h2>
                                <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                    Switch between monthly and yearly billing, then pick the tier that matches your current search.
                                </p>
                            </div>

                            <div className="flex flex-col items-start gap-2 md:items-end">
                                <div
                                    className="inline-flex rounded-full border p-1"
                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                                    role="group"
                                    aria-label="Billing interval"
                                >
                                    {(['monthly', 'yearly'] as const).map((interval) => {
                                        const active = billingInterval === interval;
                                        return (
                                            <button
                                                key={interval}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => setBillingInterval(interval)}
                                                className="min-h-9 min-w-[104px] rounded-full px-4 py-2 text-[12.5px] font-semibold transition"
                                                style={active
                                                    ? { background: 'var(--cvl-paper)', color: 'var(--cvl-ink)', boxShadow: '0 1px 2px var(--cvl-shadow)' }
                                                    : { color: 'var(--cvl-muted)' }}
                                            >
                                                {interval === 'monthly' ? 'Monthly' : 'Yearly'}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[12px]" style={{ color: 'var(--cvl-muted)' }}>Yearly saves on Pro and Max.</p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {plans.map((p) => {
                                const tone = planTone[p.tone];
                                const isCurrentPlan = currentPlan === p.id || (p.id === 'pro' && ['premium', 'pro_monthly', 'pro_sprint'].includes(currentPlan));
                                const isFreePlan = p.id === 'free';
                                const isCancelTarget = isFreePlan && !isFreeCurrentPlan;
                                const isCancelTargetDisabled = isCancelTarget && isCancellationScheduled;
                                const isEnterprisePlan = p.id === 'enterprise';
                                const showsAsDone = isCurrentPlan || isCancelTargetDisabled;

                                return (
                                    <article
                                        key={p.id}
                                        className="cvl-panel cvl-panel-lift relative flex flex-col p-5"
                                        style={p.featured ? { borderColor: 'var(--cvl-purple)' } : undefined}
                                        aria-labelledby={`plan-${p.id}-name`}
                                    >
                                        <div className="flex min-h-[26px] items-start justify-between gap-2">
                                            <span
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                                style={{ background: tone.soft, color: tone.ink }}
                                            >
                                                {isEnterprisePlan ? <Users size={17} aria-hidden="true" /> : isFreePlan ? <Layout size={17} aria-hidden="true" /> : <Zap size={17} aria-hidden="true" />}
                                            </span>
                                            {isCurrentPlan ? (
                                                <span
                                                    className="cvl-mono rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                                                    style={{ background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }}
                                                >
                                                    Current
                                                </span>
                                            ) : p.featured ? (
                                                <span
                                                    className="cvl-mono rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                                                    style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                                                >
                                                    Popular
                                                </span>
                                            ) : null}
                                        </div>

                                        <h3 id={`plan-${p.id}-name`} className="mt-4 text-[19px] font-semibold tracking-tight">{p.name}</h3>
                                        <p className="mt-1.5 min-h-[40px] text-[13px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                            {p.description}
                                        </p>

                                        <div className="mt-5">
                                            <div className="flex items-end gap-1.5">
                                                <span className="text-4xl font-bold leading-none tracking-tight">{p.price}</span>
                                                <span className="cvl-mono max-w-[96px] pb-0.5 text-[11px] leading-4" style={{ color: 'var(--cvl-muted)' }}>
                                                    {p.period}
                                                </span>
                                            </div>
                                            <span
                                                className="cvl-mono mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold"
                                                style={{ background: tone.soft, color: tone.ink }}
                                            >
                                                <Sparkles size={12} aria-hidden="true" /> {p.credits}
                                            </span>
                                            <p className="mt-2 text-[12px]" style={{ color: 'var(--cvl-muted)' }}>{p.note}</p>
                                        </div>

                                        <ul className="mt-5 flex-grow space-y-2.5">
                                            {p.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-5" style={{ color: 'var(--cvl-muted)' }}>
                                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: tone.ink }} strokeWidth={3} aria-hidden="true" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => {
                                                if (isCurrentPlan || isCancelTargetDisabled) return;
                                                if (isCancelTarget) {
                                                    startCancellationFlow();
                                                    return;
                                                }
                                                if (isFreePlan) {
                                                    navigate('/dashboard');
                                                    return;
                                                }
                                                if (!p.priceId) return;
                                                handleUpgrade(p.priceId, isEnterprisePlan ? p.minimumSeats : 1);
                                            }}
                                            disabled={isLoading || isCanceling || isCurrentPlan || isCancelTargetDisabled}
                                            className={
                                                showsAsDone || isCancelTarget
                                                    ? 'mt-6 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[13.5px] font-semibold transition disabled:cursor-default disabled:opacity-70'
                                                    : `${p.featured ? CTA : BTN} mt-6 w-full disabled:cursor-default`
                                            }
                                            style={
                                                showsAsDone
                                                    ? { borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }
                                                    // The account panel above already carries the loud
                                                    // version of this action; a second filled red button
                                                    // in the grid would just shout over it.
                                                    : isCancelTarget
                                                        ? { borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)', color: 'var(--cvl-danger)' }
                                                        : undefined
                                            }
                                        >
                                            {showsAsDone ? (
                                                <>
                                                    <Check size={15} aria-hidden="true" /> {p.cta}
                                                </>
                                            ) : isCancelTarget ? (
                                                <>
                                                    <Trash2 size={15} aria-hidden="true" /> {p.cta}
                                                </>
                                            ) : (
                                                <>
                                                    {p.cta} <ArrowRight size={15} aria-hidden="true" />
                                                </>
                                            )}
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2" aria-label="How credits work">
                        <article className="cvl-panel p-5">
                            <div className="flex items-center gap-2.5">
                                <span
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                >
                                    <Database size={16} aria-hidden="true" />
                                </span>
                                <h2 className="text-[14px] font-semibold tracking-tight">How credits renew</h2>
                            </div>
                            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                Credits reset on the 1st of every month automatically.
                            </p>
                        </article>
                        <article className="cvl-panel p-5">
                            <div className="flex items-center gap-2.5">
                                <span
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                                >
                                    <Users size={16} aria-hidden="true" />
                                </span>
                                <h2 className="text-[14px] font-semibold tracking-tight">Team credits</h2>
                            </div>
                            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                Enterprise seats contribute to a shared pool across the organization.
                            </p>
                        </article>
                    </section>

                    {isEnterprise ? (
                        <section className="cvl-panel p-5 sm:p-6" aria-labelledby="team-heading">
                            <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)] lg:items-center">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <span
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                            style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                        >
                                            <Users size={17} aria-hidden="true" />
                                        </span>
                                        <div>
                                            <Eyebrow>team workspace</Eyebrow>
                                            <h2 id="team-heading" className="mt-1.5 text-[17px] font-semibold tracking-tight">Team management</h2>
                                            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                                Managing {enterpriseSeats} developer seats.
                                            </p>
                                        </div>
                                    </div>
                                    <button type="button" className="cvl-btn-ghost flex h-10 w-10 shrink-0 items-center justify-center">
                                        <Settings size={18} aria-hidden="true" />
                                        <span className="sr-only">Team settings</span>
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2.5 sm:flex-row">
                                    <label htmlFor="invite-email" className="sr-only">Teammate email</label>
                                    <input
                                        id="invite-email"
                                        type="email"
                                        placeholder="developer@company.com"
                                        value={newTeamMember}
                                        onChange={(e) => setNewTeamMember(e.target.value)}
                                        className="cvl-field min-w-0 flex-1 px-4 py-3 text-[14px]"
                                    />
                                    <button type="button" className={CTA}>
                                        <Plus size={15} aria-hidden="true" /> Invite
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="cvl-panel p-5 sm:p-6" aria-labelledby="enterprise-upsell-heading">
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                <div className="flex items-start gap-3">
                                    <span
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                        style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                    >
                                        <Zap size={17} aria-hidden="true" />
                                    </span>
                                    <div>
                                        <Eyebrow>team upgrade</Eyebrow>
                                        <h2 id="enterprise-upsell-heading" className="mt-1.5 text-[17px] font-semibold tracking-tight">Running a search with a team?</h2>
                                        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                            Enterprise pools <span className="font-semibold" style={{ color: 'var(--cvl-ink)' }}>{ENTERPRISE_PLAN_CREDIT_LIMIT.toLocaleString()}</span> credits per seat, adds SSO and private workspaces, and starts at ${SUBSCRIPTION_CATALOG.enterprise.monthlyPrice} per seat.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {[`${SUBSCRIPTION_CATALOG.enterprise.minimumSeats}-seat minimum`, 'Pooled credits'].map((chip) => (
                                                <span
                                                    key={chip}
                                                    className="cvl-mono rounded-md border px-2.5 py-1 text-[11px]"
                                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
                                                >
                                                    {chip}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleUpgrade(SUBSCRIPTION_CATALOG.enterprise.monthlyPriceId, SUBSCRIPTION_CATALOG.enterprise.minimumSeats)}
                                    className={`${CTA} w-full sm:w-auto`}
                                >
                                    Explore Enterprise <ArrowRight size={15} aria-hidden="true" />
                                </button>
                            </div>
                        </section>
                    )}
                </motion.div>
            </main>

            <RetentionModal
                isOpen={cancelStep === 'offer_10' || cancelStep === 'offer_20'}
                step={cancelStep === 'offer_10' ? 'offer_10' : 'offer_20'}
                onAccept={() => handleAcceptDiscount(cancelStep === 'offer_10' ? 'RETENTION_10' : 'RETENTION_20')}
                onDecline={() => {
                    if (cancelStep === 'offer_10') {
                        setCancelStep('offer_20');
                    } else {
                        setCancelStep('feedback');
                    }
                }}
                isLoading={isCanceling}
            />

            <CancellationFeedbackModal
                isOpen={cancelStep === 'feedback'}
                onCancel={() => setCancelStep('idle')}
                onConfirm={handleFeedbackSubmit}
                isLoading={isCanceling}
            />

            {cancelStep === 'confirm' && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
                    style={{ background: 'color-mix(in srgb, var(--cvl-desk) 82%, transparent)' }}
                >
                    <div className="cvl-panel w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="cancel-confirm-title">
                        <div className="flex items-start gap-3">
                            <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                style={{ background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                            >
                                <Trash2 size={18} aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                <Eyebrow>cancel subscription</Eyebrow>
                                <h2 id="cancel-confirm-title" className="mt-1.5 text-[19px] font-semibold tracking-tight">Move back to Free?</h2>
                                <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                    Your paid plan will be cancelled at the end of the current billing period, then your account returns to the Free plan with {FREE_PLAN_CREDIT_LIMIT.toLocaleString()} credits per month.
                                </p>
                                {feedbackData?.reason && (
                                    <div className="cvl-panel-inset mt-4 p-3.5">
                                        <Eyebrow on="inset">reason</Eyebrow>
                                        <p className="mt-1 text-[13.5px] font-semibold">{feedbackData.reason}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setCancelStep('feedback')} disabled={isCanceling} className={BTN}>
                                Back
                            </button>
                            {/* Bordered, not filled. This dialog already has one filled
                                button — the destructive one it exists to confirm — and a
                                second fill beside it makes the row read as two competing
                                primaries with the dangerous one no longer dominant. */}
                            <button type="button" onClick={() => setCancelStep('idle')} disabled={isCanceling} className={BTN}>
                                Keep paid plan
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelSubscription}
                                disabled={isCanceling}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] font-semibold transition disabled:cursor-wait disabled:opacity-70"
                                style={{ background: 'var(--cvl-danger)', color: 'var(--cvl-desk)' }}
                            >
                                {isCanceling ? 'Scheduling…' : 'Cancel to Free'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingDashboard;
