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
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
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

const planToneClasses = {
    green: {
        card: 'border-emerald-200 bg-[#fbfff7]',
        chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: 'bg-emerald-50 text-emerald-700',
        button: 'border-[#d8c6ad] bg-white text-[#211b16] hover:border-[#bfa782] hover:bg-[#fffaf1]',
        check: 'text-emerald-600',
    },
    blue: {
        card: 'border-[#cbd9f4] bg-white shadow-[0_18px_55px_rgba(74,90,140,0.12)]',
        chip: 'border-[#dbe7ff] bg-[#eef4ff] text-[#315da7]',
        icon: 'bg-[#eef4ff] text-[#315da7]',
        button: 'bg-[#625bd5] text-white shadow-[0_14px_34px_rgba(98,91,213,0.22)] hover:bg-[#5149c7]',
        check: 'text-[#625bd5]',
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
        <div className="min-h-screen bg-[#f7f1e7] text-[#211b16] selection:bg-[#d7b27a]/40 dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
            <Helmet>
                <title>Pricing | CareerVivid</title>
                <meta
                    name="description"
                    content="Start CareerVivid for free, then upgrade when you need more AI credits for resumes, job tracking, interview prep, and job-search workflows."
                />
                <link rel="canonical" href="https://careervivid.app/pricing" />
            </Helmet>

            <PublicHeader variant="editorial" />

            <main className="relative overflow-hidden pt-24">
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
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#bcdcc9] bg-[#f7fff8] px-4 py-2 text-sm font-black text-[#137245] dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <BadgeDollarSign size={16} /> Simple AI credit pricing
                        </div>
                        <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-tight text-[#211b16] dark:text-[#f4f1e9] sm:text-6xl lg:text-7xl">
                            Start free. Upgrade when the job search gets busy.
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#665a4a] dark:text-[#aaa39a]">
                            CareerVivid uses one monthly credit pool across resume tailoring, job matching,
                            interview practice, and workflow assistance. Manual tracking, writing, and editing
                            stay free.
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <button
                                onClick={() => handleChoosePlan(plans[0])}
                                className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#211b16] px-6 py-4 text-sm font-black text-white shadow-xl shadow-[#8b5a16]/10 transition hover:-translate-y-0.5 hover:bg-[#3a2b20] dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)] dark:hover:bg-white"
                            >
                                Start for free <ArrowRight size={18} />
                            </button>
                            <button
                                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                                className="inline-flex items-center justify-center gap-3 rounded-xl border border-[#d8c6ad] bg-[#fffaf1] px-6 py-4 text-sm font-black text-[#211b16] shadow-sm transition hover:-translate-y-0.5 hover:border-[#bfa782] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f4f1e9] dark:hover:border-[#5a5449]"
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

                <section id="plans" className="relative border-y border-[#e4d3bc] bg-[#fffaf1]/70 py-14 dark:border-[#37332d] dark:bg-[#262522]/60">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a97935] dark:text-[#caa26c]">Plans</p>
                                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9] sm:text-4xl">
                                    Choose your plan.
                                </h2>
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

                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                            {plans.map((plan) => {
                                const tone = planToneClasses[plan.tone];
                                return (
                                    <article
                                        key={plan.id}
                                        className={`relative flex min-h-[520px] flex-col rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 ${tone.card} dark:border-[#37332d] dark:bg-[#262522]`}
                                    >
                                        {plan.featured && (
                                            <div className="absolute right-5 top-5 rounded-full bg-[#211b16] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]">
                                                Popular
                                            </div>
                                        )}

                                        <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${tone.icon}`}>
                                            {plan.id === 'enterprise' ? <Users size={21} /> : <Zap size={21} />}
                                        </div>

                                        <h3 className="text-2xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">{plan.name}</h3>
                                        <p className="mt-2 min-h-[48px] text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                            {plan.description}
                                        </p>

                                        <div className="mt-7">
                                            <div className="flex items-end gap-1">
                                                <span className="text-5xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">{plan.price}</span>
                                                <span className="max-w-[82px] pb-2 text-xs font-black leading-4 text-[#665a4a] dark:text-[#aaa39a]">{plan.period}</span>
                                            </div>
                                            <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] ${tone.chip}`}>
                                                <Sparkles size={13} /> {plan.credits}
                                            </div>
                                            <p className="mt-2 text-xs font-bold text-[#7d6e5e] dark:text-[#aaa39a]">{plan.note}</p>
                                        </div>

                                        <ul className="mt-7 flex-grow space-y-3.5">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-3 text-sm font-semibold leading-5 text-[#665a4a] dark:text-[#d7d0c6]">
                                                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tone.check}`} strokeWidth={3} />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleChoosePlan(plan)}
                                            disabled={loadingPlanId === plan.id}
                                            className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${tone.button}`}
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
                        <article className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] p-6 shadow-sm dark:border-[#37332d] dark:bg-[#262522]">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4ead8] text-[#9a651f] dark:bg-[#302e2a] dark:text-[#caa26c]">
                                <ShieldCheck size={22} />
                            </div>
                            <h2 className="mt-5 text-xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">Manual work stays free</h2>
                            <p className="mt-3 text-sm font-semibold leading-7 text-[#665a4a] dark:text-[#aaa39a]">
                                Saving jobs, updating statuses, editing resumes, and writing notes should not burn credits.
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] p-6 shadow-sm dark:border-[#37332d] dark:bg-[#262522]">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef0ff] text-[#625bd5] dark:bg-[#302e2a] dark:text-[#8d88e6]">
                                <Clock size={22} />
                            </div>
                            <h2 className="mt-5 text-xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">Credits reset monthly</h2>
                            <p className="mt-3 text-sm font-semibold leading-7 text-[#665a4a] dark:text-[#aaa39a]">
                                Every plan refreshes on a predictable monthly cycle so active searches have a clear budget.
                            </p>
                        </article>
                        <article className="cv-surface-inverted rounded-2xl border border-[#e4d3bc] bg-[#211b16] p-6 shadow-[0_18px_55px_rgba(33,27,22,0.18)] dark:border-[#37332d] dark:bg-[#262522]">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff4cc] text-[#9a651f]">
                                <Users size={22} />
                            </div>
                            <h2 className="mt-5 text-xl font-black tracking-tight">Teams pool credits</h2>
                            <p className="mt-3 text-sm font-semibold leading-7 text-[#d7d0c6]">
                                Enterprise seats contribute to one shared capacity pool for cohorts, teams, and career programs.
                            </p>
                        </article>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default PricingPage;
