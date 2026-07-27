import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { functions } from '../../../firebase';
import { httpsCallable } from 'firebase/functions';
import { trackUsage } from '../../../services/trackingService';
import { navigate } from '../../../utils/navigation';
import { PRO_PLAN_CREDIT_LIMIT } from '../../../config/creditCosts';
import { SUBSCRIPTION_CATALOG } from '../../../config/subscriptionCatalog';

interface PricingTier {
    name: string;
    subtitle: string;
    price: {
        monthly: string;
        yearly: string;
    };
    duration: {
        monthly: string;
        yearly: string;
    };
    priceId: {
        monthly: string;
        yearly: string;
    };
    features: string[];
    cta: string;
    popular?: boolean;
    badge?: string;
    highlight?: boolean;
}

const BIO_LINK_PLANS: PricingTier[] = [
    {
        name: 'Bio-Link Free',
        subtitle: 'Start building your personal brand today.',
        price: {
            monthly: '$0',
            yearly: '$0',
        },
        duration: {
            monthly: '/mo',
            yearly: '/yr',
        },
        priceId: {
            monthly: 'free_tier',
            yearly: 'free_tier',
        },
        features: [
            '10 AI Credits / month',
            '1 Portfolio/Bio-Link Website',
            'Analytics Dashboard',
            "Remove 'Careervivid' Branding",
        ],
        cta: 'Start for Free',
        highlight: false,
    },
    {
        name: 'Bio-Link Pro',
        subtitle: 'Everything you need for a stunning personal website.',
        price: {
            monthly: '$2.99',
            yearly: '$30.00',
        },
        duration: {
            monthly: '/mo',
            yearly: '/yr',
        },
        priceId: {
            monthly: 'price_1Sr2UlRJNflGxv32C4XhlnUf',
            yearly: 'price_1Sr2UlRJNflGxv329NwShWqX',
        },
        features: [
            '50 AI Credits / month',
            'Create Unlimited Portfolios/Bio-Link Websites',
            'Analytics Dashboard',
            "Remove 'Careervivid' Branding",
            'Custom Domain Connection (Coming Soon)',
        ],
        cta: 'Start Free Trial',
        badge: 'First Month Free',
        highlight: false,
    },
    {
        name: 'All-Access Bundle',
        subtitle: 'The complete toolkit: Bio-Link + Resume Builder.',
        price: {
            monthly: `$${SUBSCRIPTION_CATALOG.pro.monthlyPrice}`,
            yearly: `$${SUBSCRIPTION_CATALOG.pro.annualMonthlyEquivalent}`,
        },
        duration: {
            monthly: '/mo',
            yearly: '/mo billed yearly',
        },
        priceId: {
            monthly: SUBSCRIPTION_CATALOG.pro.monthlyPriceId,
            yearly: SUBSCRIPTION_CATALOG.pro.annualPriceId,
        },
        features: [
            'Everything in Bio-Link Pro',
            `${PRO_PLAN_CREDIT_LIMIT.toLocaleString()} AI Credits / month`,
            'Create & Edit up to 15 Resumes',
            'Unlimited PDF Downloads',
            'Unlimited Interview Practice',
            'AI Content Generation',
        ],
        cta: 'Get All-Access',
        popular: true,
        highlight: true,
    }
];

