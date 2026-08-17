import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    ArrowRight,
    BadgeDollarSign,
    Check,
    Clock,
    CreditCard,
    ShieldCheck,
    Sparkles,
    Users,
    Zap,
} from 'lucide-react';
import { MenuBar, PublicFooter } from '../components/Landing/live/PublicShell';
import { useAuth } from '../contexts/AuthContext';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { trackUsage } from '../services/trackingService';
import { navigate } from '../utils/navigation';
import {
    FREE_PLAN_CREDIT_LIMIT,
    PRO_MAX_PLAN_CREDIT_LIMIT,
    PRO_PLAN_CREDIT_LIMIT,
} from '../config/creditCosts';
import { formatCredits, SUBSCRIPTION_CATALOG } from '../config/subscriptionCatalog';

type PricingPlan = {
    id: 'free' | 'pro' | 'max' | 'enterprise';
    name: string;
    description: string;
    price: string;
    period: string;
    credits: string;
    note: string;
    cta: string;
    priceId: string | null;
    quantity?: number;
    featured?: boolean;
    tone: 'green' | 'blue' | 'slate' | 'amber';
    features: string[];
};

type BillingInterval = 'monthly' | 'yearly';

/*
 * Five plan accents, kept distinct so the tiers stay tellable apart at a glance.
 * What changed is not the hues but their footing: they used to come from three
 * unrelated places — Tailwind's emerald, a heavily saturated steel blue, a much
 * greyer slate — so cards that should have read as siblings read as four separate
 * designs. They now come from one tuned set in liveLanding.css, which also gives
 * each of them a dark value instead of a hand-written dark: override.
 */
const planToneClasses = {
    green: {
        card: 'cvl-panel',
        chip: 'border-[color-mix(in_srgb,var(--cvl-plan-green)_30%,transparent)] bg-[var(--cvl-plan-green-soft)] text-[var(--cvl-plan-green)]',
        icon: 'bg-[var(--cvl-plan-green-soft)] text-[var(--cvl-plan-green)]',
        button: 'cvl-btn cvl-btn-ghost',
        check: 'text-[var(--cvl-plan-green)]',
    },
    blue: {
        // The featured plan. Blue identifies the card; the purple CTA is the one
        // filled button on the page, so the eye lands on it rather than on four
        // buttons competing.
        card: 'cvl-panel cvl-panel-lift',
        chip: 'border-[color-mix(in_srgb,var(--cvl-plan-blue)_30%,transparent)] bg-[var(--cvl-plan-blue-soft)] text-[var(--cvl-plan-blue)]',
        icon: 'bg-[var(--cvl-plan-blue-soft)] text-[var(--cvl-plan-blue)]',
        button: 'text-white bg-[var(--cvl-plan-purple)] hover:opacity-90',
        check: 'text-[var(--cvl-plan-blue)]',
    },
    slate: {
        card: 'cvl-panel',
        chip: 'border-[color-mix(in_srgb,var(--cvl-plan-slate)_30%,transparent)] bg-[var(--cvl-plan-slate-soft)] text-[var(--cvl-plan-slate)]',
        icon: 'bg-[var(--cvl-plan-slate-soft)] text-[var(--cvl-plan-slate)]',
        button: 'cvl-btn cvl-btn-ghost',
        check: 'text-[var(--cvl-plan-slate)]',
    },
    amber: {
        card: 'cvl-panel',
        chip: 'border-[color-mix(in_srgb,var(--cvl-plan-amber)_30%,transparent)] bg-[var(--cvl-plan-amber-soft)] text-[var(--cvl-plan-amber)]',
        icon: 'bg-[var(--cvl-plan-amber-soft)] text-[var(--cvl-plan-amber)]',
        button: 'cvl-btn cvl-btn-ghost',
        check: 'text-[var(--cvl-plan-amber)]',
    },
} as const;

const PricingPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const isYearly = billingInterval === 'yearly';

    const plans: PricingPlan[] = [
        {
            id: 'free',
            name: 'Free',
            description: 'Start your job-search workspace before paying.',
            price: '$0',
            period: 'forever',
            credits: `${formatCredits(FREE_PLAN_CREDIT_LIMIT)} credits / mo`,
            note: 'No credit card needed',
            cta: 'Start free',
            priceId: null,
            tone: 'green',
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
            credits: `${formatCredits(PRO_PLAN_CREDIT_LIMIT)} credits / mo`,
            note: isYearly
                ? `Billed yearly as $${SUBSCRIPTION_CATALOG.pro.annualPrice}/year`
                : 'Cancel or change anytime',
            cta: 'Start Pro',
            priceId: isYearly ? SUBSCRIPTION_CATALOG.pro.annualPriceId : SUBSCRIPTION_CATALOG.pro.monthlyPriceId,
            featured: true,
            tone: 'blue',
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
            credits: `${formatCredits(PRO_MAX_PLAN_CREDIT_LIMIT)} credits / mo`,
            note: isYearly
                ? `Billed yearly as $${SUBSCRIPTION_CATALOG.max.annualPrice}/year`
                : 'Cancel or change anytime',
            cta: 'Get Max',
            priceId: isYearly ? SUBSCRIPTION_CATALOG.max.annualPriceId : SUBSCRIPTION_CATALOG.max.monthlyPriceId,
            tone: 'slate',
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
            credits: `${formatCredits(SUBSCRIPTION_CATALOG.enterprise.creditLimit)} pooled credits / seat`,
            note: `${SUBSCRIPTION_CATALOG.enterprise.minimumSeats}-seat minimum, monthly billing`,
            cta: 'Start team plan',
            priceId: SUBSCRIPTION_CATALOG.enterprise.monthlyPriceId,
            quantity: SUBSCRIPTION_CATALOG.enterprise.minimumSeats,
            tone: 'amber',
            features: [
                'Private team workspaces',
                'Pooled credits across seats',
                'Team roles and audit logs',
                'SSO and SCIM provisioning',
            ],
        },
    ];

    const handleChoosePlan = async (plan: PricingPlan) => {
        setError('');

        if (!plan.priceId) {
            navigate(currentUser ? '/dashboard' : '/signup?redirect=/dashboard');
            return;
        }

        if (!currentUser) {
            navigate(`/signup?redirect=/pricing&plan=${plan.id}`);
            return;
        }

        setLoadingPlanId(plan.id);

        try {
            await trackUsage(currentUser.uid, 'checkout_session_start', {
                priceId: plan.priceId,
                plan: plan.id,
                quantity: plan.quantity || 1,
            });

            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
            const result: any = await createCheckoutSession({
                priceId: plan.priceId,
                quantity: plan.quantity || 1,
                // Path routes, not `/#/...`: getPathFromUrl reads window.location.pathname,
                // so a hash URL lands on `/` and the buyer is bounced to the dashboard
                // with no confirmation. `/billing` is what actually renders for both
                // /billing and /subscription.
                successUrl: `${window.location.origin}/billing?success=true`,
                cancelUrl: `${window.location.origin}/pricing`,
            });

            if (result.data.url) {
                window.location.href = result.data.url;
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (checkoutError) {
            console.error('Error creating checkout session:', checkoutError);
            setError('Failed to start checkout. Please try again.');
            setLoadingPlanId(null);
        }
    };

    return (
        <div className="cvl min-h-screen">
            <Helmet>
                {/* The app shell appends "| CareerVivid" via titleTemplate. */}
                <title>Pricing</title>
                <meta
                    name="description"
                    content="Start CareerVivid for free, then upgrade when you need more AI credits for resumes, job tracking, interview prep, and job-search workflows."
                />
                <link rel="canonical" href="https://careervivid.app/pricing" />
            </Helmet>

            <MenuBar />

            <main className="relative overflow-hidden pt-14">
                <div
                    className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-20"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, rgba(139, 90, 22, 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 90, 22, 0.06) 1px, transparent 1px)',
                        backgroundSize: '64px 64px',
                    }}
                />

                <section className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--cvl-green-soft)] bg-[var(--cvl-paper-2)] px-4 py-2 text-sm font-semibold text-[var(--cvl-green)] dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <BadgeDollarSign size={16} /> Simple AI credit pricing
                        </div>
                        <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-[var(--cvl-ink)] sm:text-3xl">
                            Start free. Upgrade when the job search gets busy.
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-8 text-[var(--cvl-muted)]">
                            CareerVivid uses one monthly credit pool across resume tailoring, job matching,
                            interview practice, and workflow assistance. Manual tracking, writing, and editing
                            stay free.
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <button
                                onClick={() => handleChoosePlan(plans[0])}
                                className="cvl-cta inline-flex items-center justify-center gap-3 rounded-xl px-6 py-4 text-sm font-semibold transition hover:-translate-y-0.5"
                            >
                                Start for free <ArrowRight size={18} />
                            </button>
                            <button
                                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                                className="inline-flex items-center justify-center gap-3 rounded-xl border border-[var(--cvl-line)] bg-[var(--cvl-paper)] px-6 py-4 text-sm font-semibold text-[var(--cvl-ink)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--cvl-line)] dark:bg-[var(--cvl-paper)] dark:text-[var(--cvl-ink)] dark:hover:border-[var(--cvl-muted)]"
                            >
                                Compare plans <CreditCard size={18} />
                            </button>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="relative mx-auto mb-8 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                <section id="plans" className="relative border-y border-[var(--cvl-line)] bg-[var(--cvl-paper)]/70 py-14 dark:border-[var(--cvl-line)] dark:bg-[var(--cvl-paper)]/60">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cvl-amber)]">Plans</p>
                                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--cvl-ink)] sm:text-4xl">
                                    Choose your plan.
                                </h2>
                            </div>
                            <div className="flex flex-col items-start gap-2 md:items-end">
                                <div className="inline-flex rounded-full bg-[var(--cvl-line)] p-1 shadow-inner dark:bg-[var(--cvl-paper-2)]">
                                    {(['monthly', 'yearly'] as const).map((interval) => (
                                        <button
                                            key={interval}
                                            type="button"
                                            aria-pressed={billingInterval === interval}
                                            onClick={() => setBillingInterval(interval)}
                                            className={`min-w-[112px] rounded-full px-5 py-2.5 text-xs font-semibold transition-all ${
                                                billingInterval === interval
                                                    ? 'bg-white text-[var(--cvl-ink)] shadow-sm dark:bg-[var(--cvl-ink)] dark:text-[rgb(33,27,22)]'
                                                    : 'text-[var(--cvl-muted)] hover:text-[var(--cvl-ink)] dark:text-[var(--cvl-muted)] dark:hover:text-[var(--cvl-ink)]'
                                            }`}
                                        >
                                            {interval === 'monthly' ? 'Monthly' : 'Yearly'}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-[var(--cvl-muted)]">
                                    Yearly saves on Pro and Max.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                            {plans.map((plan) => {
                                const tone = planToneClasses[plan.tone];
                                return (
                                    <article
                                        key={plan.id}
                                        className={`relative flex min-h-[520px] flex-col rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 ${tone.card} dark:border-[var(--cvl-line)] dark:bg-[var(--cvl-paper)]`}
                                    >
                                        {plan.featured && (
                                            <div className="cvl-cta absolute right-5 top-5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
                                                Popular
                                            </div>
                                        )}

                                        <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${tone.icon}`}>
                                            {plan.id === 'enterprise' ? <Users size={21} /> : <Zap size={21} />}
                                        </div>

                                        <h3 className="text-lg font-semibold tracking-tight text-[var(--cvl-ink)]">{plan.name}</h3>
                                        <p className="mt-2 min-h-[48px] text-sm font-semibold leading-6 text-[var(--cvl-muted)]">
                                            {plan.description}
                                        </p>

                                        <div className="mt-7">
                                            <div className="flex items-end gap-1">
                                                <span className="text-4xl font-semibold tracking-tight text-[var(--cvl-ink)]">{plan.price}</span>
                                                <span className="max-w-[82px] pb-2 text-xs font-semibold leading-4 text-[var(--cvl-muted)]">{plan.period}</span>
                                            </div>
                                            <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${tone.chip}`}>
                                                <Sparkles size={13} /> {plan.credits}
                                            </div>
                                            <p className="mt-2 text-xs font-bold text-[var(--cvl-muted)]">{plan.note}</p>
                                        </div>

                                        <ul className="mt-7 flex-grow space-y-3.5">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-3 text-sm font-semibold leading-5 text-[var(--cvl-muted)]">
                                                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tone.check}`} strokeWidth={3} />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleChoosePlan(plan)}
                                            disabled={loadingPlanId === plan.id}
                                            className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tone.button}`}
                                        >
                                            {loadingPlanId === plan.id ? 'Opening checkout...' : plan.cta}
                                            <ArrowRight size={16} />
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="relative py-16">
                    <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
                        <article className="rounded-2xl border border-[var(--cvl-line)] bg-[var(--cvl-paper)] p-6 shadow-sm dark:border-[var(--cvl-line)] dark:bg-[var(--cvl-paper)]">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cvl-amber-soft)] text-[var(--cvl-amber)]">
                                <ShieldCheck size={22} />
                            </div>
                            <h2 className="mt-5 text-xl font-semibold tracking-tight text-[var(--cvl-ink)]">Manual work stays free</h2>
                            <p className="mt-3 text-sm font-semibold leading-7 text-[var(--cvl-muted)]">
                                Saving jobs, updating statuses, editing resumes, and writing notes should not burn credits.
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[var(--cvl-line)] bg-[var(--cvl-paper)] p-6 shadow-sm dark:border-[var(--cvl-line)] dark:bg-[var(--cvl-paper)]">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cvl-purple-soft)] text-[var(--cvl-purple)]">
                                <Clock size={22} />
                            </div>
                            <h2 className="mt-5 text-xl font-semibold tracking-tight text-[var(--cvl-ink)]">Credits reset monthly</h2>
                            <p className="mt-3 text-sm font-semibold leading-7 text-[var(--cvl-muted)]">
                                Every plan refreshes on a predictable monthly cycle so active searches have a clear budget.
                            </p>
                        </article>
                        <article className="cv-surface-inverted rounded-2xl border border-[var(--cvl-line)] bg-[var(--cvl-ink)] p-6 shadow-[0_18px_55px_rgba(33,27,22,0.18)] dark:border-[var(--cvl-line)] dark:bg-[var(--cvl-paper)]">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cvl-amber-soft)] text-[var(--cvl-amber)]">
                                <Users size={22} />
                            </div>
                            <h2 className="mt-5 text-xl font-semibold tracking-tight">Teams pool credits</h2>
                            <p className="mt-3 text-sm font-semibold leading-7 text-[var(--cvl-line)]">
                                Enterprise seats contribute to one shared capacity pool for cohorts, teams, and career programs.
                            </p>
                        </article>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
};

export default PricingPage;
