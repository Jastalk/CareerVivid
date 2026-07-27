import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../utils/navigation';
import { ArrowLeft, Check, CreditCard, Calendar, X, CheckCircle, Sparkles, Home, FileText, Zap, Database, Shield } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { trackUsage } from '../services/trackingService';
import { FREE_PLAN_CREDIT_LIMIT, PRO_PLAN_CREDIT_LIMIT, PRO_MAX_PLAN_CREDIT_LIMIT, ENTERPRISE_PLAN_CREDIT_LIMIT } from '../config/creditCosts';
import { SUBSCRIPTION_CATALOG, formatCredits } from '../config/subscriptionCatalog';
import ConfirmationModal from '../components/ConfirmationModal';
import RetentionModal from '../components/RetentionModal';
import CancellationFeedbackModal from '../components/CancellationFeedbackModal';
import AIUsageProgressBar from '../components/AIUsageProgressBar';

const SubscriptionPage: React.FC = () => {
    const { currentUser, userProfile } = useAuth();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // Cancellation State Machine
    const [cancelStep, setCancelStep] = useState<'idle' | 'offer_10' | 'offer_20' | 'feedback' | 'confirm'>('idle');
    const [feedbackData, setFeedbackData] = useState<{ reason: string; feedback: string } | null>(null);
    const [infoModal, setInfoModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm?: () => void }>({ isOpen: false, title: '', message: '' });

    // Check for success parameter in URL
    // Check for success parameter in URL (hash or search query)
    useEffect(() => {
        const hash = window.location.hash;
        const search = window.location.search;

        if (hash.includes('success=true') || search.includes('success=true')) {
            setShowSuccess(true);
            // Clean up URL after a moment
            setTimeout(() => {
                const newUrl = window.location.pathname + window.location.hash.replace('?success=true', '').replace('&success=true', '');
                window.history.replaceState(null, '', newUrl);
            }, 500);
        }
    }, []);

    // Redirect if not logged in
    useEffect(() => {
        if (!currentUser) {
            navigate('/signin');
        }
    }, [currentUser]);

    const expiresAt = userProfile?.expiresAt;
    const isExpired = expiresAt && expiresAt.toMillis() < Date.now();

    // If plan is expired, force current plan to be free for UI display logic
    const currentPlan = isExpired ? 'free' : (userProfile?.plan || 'free');
    const isLegacyPlan = ['premium', 'pro_monthly', 'pro_sprint'].includes(currentPlan as any);

    const resumeLimit = userProfile?.resumeLimit || 1;
    const subscriptionStatus = userProfile?.stripeSubscriptionStatus;

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // View Mode State: 'career' (standard) or 'creator' (bio-links)
    const [viewMode, setViewMode] = useState<'career' | 'creator'>('career');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

    useEffect(() => {
        if (userProfile?.source === 'bio-link') {
            setViewMode('creator');
        }
    }, [userProfile]);

    const pricingPlans = viewMode === 'creator' ? [
        {
            id: 'bio_link_pro',
            name: 'Bio-Link Pro',
            price: '$2.99',
            originalPrice: null,
            discount: null,
            period: '/month',
            priceId: 'price_1Sr2UlRJNflGxv32C4XhlnUf',
            priceIdYearly: 'price_1Sr2UlRJNflGxv329NwShWqX',
            features: [
                '50 AI Credits / month',
                'Unlimited Bio-Link Portfolios',
                'Analytics Dashboard',
                'Media Kit & TikTok Analytics',
                "Remove 'Careervivid' Branding",
                'Custom Domain (Coming Soon)'
            ],
            current: false, // We don't have a clean way to track "is bio link plan" current 
            popular: true,
        },
        {
            id: 'monthly', // All Access
            name: 'All-Access Bundle',
            price: `$${SUBSCRIPTION_CATALOG.pro.monthlyPrice}`,
            originalPrice: null,
            discount: null,
            period: '/month',
            priceId: SUBSCRIPTION_CATALOG.pro.monthlyPriceId,
            features: [
                "Create & Edit up to 15 Resumes",
                "Create up to 8 Portfolio Websites",
                t('subscription.features.all_templates'),
                `${PRO_PLAN_CREDIT_LIMIT} AI Credits/Month`,
                t('subscription.features.ai_content'),
                t('subscription.features.ai_photo'),
                t('subscription.features.unlimited_downloads'),
                t('subscription.features.unlimited_practice')
            ],
            current: (currentPlan as any) === 'enterprise',
            popular: false,
        }
    ] : [
        {
            id: 'free',
            name: t('subscription.plans.free'),
            price: '$0',
            period: 'forever',
            priceId: null,
            features: [
                "Create & Edit 2 Resumes",
                "Create 1 Portfolio Website",
                t('subscription.features.all_templates'),
                t('subscription.features.ai_content'),
                `100 AI Credits/Month`,
                t('subscription.features.image_exports')
            ],
            current: currentPlan === 'free' || !currentPlan,
        },
        {
            id: 'pro',
            name: 'Pro',
            price: `$${SUBSCRIPTION_CATALOG.pro.monthlyPrice}`,
            annualPrice: `$${SUBSCRIPTION_CATALOG.pro.annualMonthlyEquivalent}`,
            annualTotal: `$${SUBSCRIPTION_CATALOG.pro.annualPrice}/year`,
            originalPrice: null,
            discount: null,
            period: '/month',
            priceId: SUBSCRIPTION_CATALOG.pro.monthlyPriceId,
            annualPriceId: SUBSCRIPTION_CATALOG.pro.annualPriceId,
            features: [
                "Create & Edit Unlimited Resumes",
                "Create up to 8 Portfolio Websites",
                t('subscription.features.all_templates'),
                `${PRO_PLAN_CREDIT_LIMIT} AI Credits/Month`,
                "CLI Access",
                t('subscription.features.ai_content'),
                t('subscription.features.ai_photo'),
                t('subscription.features.unlimited_downloads')
            ],
            current: ['pro', 'premium', 'pro_monthly', 'pro_sprint'].includes(currentPlan as any),
            popular: false,
        },
        {
            id: 'max',
            name: 'Max',
            price: `$${SUBSCRIPTION_CATALOG.max.monthlyPrice}`,
            annualPrice: `$${SUBSCRIPTION_CATALOG.max.annualMonthlyEquivalent}`,
            annualTotal: `$${SUBSCRIPTION_CATALOG.max.annualPrice}/year`,
            originalPrice: null,
            discount: null,
            period: '/month',
            priceId: SUBSCRIPTION_CATALOG.max.monthlyPriceId,
            annualPriceId: SUBSCRIPTION_CATALOG.max.annualPriceId,
            features: [
                "Create & Edit Unlimited Resumes",
                "Create up to 8 Portfolio Websites",
                t('subscription.features.all_templates'),
                `${PRO_MAX_PLAN_CREDIT_LIMIT} AI Credits/Month`,
                "Advanced CLI features",
                "High-capacity AI usage",
                "Priority Support",
                "Everything in Pro"
            ],
            current: (currentPlan as any) === 'max' || (currentPlan as any) === 'pro_max',
            popular: false,
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: `$${SUBSCRIPTION_CATALOG.enterprise.monthlyPrice}`,
            originalPrice: null,
            discount: null,
            period: '/seat/month',
            priceId: SUBSCRIPTION_CATALOG.enterprise.monthlyPriceId,
            features: [
                "Pooled Team Credits",
                "Team Workspaces",
                t('subscription.features.all_templates'),
                `${ENTERPRISE_PLAN_CREDIT_LIMIT} Credits per seat`,
                `${SUBSCRIPTION_CATALOG.enterprise.minimumSeats}-seat minimum`,
                "Centralized Billing",
                "Custom Solutions",
                "Admin Dashboard",
                "SLA Support"
            ],
            current: (currentPlan as any) === 'enterprise',
            popular: true,
        },
    ];

    const handleUpgrade = async (priceId: string | null, quantity = 1) => {
        if (!priceId || !currentUser) return;

        setIsLoading(true);
        setError('');

        try {
            await trackUsage(currentUser.uid, 'checkout_session_start', { priceId });

            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
            const result: any = await createCheckoutSession({
                priceId,
                quantity,
                successUrl: `${window.location.origin}/billing?success=true`,
                cancelUrl: `${window.location.origin}/pricing`,
            });

            if (result.data.url) {
                window.location.href = result.data.url;
            }
        } catch (error: any) {
            console.error('Error creating checkout session:', error);
            setError('Failed to start checkout. Please try again.');
            setIsLoading(false);
        }
    };

    const handleCancelClick = () => {
        setFeedbackData(null); // Reset feedback
        // Only show retention flow for Monthly subscriptions
        if ((currentPlan as any) === 'pro' || (currentPlan as any) === 'max' || (currentPlan as any) === 'pro_max' || (currentPlan as any) === 'enterprise') {
            setCancelStep('offer_10');
        } else {
            setCancelStep('feedback'); // Non-monthly go straight to feedback
        }
    };

    const handleAcceptDiscount = async (discountType: 'RETENTION_10' | 'RETENTION_20') => {
        setIsLoading(true);
        try {
            const applyDiscountFn = httpsCallable(functions, 'applyDiscount');
            const result: any = await applyDiscountFn({ discountType });

            setCancelStep('idle');

            if (result.data.status === 'fixed_state') {
                setInfoModal({
                    isOpen: true,
                    title: "Subscription Updated",
                    message: "It looks like your subscription was already canceled or invalid. Your account has been updated.",
                    onConfirm: () => window.location.reload()
                });
                return;
            }

            setInfoModal({
                isOpen: true,
                title: "Discount Applied",
                message: `Success! Your ${discountType === 'RETENTION_10' ? '10%' : '20%'} discount has been applied.`,
                onConfirm: () => window.location.reload()
            });
        } catch (error) {
            console.error(error);
            setError("Failed to apply discount. Please try again later.");
            setIsLoading(false);
        }
    };

    const handleFeedbackSubmit = (data: { reason: string; feedback: string }) => {
        setFeedbackData(data);
        setCancelStep('confirm');
    };

    const processCancellation = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        setError('');
        setCancelStep('idle');

        try {
            const cancelSubscription = httpsCallable(functions, 'cancelSubscription');
            await cancelSubscription({
                cancellationReason: feedbackData?.reason,
                feedbackText: feedbackData?.feedback
            });
            window.location.reload();
        } catch (error: any) {
            console.error('Error canceling subscription:', error);
            setError('Failed to cancel subscription. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F5F7] dark:bg-gray-950 text-gray-900 dark:text-white pb-20">
            {/* Success Page */}
            {showSuccess ? (
                <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
                    {/* Animated Background Elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 dark:bg-primary-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob"></div>
                        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 dark:bg-blue-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-primary-300 dark:bg-primary-800/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                    </div>

                    {/* Main Success Card */}
                    <div className="relative max-w-2xl w-full">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-8 md:p-12 text-center relative overflow-hidden">
                            {/* Decorative corner accents */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary-500/10 to-transparent rounded-bl-full"></div>
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-tr-full"></div>

                            {/* Animated Success Icon */}
                            <div className="relative mb-6 inline-block">
                                <div className="relative">
                                    {/* Pulsing rings */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-32 h-32 rounded-full bg-green-500/20 animate-ping"></div>
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-28 h-28 rounded-full bg-green-500/30 animate-pulse"></div>
                                    </div>

                                    {/* Main icon */}
                                    <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-6 shadow-lg animate-scale-in">
                                        <CheckCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
                                    </div>

                                    {/* Sparkles */}
                                    <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-bounce" />
                                    <Sparkles className="absolute -bottom-1 -left-1 w-6 h-6 text-blue-400 animate-bounce animation-delay-1000" />
                                </div>
                            </div>

                            {/* Success Message */}
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 animate-fade-in-up">
                                Payment Successful! 🎉
                            </h1>

                            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 animate-fade-in-up animation-delay-200">
                                Welcome to CareerVivid Pro! Your account has been upgraded.
                            </p>

                            {/* Features unlocked */}
                            <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-950/30 dark:to-blue-950/30 rounded-2xl p-6 mb-8 animate-fade-in-up animation-delay-400">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary-600" />
                                    You now have access to:
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                                    {[
                                        'Unlimited resume downloads',
                                        'AI-powered content generation',
                                        'Professional photo enhancement',
                                        'All premium templates',
                                        'Priority support',
                                        'Advanced customization'
                                    ].map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                            <span className="text-sm">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Call to Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-600">
                                <button
                                    onClick={() => window.location.href = '#/dashboard'}
                                    className="group relative px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <Home className="w-5 h-5 relative z-10" />
                                    <span className="relative z-10">Go to Dashboard</span>
                                </button>

                                <button
                                    onClick={() => navigate('/newresume')}
                                    className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-5 h-5" />
                                    <span>Create Resume</span>
                                </button>
                            </div>

                            {/* Additional info */}
                            <p className="mt-8 text-sm text-gray-500 dark:text-gray-500 animate-fade-in-up animation-delay-800">
                                A confirmation email has been sent to your inbox.
                            </p>
                        </div>

                        {/* View Subscription Details Link */}
                        <div className="text-center mt-6 animate-fade-in-up animation-delay-1000">
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium underline underline-offset-4 transition-colors"
                            >
                                View subscription details
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Top Header Bar */}
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 w-full mb-8">
                        <div className="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8 py-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-bold text-[15px]"
                            >
                                <ArrowLeft className="w-[18px] h-[18px] stroke-[2.5]" />
                                <span>Dashboard</span>
                            </button>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4">
                        <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-6">
                            <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-5 mb-10">
                                    <div className="w-16 h-16 bg-[#6B4BF4] rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                                        <CreditCard className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h1 className="text-[28px] font-extrabold text-gray-900 dark:text-white mb-1 tracking-tight">Billing & Plan</h1>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium leading-tight">Manage your subscription</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl p-6 relative overflow-hidden border border-gray-100/80 dark:border-gray-700">
                                        <Shield className="absolute -right-4 top-1 w-28 h-28 text-gray-200 dark:text-gray-700 opacity-30 stroke-[1.5] pointer-events-none" />
                                        <h3 className="text-[11px] font-black tracking-widest text-[#9FA8B8] dark:text-gray-400 uppercase mb-3">ACTIVE PLAN</h3>

                                        <div className="text-[28px] font-extrabold text-[#6B4BF4] dark:text-indigo-400 mb-1 tracking-tight">
                                            {pricingPlans.find((p: any) => p.current)?.name || t('subscription.plans.free')}
                                            {isLegacyPlan ? ' (Legacy)' : ''}
                                        </div>
                                        <p className="text-sm text-[#9FA8B8] dark:text-gray-400 font-semibold italic">
                                            {(userProfile as any)?.billingInterval === 'year' ? 'Annual Subscription' : 'Monthly Subscription'}
                                        </p>
                                    </div>

                                    <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl p-6 relative border border-gray-100/80 dark:border-gray-700">
                                        <div className="flex justify-between items-center mb-5">
                                            <h3 className="text-[11px] font-black tracking-widest text-[#9FA8B8] dark:text-gray-400 uppercase">AI CREDIT USAGE</h3>
                                            <div className="w-2 h-2 bg-[#2ECC71] rounded-full shadow-[0_0_8px_rgba(46,204,113,0.6)]"></div>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles className="w-4 h-4 text-[#4466FF]" />
                                            <span className="font-bold text-sm text-gray-900 dark:text-white tracking-tight">CareerVivid AI Credits</span>
                                        </div>

                                        <div className="mt-1">
                                            <AIUsageProgressBar
                                                used={userProfile?.aiUsage?.count || 0}
                                                limit={currentPlan === 'pro'
                                                    ? PRO_PLAN_CREDIT_LIMIT
                                                    : currentPlan === 'max'
                                                        ? PRO_MAX_PLAN_CREDIT_LIMIT
                                                        : currentPlan === 'enterprise'
                                                            ? Math.max(SUBSCRIPTION_CATALOG.enterprise.minimumSeats, userProfile?.seats || 1) * ENTERPRISE_PLAN_CREDIT_LIMIT
                                                            : FREE_PLAN_CREDIT_LIMIT}
                                                isPremium={currentPlan !== 'free'}
                                                variant="compact"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#242131] rounded-[2rem] p-8 md:p-10 relative overflow-hidden flex flex-col justify-between items-start gap-8 border border-gray-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 filter blur-[100px] rounded-full pointer-events-none"></div>

                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-11 h-11 rounded-2xl bg-amber-300/10 text-amber-300 flex items-center justify-center">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-[28px] font-extrabold text-white tracking-tight">Upgrade to Enterprise</h2>
                                    </div>
                                    <p className="text-gray-300 max-w-[460px] text-[15px] font-medium leading-relaxed opacity-90">
                                        Need a team credit pool? Enterprise includes <span className="text-white font-bold tracking-tight">{formatCredits(ENTERPRISE_PLAN_CREDIT_LIMIT)}</span> credits per seat, SSO, and Private Workspaces from $12 per seat.
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleUpgrade(SUBSCRIPTION_CATALOG.enterprise.monthlyPriceId, SUBSCRIPTION_CATALOG.enterprise.minimumSeats)}
                                    className="bg-white text-gray-900 hover:bg-gray-100 font-bold py-3.5 px-8 rounded-2xl transition-colors shadow-md text-sm tracking-tight"
                                >
                                    Explore Enterprise
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 bg-white dark:bg-gray-900 rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between mb-6">
                                <div>
                                    <h3 className="text-[11px] font-black tracking-widest text-[#9FA8B8] dark:text-gray-400 uppercase mb-2">AVAILABLE TIERS</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">Switch between monthly and annual billing, then choose the plan that matches your search.</p>
                                </div>

                                <div className="inline-flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1">
                                    {(['monthly', 'annual'] as const).map((cycle) => (
                                        <button
                                            key={cycle}
                                            type="button"
                                            aria-pressed={billingCycle === cycle}
                                            onClick={() => setBillingCycle(cycle)}
                                            className={`min-w-[112px] rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                                                billingCycle === cycle
                                                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                            }`}
                                        >
                                            {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {pricingPlans.filter((p: any) => p.id !== 'free').map((plan: any) => {
                                    const isPro = plan.id === 'pro';
                                    const isMax = plan.id === 'max';
                                    const isEnterprise = plan.id === 'enterprise';
                                    const isAnnualEligible = isPro || isMax;
                                    const displayPrice = billingCycle === 'annual' && plan.annualPrice ? plan.annualPrice : plan.price;
                                    const displayPeriod = billingCycle === 'annual' && plan.annualPrice ? '/mo billed yearly' : plan.period;
                                    const checkoutPriceId = billingCycle === 'annual' && isAnnualEligible ? plan.annualPriceId : plan.priceId;
                                    const credits = isMax
                                        ? PRO_MAX_PLAN_CREDIT_LIMIT
                                        : isPro
                                            ? PRO_PLAN_CREDIT_LIMIT
                                            : SUBSCRIPTION_CATALOG.enterprise.minimumSeats * ENTERPRISE_PLAN_CREDIT_LIMIT;
                                    const accentClasses = plan.current
                                        ? 'border-[1.5px] border-blue-500 bg-blue-50/40 dark:bg-blue-900/10 shadow-[0_4px_20px_rgba(59,130,246,0.06)]'
                                        : isMax
                                            ? 'border border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10'
                                            : isEnterprise
                                                ? 'border border-gray-200 bg-gray-950 text-white dark:border-gray-700 dark:bg-gray-950'
                                                : 'border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm';
                                    const titleClasses = isEnterprise ? 'text-white' : 'text-gray-900 dark:text-white';
                                    const mutedClasses = isEnterprise ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400';

                                    return (
                                        <div
                                            key={plan.id}
                                            className={`rounded-[1.5rem] p-6 transition-all flex flex-col min-h-[280px] ${accentClasses}`}
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-6">
                                                <div>
                                                    <h4 className={`text-[24px] font-extrabold tracking-tight ${titleClasses}`}>{plan.name}</h4>
                                                    {plan.current && (
                                                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                            Current plan
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-[34px] font-black tracking-tight ${titleClasses}`}>{displayPrice}</div>
                                                    <div className={`text-[11px] font-bold ${mutedClasses}`}>{displayPeriod}</div>
                                                </div>
                                            </div>

                                            <div className={`flex items-center gap-2 font-black text-[12px] mb-4 tracking-widest uppercase ${isEnterprise ? 'text-amber-300' : isMax ? 'text-amber-700 dark:text-amber-300' : 'text-blue-600 dark:text-blue-400'}`}>
                                                <Zap className="w-[14px] h-[14px] stroke-[2.5]" />
                                                <span>{formatCredits(credits)} {isEnterprise ? 'POOLED CREDITS / MO' : 'CREDITS / MO'}</span>
                                            </div>

                                            {billingCycle === 'annual' && plan.annualTotal && (
                                                <p className={`mb-4 text-xs font-semibold ${mutedClasses}`}>Billed upfront as {plan.annualTotal}</p>
                                            )}
                                            {isEnterprise && (
                                                <p className="mb-4 text-xs font-semibold text-gray-400">{SUBSCRIPTION_CATALOG.enterprise.minimumSeats}-seat minimum, credits pool across all seats.</p>
                                            )}

                                            <ul className={`space-y-3 mb-6 flex-1 text-sm font-semibold ${mutedClasses}`}>
                                                {plan.features.slice(0, 4).map((feature: string) => (
                                                    <li key={feature} className="flex items-start gap-2">
                                                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 stroke-[3] ${isEnterprise ? 'text-amber-300' : 'text-[#2ECC71]'}`} />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {plan.current ? (
                                                <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm tracking-tight w-full py-3">
                                                    <Check className="w-[18px] h-[18px] stroke-[3]" />
                                                    Current plan
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => checkoutPriceId && handleUpgrade(checkoutPriceId, isEnterprise ? SUBSCRIPTION_CATALOG.enterprise.minimumSeats : 1)}
                                                    disabled={isLoading || !checkoutPriceId}
                                                    className={`w-full py-3.5 rounded-xl font-bold text-[13px] tracking-wide transition-all ${
                                                        isEnterprise
                                                            ? 'bg-white hover:bg-gray-100 text-gray-950 shadow-sm'
                                                            : 'bg-[#1a1c23] hover:bg-black text-white dark:bg-gray-800 dark:hover:bg-gray-700 shadow-sm'
                                                    } disabled:opacity-60`}
                                                >
                                                    {checkoutPriceId ? `Switch to ${plan.name}` : 'Set up Stripe price'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-8 bg-white dark:bg-gray-900 rounded-[2rem] p-6 md:p-7 shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                                        <Database className="w-[18px] h-[18px] stroke-[2]" />
                                    </div>
                                    <h4 className="font-extrabold text-[15px] text-gray-900 dark:text-white tracking-tight">Usage Invariants</h4>
                                </div>

                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 md:max-w-3xl">
                                    <li className="flex items-start gap-3">
                                        <Check className="w-[18px] h-[18px] text-[#2ECC71] flex-shrink-0 mt-0.5 stroke-[3]" />
                                        <span className="text-[13px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">Credits reset on the 1st of every month automatically.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <Check className="w-[18px] h-[18px] text-[#2ECC71] flex-shrink-0 mt-0.5 stroke-[3]" />
                                        <span className="text-[13px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">Enterprise seats contribute to a shared pool.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                {/* Retention Modal Flow */}
                <RetentionModal
                        isOpen={cancelStep === 'offer_10' || cancelStep === 'offer_20'}
                        step={cancelStep === 'offer_10' ? 'offer_10' : 'offer_20'}
                        onAccept={() => handleAcceptDiscount(cancelStep === 'offer_10' ? 'RETENTION_10' : 'RETENTION_20')}
                        onDecline={() => {
                            if (cancelStep === 'offer_10') {
                                setCancelStep('offer_20');
                            } else {
                                setCancelStep('feedback'); // After retention decline, go to feedback
                            }
                        }}
                        isLoading={isLoading}
                    />

                    {/* Feedback Modal */}
                    <CancellationFeedbackModal
                        isOpen={cancelStep === 'feedback'}
                        onCancel={() => setCancelStep('idle')}
                        onConfirm={handleFeedbackSubmit}
                        isLoading={isLoading}
                    />

                    {/* Info / Alert Modal */}
                    <ConfirmationModal
                        isOpen={infoModal.isOpen}
                        onCancel={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
                        onConfirm={() => {
                            infoModal.onConfirm?.();
                            setInfoModal(prev => ({ ...prev, isOpen: false }));
                        }}
                        title={infoModal.title}
                        message={infoModal.message}
                        confirmText="OK"
                        cancelText=""
                        variant="default"
                    />

                    {/* Final Confirmation Modal */}
                    <ConfirmationModal
                        isOpen={cancelStep === 'confirm'}
                        onCancel={() => setCancelStep('idle')}
                        onConfirm={processCancellation}
                        title={t('subscription.cancel_title') || "Cancel Subscription?"}
                        message={t('subscription.cancel_confirm') || "Are you sure you want to cancel? You will retain access to Pro features until the end of your current billing period."}
                        confirmText="Yes, Cancel Subscription"
                        cancelText="Keep My Plan"
                        variant="danger"
                    />
                </>
            )}
        </div>
    );
};

export default SubscriptionPage;
