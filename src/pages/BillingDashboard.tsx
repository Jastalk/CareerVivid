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
import AIUsageProgressBar from '../components/AIUsageProgressBar';
import RetentionModal from '../components/RetentionModal';
import CancellationFeedbackModal from '../components/CancellationFeedbackModal';

type BillingInterval = 'monthly' | 'yearly';
type CancellationStep = 'idle' | 'offer_10' | 'offer_20' | 'feedback' | 'confirm';

const planToneClasses = {
    green: {
        card: 'border-emerald-200 bg-[#fbfff7]',
        chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: 'bg-emerald-50 text-emerald-700',
        button: 'border border-[#d8c6ad] bg-white text-[#211b16] hover:border-[#bfa782] hover:bg-[#fffaf1]',
        check: 'text-emerald-600',
    },
    blue: {
        card: 'border-[#cbd9f4] bg-white shadow-[0_18px_55px_rgba(74,90,140,0.12)]',
        chip: 'border-[#dbe7ff] bg-[#eef4ff] text-[#315da7]',
        icon: 'bg-[#eef4ff] text-[#315da7]',
        button: 'bg-[#4a4392] text-white shadow-[0_14px_34px_rgba(98,91,213,0.22)] hover:bg-[#5149c7]',
        check: 'text-[#4a4392]',
    },
    slate: {
        card: 'border-[#ccd4df] bg-[#fbfcff]',
        chip: 'border-[#dbe4f3] bg-white text-[#43566f]',
        icon: 'bg-[#eef2f7] text-[#43566f]',
        button: 'bg-[#211b16] text-white shadow-[0_14px_34px_rgba(33,27,22,0.15)] hover:bg-[#3a2b20]',
        check: 'text-[#43566f]',
    },
    amber: {
        card: 'border-[#ead7b9] bg-[#fffaf1]',
        chip: 'border-[#ead7b9] bg-[#fff7e8] text-[#9a651f]',
        icon: 'bg-[#fff4cc] text-[#9a651f]',
        button: 'bg-[#211b16] text-white shadow-[0_14px_34px_rgba(33,27,22,0.15)] hover:bg-[#3a2b20]',
        check: 'text-[#9a651f]',
    },
} as const;

