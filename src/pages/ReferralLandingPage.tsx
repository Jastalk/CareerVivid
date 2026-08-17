import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import { Sparkles, Target, Zap, CheckCircle2, AlertCircle, Loader2, Gift, ArrowLeft } from 'lucide-react';
import { navigate } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';

const ReferralLandingPage: React.FC = () => {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [referralCode, setReferralCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const [credits, setCredits] = useState(1000); // Monthly plan: 1000 AI Credits/Month

    // Get referral code from URL parameter
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const refCode = params.get('ref');
        if (refCode) {
            setReferralCode(refCode);
            validateCode(refCode);
        }
    }, []);

    const validateCode = async (code: string) => {
        if (!code || code.length < 4) {
            setValidationStatus('idle');
            return;
        }

        setIsValidating(true);

        // Simulate validation (replace with actual Firebase call)
        setTimeout(() => {
            // For demo: codes starting with 'q' are valid
            const isValid = code.startsWith('q') || code.length === 8;
            setValidationStatus(isValid ? 'valid' : 'invalid');
            if (isValid) {
                setCredits(1000); // Monthly plan: 1000 AI Credits/Month
            }
            setIsValidating(false);
        }, 800);
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.toUpperCase();
        setReferralCode(code);
        if (code.length >= 4) {
            validateCode(code);
        } else {
            setValidationStatus('idle');
        }
    };

    const handleSignUp = () => {
        // Navigate to signup with referral code
        navigate(`/signup?ref=${referralCode}`);
    };

    const benefits = [
        {
            icon: <Gift className="w-8 h-8 text-yellow-500" />,
            title: `${credits} AI Credits/Month`,
            description: 'Generate professional resume content with AI'
        },
        {
            icon: <Sparkles className="w-8 h-8 text-purple-500" />,
            title: 'All Premium Templates',
            description: 'Access to all professional resume templates'
        },
        {
            icon: <Target className="w-8 h-8 text-blue-500" />,
            title: 'Unlimited Interview Practice',
            description: 'Mock interview sessions with the Career Agent'
        },
        {
            icon: <Zap className="w-8 h-8 text-green-500" />,
            title: 'AI Photo Editing',
            description: 'Professional photo enhancement with AI'
        }
    ];

    return (
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen flex flex-col font-sans selection:bg-primary-100 dark:selection:bg-primary-900">
            {currentUser ? (
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 w-full mb-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-bold text-[15px]"
                        >
                            <ArrowLeft className="w-[18px] h-[18px] stroke-[2.5]" />
                            <span>Dashboard</span>
                        </button>
                    </div>
                </div>
            ) : (
                <PublicHeader />
            )}

            <main className="flex-grow">
                {/* ── Hero Section ── */}
                <section className="relative pt-12 lg:pt-20 pb-16 overflow-hidden">
                    {/* Background glows */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto w-full">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-sm font-bold mb-6 tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                            Special Community Offer
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white tracking-tighter leading-[1.1] mb-5">
                            Get{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400">
                                Free AI Credits
                            </span>
                        </h1>
                        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
                            Sign up with a referral code and unlock premium features to accelerate your job search. Use AI to tailor your resume and track jobs seamlessly.
                        </p>

                        {/* Referral Code Input Container */}
                        <div className="w-full max-w-md mx-auto mb-6">
                            <div className="relative bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-2xl ring-1 ring-gray-200 dark:ring-white/10 p-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="absolute -top-3 left-6 px-2 bg-white dark:bg-[#0a0a0a] text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    Referral Code
                                </div>
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        value={referralCode}
                                        onChange={handleCodeChange}
                                        placeholder="e.g., q9MYCaKn"
                                        className="w-full px-4 py-4 text-xl font-mono bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 transition-all outline-none"
                                    />
                                    <div className="absolute right-4 flex items-center">
                                        {isValidating && <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />}
                                        {!isValidating && validationStatus === 'valid' && (
                                            <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full text-green-600 dark:text-green-400">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        )}
                                        {!isValidating && validationStatus === 'invalid' && (
                                            <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-full text-red-600 dark:text-red-400">
                                                <AlertCircle size={20} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="h-6 mt-3 flex justify-center items-center">
                                {validationStatus === 'valid' && (
                                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                        <Sparkles size={14} />
                                        Valid code! You'll receive {credits} AI credits
                                    </p>
                                )}
                                {validationStatus === 'invalid' && (
                                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                        <AlertCircle size={14} />
                                        Invalid referral code. Please check and try again.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* CTA Button */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={handleSignUp}
                                disabled={validationStatus !== 'valid'}
                                className={`px-8 py-4 rounded-2xl font-extrabold text-lg transition-all flex items-center justify-center gap-3 ${validationStatus === 'valid'
                                    ? 'bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white shadow-xl shadow-primary-600/20 hover:shadow-primary-500/40 transform hover:scale-105 cursor-pointer'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                    }`}
                            >
                                <Sparkles size={20} /> Sign Up & Get Credits
                            </button>
                            
                            <button
                                onClick={() => navigate('/signin')}
                                className="px-6 py-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold transition-colors"
                            >
                                Already have an account? Sign in
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── Benefits Section ── */}
                <section className="bg-white dark:bg-gray-950 py-20 px-4">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-sm font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-2">Unlock Superpowers</p>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                                What You'll Get
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {benefits.map((benefit, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-50 dark:bg-[#0a0a0a] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-800 hover:shadow-xl transition-all duration-300 group"
                                >
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 group-hover:scale-110 transition-transform">
                                        {benefit.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                        {benefit.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                                        {benefit.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── How It Works ── */}
                <section className="bg-gray-50 dark:bg-[#0a0a0a] py-20 px-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                                How It Works
                            </h2>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-12 relative">
                            {/* Decorative line connecting nodes on larger screens */}
                            <div className="hidden sm:block absolute top-[50px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent" />
                            
                            {[
                                { step: 1, title: 'Enter Referral Code', desc: 'Use the unique code shared by your friend or colleague.' },
                                { step: 2, title: 'Create Your Account', desc: 'Sign up with your email securely in just a few seconds.' },
                                { step: 3, title: 'Get Instant Credits', desc: 'Your promotional AI credits are automatically added to your wallet.' },
                                { step: 4, title: 'Start Building', desc: 'Use your credits to power the CLI agent and tailor your resume.' }
                            ].map((item) => (
                                <div key={item.step} className="flex gap-6 items-start relative z-10 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center font-black text-xl border border-primary-200 dark:border-primary-800 shadow-inner">
                                        {item.step}
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                            {item.title}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default ReferralLandingPage;