const BioLinkPricing: React.FC = () => {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleChoosePlan = async (tier: PricingTier) => {
        setError('');

        // Handle Free Tier
        if (tier.price.monthly === '$0' || tier.name === 'Bio-Link Free') {
            navigate('/signup?source=bio-link&plan=free');
            return;
        }

        const priceId = billingCycle === 'monthly' ? tier.priceId.monthly : tier.priceId.yearly;
        if (!priceId) {
            setError('This checkout price is not configured yet.');
            return;
        }

        if (!currentUser) {
            navigate('/signup?source=bio-link');
            return;
        }

        setLoadingPriceId(priceId);

        try {
            await trackUsage(currentUser.uid, 'checkout_session_start', { priceId, source: 'bio-link-pricing' });

            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');

            // Pass trial param if it's the Bio-Link Pro plan
            const isTrial = tier.name === 'Bio-Link Pro';

            const result: any = await createCheckoutSession({
                priceId,
                // Was `/#/success`, a route that does not exist in App.tsx at all —
                // even once the hash was resolved there was nothing to render.
                successUrl: `${window.location.origin}/bio-links?success=true`,
                cancelUrl: `${window.location.origin}/bio-links`,
                trial: isTrial,
            });

            if (result.data.url) {
                window.location.href = result.data.url;
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (error: any) {
            console.error('Error creating checkout session:', error);
            setError('Checkout failed. Please try again.');
            setLoadingPriceId(null);
        }
    };

    return (
        <div className="py-24 px-4 bg-[#f0f0f0]" id="pricing" style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
        }}>
            <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16 bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-4xl sm:text-5xl font-black text-black mb-6 uppercase tracking-tight">
                        Simple Pricing<br />
                        <span className="text-indigo-600">Powerful Results</span>
                    </h2>
                    <p className="text-xl font-bold text-gray-600 mb-8 font-sans">
                        Choose the plan that fits your needs. Upgrade or cancel anytime.
                    </p>

                    {/* Neo-Brutalist Toggle */}
                    <div className="flex items-center justify-center gap-6">
                        <span className={`text-lg font-bold uppercase ${billingCycle === 'monthly' ? 'text-black' : 'text-gray-400'}`}>
                            Monthly
                        </span>

                        <div
                            className="relative inline-flex h-10 w-24 border-3 border-black bg-white cursor-pointer hover:translate-y-[1px] hover:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                        >
                            <div
                                className={`absolute top-0 bottom-0 w-1/2 bg-black transition-all duration-0 ${billingCycle === 'monthly' ? 'left-0' : 'left-1/2'}`}
                            />
                        </div>

                        <span className={`text-lg font-bold uppercase ${billingCycle === 'yearly' ? 'text-black' : 'text-gray-400'}`}>
                            Yearly <span className="text-white bg-black px-2 py-0.5 text-sm ml-1">-16%</span>
                        </span>
                    </div>
                </div>

                {error && <p className="mb-8 text-center text-red-600 font-bold bg-red-100 border-2 border-red-600 p-3 max-w-md mx-auto shadow-[4px_4px_0px_0px_#dc2626]">{error}</p>}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto items-start">
                    {/* Card 1: Free */}
                    <div className="relative bg-gray-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
                        <div className="bg-gray-100 border-b-4 border-black p-6 border-dashed">
                            <h3 className="text-2xl font-black uppercase tracking-wider text-black">FREE</h3>
                            <p className="font-bold text-gray-600 mt-1">{BIO_LINK_PLANS[0].subtitle}</p>
                        </div>

                        <div className="p-8 flex-grow flex flex-col">
                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-6xl font-black text-black tracking-tighter">
                                        {BIO_LINK_PLANS[0].price.monthly}
                                    </span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8 flex-grow">
                                {BIO_LINK_PLANS[0].features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 pb-3 border-b-2 border-gray-200 last:border-0">
                                        <div className="bg-gray-400 text-white p-0.5 mt-0.5 rounded-none">
                                            <CheckCircle className="w-4 h-4" strokeWidth={3} />
                                        </div>
                                        <span className="font-bold text-gray-700">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleChoosePlan(BIO_LINK_PLANS[0])}
                                className="w-full py-4 border-4 border-black bg-white text-black font-black text-lg uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-auto"
                            >
                                {BIO_LINK_PLANS[0].cta}
                            </button>
                        </div>
                    </div>

                    {/* Card 2: Bio-Link Pro */}
                    <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 transform lg:-translate-y-4 z-10">
                        {/* Highlights/Badges if any */}
                        <div className="absolute -top-6 -right-4 bg-indigo-500 text-white border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-2 z-10">
                            <span className="font-black uppercase tracking-widest text-sm">POPULAR</span>
                        </div>

                        <div className="bg-[#bfdbfe] border-b-4 border-black p-6 border-dashed">
                            <h3 className="text-2xl font-black uppercase tracking-wider text-black">PRO</h3>
                            <p className="font-bold text-gray-700 mt-1">{BIO_LINK_PLANS[1].subtitle}</p>
                        </div>

                        <div className="p-8 flex-grow flex flex-col">
                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-6xl font-black text-black tracking-tighter">
                                        {billingCycle === 'monthly' ? BIO_LINK_PLANS[1].price.monthly : BIO_LINK_PLANS[1].price.yearly}
                                    </span>
                                    <span className="text-xl font-bold text-gray-500">
                                        {billingCycle === 'monthly' ? BIO_LINK_PLANS[1].duration.monthly : BIO_LINK_PLANS[1].duration.yearly}
                                    </span>
                                </div>
                                {billingCycle === 'monthly' && (
                                    <div className="inline-block mt-3 bg-[#bbf7d0] text-green-800 border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        FIRST MONTH FREE
                                    </div>
                                )}
                            </div>

                            <ul className="space-y-4 mb-8 flex-grow">
                                {BIO_LINK_PLANS[1].features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 pb-3 border-b-2 border-gray-100 last:border-0">
                                        <div className="bg-black text-white p-0.5 mt-0.5">
                                            <CheckCircle className="w-4 h-4" strokeWidth={3} />
                                        </div>
                                        <span className="font-bold text-gray-800">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleChoosePlan(BIO_LINK_PLANS[1])}
                                disabled={loadingPriceId !== null}
                                className="w-full py-4 border-4 border-black bg-indigo-600 text-white font-black text-lg uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-indigo-700 transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                            >
                                {loadingPriceId === (billingCycle === 'monthly' ? BIO_LINK_PLANS[1].priceId.monthly : BIO_LINK_PLANS[1].priceId.yearly)
                                    ? <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    : BIO_LINK_PLANS[1].cta
                                }
                            </button>
                        </div>
                    </div>

                    {/* Card 3: All-Access Bundle */}
                    <div className="relative bg-[#fef08a] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full transform hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all">
                        {/* Best Value Badge */}
                        <div className="absolute -top-6 -right-4 bg-[#ef4444] text-white border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-3 z-10">
                            <span className="font-black uppercase tracking-widest text-sm">BEST VALUE</span>
                        </div>

                        <div className="bg-white border-b-4 border-black p-6">
                            <h3 className="text-2xl font-black uppercase tracking-wider text-black">BUNDLE</h3>
                            <p className="font-bold text-gray-700 mt-1">{BIO_LINK_PLANS[2].subtitle}</p>
                        </div>

                        <div className="p-8 flex-grow flex flex-col">
                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-6xl font-black text-black tracking-tighter">
                                        {billingCycle === 'monthly' ? BIO_LINK_PLANS[2].price.monthly : BIO_LINK_PLANS[2].price.yearly}
                                    </span>
                                    <span className="text-xl font-bold text-gray-500">
                                        {billingCycle === 'monthly' ? BIO_LINK_PLANS[2].duration.monthly : BIO_LINK_PLANS[2].duration.yearly}
                                    </span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-4 flex-grow">
                                {BIO_LINK_PLANS[2].features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 pb-3 border-b-2 border-black/10 last:border-0">
                                        <div className="bg-black text-white p-0.5 mt-0.5">
                                            <CheckCircle className="w-4 h-4" strokeWidth={3} />
                                        </div>
                                        <span className="font-bold text-gray-900">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleChoosePlan(BIO_LINK_PLANS[2])}
                                disabled={loadingPriceId !== null || !(billingCycle === 'monthly' ? BIO_LINK_PLANS[2].priceId.monthly : BIO_LINK_PLANS[2].priceId.yearly)}
                                className="w-full py-4 border-4 border-black bg-[#3b82f6] text-white font-black text-lg uppercase tracking-wider shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                            >
                                {loadingPriceId === (billingCycle === 'monthly' ? BIO_LINK_PLANS[2].priceId.monthly : BIO_LINK_PLANS[2].priceId.yearly)
                                    ? <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    : BIO_LINK_PLANS[2].cta
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BioLinkPricing;