const BillingDashboard: React.FC = () => {
    const { currentUser, userProfile, isPremium, aiUsage } = useAuth();
    const { t } = useTranslation();
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
            tone: 'blue' as const,
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
            tone: 'slate' as const,
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

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 font-sans selection:bg-primary-500/30 relative overflow-hidden">
            {/* Background glowing orb matching pricing page */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/10 dark:bg-primary-600/10 blur-[120px] rounded-full pointer-events-none z-0" />

            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-900 dark:text-white hover:opacity-70 transition-all group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform stroke-[2.5]" />
                        <span className="text-sm font-semibold">Dashboard</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-1.5 bg-gradient-to-r from-primary-500/10 to-purple-500/10 dark:from-primary-900/40 dark:to-purple-900/40 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/50 rounded-full text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                            </span>
                            {readablePlan}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-8"
                >
                    {showSuccess && (
                        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                            <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div className="text-sm text-emerald-800 dark:text-emerald-200">
                                <p className="font-bold">{t('billing.successTitle', 'Payment received — your plan is active.')}</p>
                                <p className="mt-1 font-medium opacity-80">
                                    {t('billing.successBody', 'Your new credit allowance is available now. A receipt is on its way to your email.')}
                                </p>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                            {error}
                        </div>
                    )}
                    {notice && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                            {notice}
                        </div>
                    )}

                    <section className="rounded-3xl border border-[#e4d3bc] bg-[#fffaf1]/82 p-6 shadow-sm dark:border-[#37332d] dark:bg-[#262522]/80 md:p-8">
                        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a97935] dark:text-[#caa26c]">Available tiers</p>
                                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">
                                    Choose your plan.
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                    Switch between monthly and yearly billing, then choose the plan that matches your current search.
                                </p>
                            </div>

                            <div className="flex flex-col items-start gap-2 md:items-end">
                                <div className="inline-flex rounded-full bg-[#e9e1d6] p-1 shadow-inner dark:bg-[#1f1f1d]">
                                    {(['monthly', 'yearly'] as const).map((interval) => (
                                        <button
                                            key={interval}
                                            type="button"
                                            aria-pressed={billingInterval === interval}
                                            onClick={() => setBillingInterval(interval)}
                                            className={`min-w-[112px] rounded-full px-5 py-2.5 text-xs font-black transition-all ${
                                                billingInterval === interval
                                                    ? 'bg-white text-[#211b16] shadow-sm dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]'
                                                    : 'text-[#766955] hover:text-[#211b16] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]'
                                            }`}
                                        >
                                            {interval === 'monthly' ? 'Monthly' : 'Yearly'}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-[#665a4a] dark:text-[#aaa39a]">
                                    Yearly saves on Pro and Max.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            {plans.map((p) => {
                                const tone = planToneClasses[p.tone];
                                const isCurrentPlan = currentPlan === p.id || (p.id === 'pro' && ['premium', 'pro_monthly', 'pro_sprint'].includes(currentPlan));
                                const isFreePlan = p.id === 'free';
                                const isCancelTarget = isFreePlan && !isFreeCurrentPlan;
                                const isCancelTargetDisabled = isCancelTarget && isCancellationScheduled;
                                const isEnterprisePlan = p.id === 'enterprise';

                                return (
                                    <article
                                        key={p.id}
                                        className={`relative flex min-h-[500px] flex-col rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 ${tone.card} dark:border-[#37332d] dark:bg-[#262522]`}
                                    >
                                        {p.featured && (
                                            <div className="absolute right-5 top-5 rounded-full bg-[#211b16] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]">
                                                Popular
                                            </div>
                                        )}
                                        {isCurrentPlan && (
                                            <div className="absolute left-5 top-5 rounded-full bg-[#e9e1d6] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#211b16] dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
                                                Current plan
                                            </div>
                                        )}

                                        <div className={`mb-5 mt-8 flex h-11 w-11 items-center justify-center rounded-xl ${tone.icon}`}>
                                            {isEnterprisePlan ? <Users size={21} /> : isFreePlan ? <Layout size={21} /> : <Zap size={21} />}
                                        </div>

                                        <h3 className="text-2xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">{p.name}</h3>
                                        <p className="mt-2 min-h-[48px] text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                            {p.description}
                                        </p>

                                        <div className="mt-7">
                                            <div className="flex items-end gap-1">
                                                <span className="text-5xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">{p.price}</span>
                                                <span className="max-w-[92px] pb-2 text-xs font-black leading-4 text-[#665a4a] dark:text-[#aaa39a]">{p.period}</span>
                                            </div>
                                            <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] ${tone.chip}`}>
                                                <Sparkles size={13} /> {p.credits}
                                            </div>
                                            <p className="mt-2 text-xs font-bold text-[#7d6e5e] dark:text-[#aaa39a]">{p.note}</p>
                                        </div>

                                        <ul className="mt-7 flex-grow space-y-3.5">
                                            {p.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-3 text-sm font-semibold leading-5 text-[#665a4a] dark:text-[#d7d0c6]">
                                                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tone.check}`} strokeWidth={3} />
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
                                            className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black transition disabled:cursor-default disabled:opacity-70 ${isCurrentPlan ? 'border border-[#d8c6ad] bg-white text-[#211b16] dark:border-[#37332d] dark:bg-[#1f1f1d] dark:text-[#f4f1e9]' : tone.button}`}
                                        >
                                            {isCurrentPlan || isCancelTargetDisabled ? (
                                                <>
                                                    <Check size={16} /> {p.cta}
                                                </>
                                            ) : (
                                                <>
                                                    {p.cta} <ArrowRight size={16} />
                                                </>
                                            )}
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="grid gap-5 md:grid-cols-2">
                        <article className="rounded-2xl border border-[#e4d3bc] bg-white/80 p-6 shadow-sm dark:border-[#37332d] dark:bg-gray-900/80">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4ead8] text-[#9a651f] dark:bg-[#302e2a] dark:text-[#caa26c]">
                                    <Database size={18} />
                                </div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Usage invariants</h3>
                            </div>
                            <p className="mt-4 text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                Credits reset on the 1st of every month automatically.
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#e4d3bc] bg-white/80 p-6 shadow-sm dark:border-[#37332d] dark:bg-gray-900/80">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef0ff] text-[#4a4392] dark:bg-[#302e2a] dark:text-[#8d88e6]">
                                    <Users size={18} />
                                </div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Team credits</h3>
                            </div>
                            <p className="mt-4 text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                Enterprise seats contribute to a shared pool across the organization.
                            </p>
                        </article>
                    </section>

                    <section className="space-y-5">
                        <article className="rounded-3xl border border-[#e4d3bc] bg-white/90 p-6 shadow-sm dark:border-[#37332d] dark:bg-gray-900/85 md:p-7">
                            <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.25fr)] lg:items-stretch">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#4a4392] shadow-sm dark:bg-[#302e2a] dark:text-[#8d88e6]">
                                        <CreditCard size={22} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a97935] dark:text-[#caa26c]">Account summary</p>
                                        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">Billing & Plan</h2>
                                        <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                            Your current plan and monthly AI-credit usage.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid min-w-0 gap-4 md:grid-cols-[0.85fr_1.15fr]">
                                    <div className="min-w-0 rounded-2xl border border-[#e9e1d6] bg-[#fffaf1] p-5 dark:border-[#37332d] dark:bg-[#262522]">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7d6e5e] dark:text-[#aaa39a]">Active plan</span>
                                            <Shield className="h-4 w-4 shrink-0 text-[#4a4392]" />
                                        </div>
                                        <div className="mt-3 break-words text-2xl font-black tracking-tight text-[#4a4392] dark:text-[#8d88e6]">{readablePlan}</div>
                                        <p className="mt-1 text-xs font-bold text-[#7d6e5e] dark:text-[#aaa39a]">
                                            {isFreeCurrentPlan ? 'Free subscription' : isCancellationScheduled ? 'Moving to Free at period end' : 'Monthly subscription'}
                                        </p>
                                        {!isFreeCurrentPlan && (
                                            <button
                                                type="button"
                                                onClick={startCancellationFlow}
                                                disabled={isCanceling || isCancellationScheduled}
                                                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition ${
                                                    isCancellationScheduled
                                                        ? 'cursor-default border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                        : 'border-[#d8c6ad] bg-white text-[#211b16] hover:border-[#bfa782] hover:bg-[#fffaf1] dark:border-[#37332d] dark:bg-[#1f1f1d] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]'
                                                }`}
                                            >
                                                {isCancellationScheduled ? (
                                                    <>
                                                        <Check size={14} /> Cancel scheduled
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 size={14} /> Cancel to Free
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    <div className="min-w-0 rounded-2xl border border-[#e9e1d6] bg-[#fffaf1] p-5 dark:border-[#37332d] dark:bg-[#262522]">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7d6e5e] dark:text-[#aaa39a]">AI credits</span>
                                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />
                                        </div>
                                        <div className="min-w-0">
                                            {aiUsage ? (
                                                <AIUsageProgressBar
                                                    used={aiUsage.count}
                                                    limit={aiUsage.limit}
                                                    isPremium={isPremium}
                                                    variant="minimal"
                                                />
                                            ) : (
                                                <p className="text-sm font-bold text-[#665a4a] dark:text-[#aaa39a]">Usage loading...</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>

                        {isEnterprise ? (
                            <article className="rounded-3xl border border-[#ead7b9] bg-[#fffaf1] p-6 shadow-sm dark:border-[#37332d] dark:bg-[#262522] md:p-7">
                                <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.25fr)] lg:items-center">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff4cc] text-[#9a651f] dark:bg-[#302e2a] dark:text-[#caa26c]">
                                                <Users size={22} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a97935] dark:text-[#caa26c]">Team workspace</p>
                                                <h2 className="mt-2 text-2xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">Team Management</h2>
                                                <p className="mt-2 text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">Managing {enterpriseSeats} developer seats.</p>
                                            </div>
                                        </div>
                                        <button className="rounded-xl p-2.5 text-[#665a4a] transition hover:bg-[#f4ead8] hover:text-[#211b16] dark:text-[#aaa39a] dark:hover:bg-[#302e2a] dark:hover:text-[#f4f1e9]">
                                            <Settings size={20} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <input
                                            type="email"
                                            placeholder="developer@company.com"
                                            value={newTeamMember}
                                            onChange={(e) => setNewTeamMember(e.target.value)}
                                            className="min-w-0 flex-1 rounded-xl border border-[#e4d3bc] bg-white px-4 py-3 text-sm font-semibold text-[#211b16] outline-none transition focus:border-[#caa26c] focus:ring-2 focus:ring-[#caa26c]/30 dark:border-[#37332d] dark:bg-[#1f1f1d] dark:text-[#f4f1e9]"
                                        />
                                        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#211b16] px-5 py-3 text-sm font-black text-white transition hover:bg-[#3a2b20] dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]">
                                            <Plus size={16} /> Invite
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ) : (
                            <article className="relative overflow-hidden rounded-3xl border border-[#252c40] bg-[#151a2b] p-6 text-white shadow-[0_18px_50px_rgba(21,26,43,0.18)] dark:border-[#37332d] md:p-7">
                                <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[#4a4392]/18 blur-3xl" />
                                <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-300">
                                            <Zap size={23} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200/80">Team upgrade</p>
                                            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Upgrade to Enterprise</h2>
                                            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
                                                Need a team credit pool? Enterprise includes <span className="font-black text-white">{ENTERPRISE_PLAN_CREDIT_LIMIT.toLocaleString()}</span> credits per seat, SSO, and Private Workspaces from $12 per seat.
                                            </p>
                                            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-200">
                                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">2-seat minimum</span>
                                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Pooled credits</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleUpgrade(SUBSCRIPTION_CATALOG.enterprise.monthlyPriceId, SUBSCRIPTION_CATALOG.enterprise.minimumSeats)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-[#211b16] transition hover:-translate-y-0.5 hover:bg-[#fffaf1] sm:w-auto"
                                    >
                                        Explore Enterprise <ArrowRight size={16} />
                                    </button>
                                </div>
                            </article>
                        )}
                    </section>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211b16]/45 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-[#e4d3bc] bg-white p-6 shadow-2xl dark:border-[#37332d] dark:bg-[#1f1f1d]">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <Layout size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a97935] dark:text-[#caa26c]">Cancel subscription</p>
                                <h2 className="mt-2 text-2xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">Move back to Free?</h2>
                                <p className="mt-3 text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                    Your paid plan will be cancelled at the end of the current billing period, then your account returns to the Free plan with {FREE_PLAN_CREDIT_LIMIT.toLocaleString()} credits per month.
                                </p>
                                {feedbackData?.reason && (
                                    <div className="mt-4 rounded-2xl border border-[#e9e1d6] bg-[#fffaf1] p-4 text-sm dark:border-[#37332d] dark:bg-[#262522]">
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7d6e5e] dark:text-[#aaa39a]">Reason</p>
                                        <p className="mt-1 font-bold text-[#211b16] dark:text-[#f4f1e9]">{feedbackData.reason}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setCancelStep('feedback')}
                                disabled={isCanceling}
                                className="inline-flex items-center justify-center rounded-xl border border-[#d8c6ad] bg-white px-4 py-3 text-sm font-black text-[#211b16] transition hover:bg-[#fffaf1] disabled:opacity-60 dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={() => setCancelStep('idle')}
                                disabled={isCanceling}
                                className="inline-flex items-center justify-center rounded-xl border border-[#d8c6ad] bg-white px-4 py-3 text-sm font-black text-[#211b16] transition hover:bg-[#fffaf1] disabled:opacity-60 dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]"
                            >
                                Keep paid plan
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelSubscription}
                                disabled={isCanceling}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#211b16] px-4 py-3 text-sm font-black text-white transition hover:bg-[#3a2b20] disabled:cursor-wait disabled:opacity-70 dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]"
                            >
                                {isCanceling ? 'Scheduling...' : 'Cancel to Free'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingDashboard;
