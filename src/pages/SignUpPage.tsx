import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    createUserWithEmailAndPassword,
    signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Eye, EyeOff, Loader2, Mail, Lock, ChevronRight, Users } from 'lucide-react';
import { trackUsage } from '../services/trackingService';
import { navigate } from '../utils/navigation';
import { queueTransactionalAuthEmail } from '../services/transactionalEmailService';
import { resolveSignedInWorkspace } from '../services/authAccountLinkingService';
import { getSafeRelativeRedirect } from '../utils/security';
import { getEmailDisplayName } from '../utils/userDisplayName';
import { waitForReferralEntitlement } from '../services/referralService';
import { AuthShell } from '../components/Landing/live/PublicShell';

const SignUpPage: React.FC = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);

    const loadingMessages = [
        t('auth.loading_secure'),
        t('auth.loading_process'),
        t('auth.loading_ready'),
        t('auth.loading_moment'),
    ];

    useEffect(() => {
        let interval: number;
        if (loading) {
            setLoadingMessageIndex(0);
            interval = window.setInterval(() => {
                setLoadingMessageIndex(prevIndex => {
                    if (prevIndex >= loadingMessages.length - 1) {
                        return prevIndex;
                    }
                    return prevIndex + 1;
                });
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleAuthError = (err: any) => {
        setIsDuplicateEmail(false);
        switch (err.code) {
            case 'auth/email-already-in-use':
                setError(t('auth.error_exists'));
                setIsDuplicateEmail(true);
                break;
            case 'auth/weak-password':
                setError(t('auth.error_weak'));
                break;
            case 'auth/popup-closed-by-user':
                break;
            case 'auth/account-exists-with-different-credential':
                setError(t('auth.error_diff_cred'));
                break;
            default:
                setError(err.message.replace('Firebase: ', ''));
                break;
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        
        // Handle pre-filled email (frictionless transition)
        const emailParam = params.get('email');
        if (emailParam) {
            setEmail(decodeURIComponent(emailParam));
        }

        const refCode = params.get('ref');
        if (refCode) {
            localStorage.setItem('careervivid_referral', refCode);
        }
    }, []);

    const getReferralCode = () => {
        return localStorage.getItem('careervivid_referral') || undefined;
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await queueTransactionalAuthEmail({ type: 'email_verification' });

            const referredBy = getReferralCode();
            const params = new URLSearchParams(window.location.search);
            const source = params.get('source');

            await setDoc(doc(db, 'users', cred.user.uid), {
                uid: cred.user.uid,
                email: cred.user.email,
                displayName: getEmailDisplayName(cred.user.email),
                displayNameSource: 'email',
                authProvider: 'password',
                emailVerified: cred.user.emailVerified,
                createdAt: serverTimestamp(),
                promotions: {},
                status: 'active',
                ...(referredBy ? { referredBy } : {}),
                ...(source ? { source } : {})
            });
            if (referredBy) {
                const referralApplied = await waitForReferralEntitlement(cred.user.uid);
                if (referralApplied) localStorage.removeItem('careervivid_referral');
            }
            trackUsage(cred.user.uid, 'sign_in', { signup: true });

            // Check for redirect param
            const redirectParams = new URLSearchParams(window.location.search);
            const redirectUrl = redirectParams.get('redirect');
            if (redirectUrl) {
                navigate(getSafeRelativeRedirect(redirectUrl));
            }
        } catch (err: any) {
            handleAuthError(err);
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = await resolveSignedInWorkspace();

            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                const referredBy = getReferralCode();

                const params = new URLSearchParams(window.location.search);
                const source = params.get('source');

                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: getEmailDisplayName(user.email) || user.displayName,
                    displayNameSource: getEmailDisplayName(user.email) ? 'email' : 'google',
                    photoURL: user.photoURL,
                    authProvider: 'google',
                    emailVerified: user.emailVerified,
                    createdAt: serverTimestamp(),
                    promotions: {},
                    status: 'active',
                    ...(referredBy ? { referredBy } : {}),
                    ...(source ? { source } : {})
                });
                if (referredBy) {
                    const referralApplied = await waitForReferralEntitlement(user.uid);
                    if (referralApplied) localStorage.removeItem('careervivid_referral');
                }
                trackUsage(user.uid, 'sign_in', {
                    signup: true,
                    provider: 'google',
                    resolvedWorkspace: user.uid !== result.user.uid,
                });
            } else {
                trackUsage(user.uid, 'sign_in', {
                    provider: 'google',
                    resolvedWorkspace: user.uid !== result.user.uid,
                });
            }

            // Check for redirect param
            const redirectParams = new URLSearchParams(window.location.search);
            const redirectUrl = redirectParams.get('redirect');
            if (redirectUrl) {
                navigate(getSafeRelativeRedirect(redirectUrl));
            }
        } catch (err: any) {
            handleAuthError(err);
            setLoading(false);
        }
    };

    const LoadingOverlay = () => (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-4 animate-fade-in">
            <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6">{t('auth.please_wait')}</h1>
            <div className="h-6 mt-2">
                <p key={loadingMessageIndex} className="text-gray-600 dark:text-gray-400 animate-fade-in font-medium">
                    {loadingMessages[loadingMessageIndex]}
                </p>
            </div>
        </div>
    );

    // TikTok Auth Logic (Same as SignIn)
    const handleTikTokLogin = () => {
        setLoading(true);
        const csrfState = Math.random().toString(36).substring(7);
        localStorage.setItem('tiktok_node_auth_state', csrfState);

        // Store context for after redirect (TikTok doesn't allow query params in redirect URI)
        const sourceParam = new URLSearchParams(window.location.search).get('source');
        if (sourceParam === 'bio-link') {
            localStorage.setItem('tiktok_auth_context', 'bio-link');
        }

        // Redirect with CLEAN URL (no query params)
        const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
        const redirectUri = `${window.location.origin}/signup`; // Clean base URL
        const scope = 'user.info.basic,user.info.profile,user.info.stats,video.list';
        const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${csrfState}`;
        window.location.href = url;
    };

    // Handle TikTok Callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const storedState = localStorage.getItem('tiktok_node_auth_state');

        if (code && state && storedState && state === storedState) {
            const processTikTokAuth = async () => {
                setLoading(true);
                try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const functions = getFunctions();
                    const authWithTikTokFn = httpsCallable(functions, 'authWithTikTok');

                    // Pass redirectUri consistent with request
                    const result = await authWithTikTokFn({
                        code,
                        redirectUri: `${window.location.origin}/signup`
                    });

                    const { token } = result.data as { token: string };

                    const { signInWithCustomToken } = await import('firebase/auth');
                    await signInWithCustomToken(auth, token);

                    localStorage.removeItem('tiktok_node_auth_state');
                    navigate('/dashboard');

                } catch (err: any) {
                    console.error("TikTok Auth Failed:", err);
                    setError("TikTok Sign Up failed. Please try again.");
                    setLoading(false);
                }
            };
            processTikTokAuth();
        }
    }, []);

    // Helper to check context - also check localStorage for TikTok callback
    const isBioLinkContext = new URLSearchParams(window.location.search).get('source') === 'bio-link'
        || localStorage.getItem('tiktok_auth_context') === 'bio-link';

    const isBioLink = new URLSearchParams(window.location.search).get('source') === 'bio-link';

    return (
        <AuthShell
            filename="create-account"
            title={isBioLink ? 'Create your Bio-Link account' : t('auth.create_account')}
            subtitle={isBioLink ? 'Claim your unique URL and start sharing.' : t('auth.start_building')}
        >
            {loading && <LoadingOverlay />}

            <div>
                <div>

                    <div className="text-center mb-8">

                        {getReferralCode() && (
                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-800/20 rounded-full">
                                <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                                    🎁 Referral code applied! You'll get 2 Months of Free Premium (1000 AI credits/month)
                                </span>
                            </div>
                        )}
                    </div>

                    <form className="space-y-5" onSubmit={handleSignUp}>
                        <div>
                            <label htmlFor="email" className="sr-only">{t('auth.email_label')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="block w-full py-3.5 rounded-xl text-sm font-medium focus:outline-none transition-all pl-11 pr-4"
                                    style={{ background: 'var(--cvl-paper-2)', border: '1px solid var(--cvl-line)', color: 'var(--cvl-ink)' }}
                                    placeholder={t('auth.email_placeholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="sr-only">{t('auth.password_label')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="block w-full py-3.5 rounded-xl text-sm font-medium focus:outline-none transition-all pl-11 pr-11"
                                    style={{ background: 'var(--cvl-paper-2)', border: '1px solid var(--cvl-line)', color: 'var(--cvl-ink)' }}
                                    placeholder={t('auth.password_placeholder')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 animate-slide-up">
                                <p className="text-sm text-red-600 dark:text-red-400 text-center font-semibold mb-3">
                                    {error}
                                </p>
                                {isDuplicateEmail && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/signin?email=${encodeURIComponent(email)}`)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all shadow-sm group"
                                    >
                                        Log in with this email
                                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                )}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                                <p className="text-sm text-green-600 dark:text-green-400 text-center font-medium">{success}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white disabled:opacity-70 disabled:cursor-not-allowed transition hover:opacity-90"
                            style={{ background: 'var(--cvl-purple)' }}
                        >
                            {t('auth.create_account_btn')}
                        </button>
                    </form>

                    <div className="my-8 relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t" style={{ borderColor: 'var(--cvl-line)' }}></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 font-medium" style={{ background: 'var(--cvl-paper)', color: 'var(--cvl-faint)' }}>{t('auth.or_continue_with')}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Contextual TikTok Button */}
                        {isBioLinkContext && (
                            <button
                                onClick={handleTikTokLogin}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[#FE2C55] text-white text-sm font-black uppercase border-2 border-black hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                            >
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 448 512"><path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17h0A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z" /></svg>
                                Continue with TikTok
                            </button>
                        )}

                        <button
                            onClick={handleGoogleSignUp}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl text-sm font-bold transition hover:opacity-80"
                            style={{ background: 'var(--cvl-paper)', border: '1px solid var(--cvl-line)', color: 'var(--cvl-ink)' }}
                        >
                            <svg className="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 398.2 0 256S111.8 0 244 0c71.2 0 130.9 27.8 176.9 72.9l-63.1 61.3C294.3 93.6 270.3 80 244 80 158.4 80 90 148.2 90 233.9s68.4 153.9 154 153.9c75.5 0 120.9-42.3 124.9-97.9H244v-77.3h236.1c2.4 12.7 3.9 26.1 3.9 40.2z"></path></svg>
                            {t('auth.google')}
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t text-center" style={{ borderColor: 'var(--cvl-line)' }}>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 font-medium uppercase tracking-wider text-[10px]">
                            Just exploring?
                        </p>
                        <a
                            href="/community"
                            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl transition group hover:opacity-80"
                            style={{ background: 'var(--cvl-paper-2)', border: '1px solid var(--cvl-line)', color: 'var(--cvl-ink)' }}
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                                <Users size={16} />
                            </div>
                            <span className="font-bold text-sm">Explore Community</span>
                            <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                    </div>
                </div>
            </div>
        </AuthShell>
    );
};

export default SignUpPage;
