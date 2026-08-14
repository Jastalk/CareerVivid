import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    signInWithEmailAndPassword,
    signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Eye, EyeOff, Loader2, Mail, Lock, ChevronRight, Users, Briefcase, CheckCircle2, FileText, PanelRightOpen, Sparkles } from 'lucide-react';
import { trackUsage } from '../services/trackingService';
import { navigate } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';
import { queueTransactionalAuthEmail } from '../services/transactionalEmailService';
import { resolveSignedInWorkspace } from '../services/authAccountLinkingService';
import { getSafeRelativeRedirect } from '../utils/security';
import { MenuBar, PublicFooter } from '../components/Landing/live/PublicShell';

const normalizeCliPort = (port: string | null): string | null => {
    if (!port || !/^\d{1,5}$/.test(port)) return null;
    const parsedPort = Number(port);
    return parsedPort >= 1 && parsedPort <= 65535 ? String(parsedPort) : null;
};

const SignInPage: React.FC = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [isMissingUser, setIsMissingUser] = useState(false);
    const { currentUser } = useAuth();
    const [cliPort, setCliPort] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect');
        const safeRedirectUrl = getSafeRelativeRedirect(redirectUrl, '');
        if (safeRedirectUrl) {
            if (safeRedirectUrl.startsWith('/extension-welcome')) {
                window.location.replace(safeRedirectUrl);
                return;
            }
        }
        
        // Handle pre-filled email (frictionless transition)
        const emailParam = params.get('email');
        if (emailParam) {
            setEmail(decodeURIComponent(emailParam));
        }

        const port = normalizeCliPort(params.get('cli_port'));
        if (port) {
            setCliPort(port);
        }
    }, []);

    useEffect(() => {
        if (currentUser && cliPort) {
            const handleCliAuth = async () => {
                setLoading(true);
                try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const functions = getFunctions(undefined, "us-west1");
                    const manageApiKey = httpsCallable<{ action: string }, { key: string }>(
                        functions,
                        "manageApiKey"
                    );

                    let result = await manageApiKey({ action: "get" });
                    if (!result.data.key) {
                        result = await manageApiKey({ action: "generate" });
                    }

                    const key = result.data.key;
                    if (!key) throw new Error("Failed to retrieve API key.");

                    const callbackUrl = `http://127.0.0.1:${cliPort}/callback?token=${encodeURIComponent(key)}`;

                    setTimeout(() => {
                        window.location.href = callbackUrl;
                    }, 800);
                } catch (err: any) {
                    console.error("CLI auth error:", err);
                    setError("CLI Authentication failed. " + (err.message || "Unknown error"));
                    setLoading(false);
                }
            };
            handleCliAuth();
        }
    }, [currentUser, cliPort]);

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
        setIsMissingUser(false);
        switch (err.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                setError(t('auth.error_invalid'));
                setIsMissingUser(true);
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

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const user = await resolveSignedInWorkspace();
            trackUsage(user.uid, 'sign_in', {
                resolvedWorkspace: user.uid !== cred.user.uid,
                provider: 'password',
            });

            // Check for redirect param
            const params = new URLSearchParams(window.location.search);
            const redirectUrl = params.get('redirect');
            if (redirectUrl) {
                navigate(getSafeRelativeRedirect(redirectUrl));
            } else if (!cliPort) {
                navigate('/dashboard');
            }
        } catch (err: any) {
            handleAuthError(err);
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = await resolveSignedInWorkspace();

            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                trackUsage(user.uid, 'sign_in', {
                    provider: 'google',
                    resolvedWorkspace: user.uid !== result.user.uid,
                });
            } else {
                // New user signing up via Google - redirect to signup
                await auth.signOut();
                setLoading(false);
                navigate('/signup');
                return;
            }

            // Check for redirect param
            const params = new URLSearchParams(window.location.search);
            const redirectUrl = params.get('redirect');
            if (redirectUrl) {
                navigate(getSafeRelativeRedirect(redirectUrl));
            } else if (!cliPort) {
                navigate('/dashboard');
            }
        } catch (err: any) {
            handleAuthError(err);
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setError(t('auth.enter_email_reset'));
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await queueTransactionalAuthEmail({ type: 'password_reset', email });
            setSuccess(t('auth.reset_sent'));
        } catch (err: any) {
            handleAuthError(err);
        }
        setLoading(false);
    };

    const LoadingOverlay = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f7f1e7]/90 p-4 text-center backdrop-blur-sm dark:bg-[#1f1f1d]/90">
            <div className="w-full max-w-sm rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] p-6 shadow-[0_20px_60px_rgba(80,55,28,0.12)] dark:border-[#37332d] dark:bg-[#262522]">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[#e4d3bc] bg-white text-[#8b5a16] dark:border-[#37332d] dark:bg-[#302e2a] dark:text-[#caa26c]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <h1 className="mt-4 text-lg font-bold text-[#211b16] dark:text-[#f4f1e9]">{t('auth.please_wait')}</h1>
                <div className="mt-2 min-h-6">
                    <p key={loadingMessageIndex} className="animate-fade-in text-sm font-semibold text-[#665a4a] dark:text-[#aaa39a]">
                    {cliPort && currentUser ? "Authorizing CLI and sending credentials..." : loadingMessages[loadingMessageIndex]}
                </p>
                </div>
            </div>
        </div>
    );

    // Helper to check context - moved up for use in handlers
    const isBioLinkContext = new URLSearchParams(window.location.search).get('source') === 'bio-link'
        || localStorage.getItem('tiktok_auth_context') === 'bio-link';

    // TikTok Login Flow
    const handleTikTokLogin = () => {
        setLoading(true);
        // 1. Generate State
        const csrfState = Math.random().toString(36).substring(7);
        localStorage.setItem('tiktok_node_auth_state', csrfState);

        // Store context for after redirect (TikTok doesn't allow query params in redirect URI)
        if (isBioLinkContext) {
            localStorage.setItem('tiktok_auth_context', 'bio-link');
        }

        // 2. Redirect with CLEAN URL (no query params)
        const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
        const redirectUri = `${window.location.origin}/signin`; // Clean base URL
        const scope = 'user.info.basic,user.info.profile,user.info.stats,video.list';
        const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${csrfState}`;
        window.location.href = url;
    };

    // Handle TikTok Callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        // Ensure we are processing a TikTok login attempt
        // We can check if state matches what we stored
        const storedState = localStorage.getItem('tiktok_node_auth_state');

        if (code && state && storedState && state === storedState) {
            const processTikTokAuth = async () => {
                setLoading(true);
                try {
                    // Exchange code for Custom Token via Backend
                    // Note: We use a direct HTTPs call logic or Callable. 
                    // Since `authWithTikTok` is onCall, we use functions client.
                    // But here we might not have `functions` exported from firebase.ts directly?
                    // Let's assume we can import it or use HTTP. 
                    // Actually, `authWithTikTok` was defined as onCall.

                    // Import functions dynamically or assume it's available. 
                    // Checking imports... `import { auth, googleProvider, db } from '../firebase';`
                    // I might need to update firebase.ts to export functions, or use `httpsCallable`.
                    // Let's assume I need to add `functions` to imports if not there.

                    // FALLBACK: If functions is not exported, I can use fetch to the HTTP trigger URL if I made it onRequest.
                    // BUT I made it `onCall`. So I MUST use `httpsCallable`.

                    // I'll grab functions from `../firebase` if possible. If not, I'll init it.
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const functions = getFunctions();
                    const authWithTikTokFn = httpsCallable(functions, 'authWithTikTok');

                    const result = await authWithTikTokFn({
                        code,
                        redirectUri: `${window.location.origin}/signin`
                    });

                    const { token } = result.data as { token: string };

                    // Sign in with Custom Token
                    const { signInWithCustomToken } = await import('firebase/auth');
                    await signInWithCustomToken(auth, token);

                    // Cleanup
                    localStorage.removeItem('tiktok_node_auth_state');

                    // Redirect
                    navigate('/dashboard');

                } catch (err: any) {
                    console.error("TikTok Auth Failed:", err);
                    setError("TikTok Login failed. Please try again.");
                    setLoading(false);
                }
            };
            processTikTokAuth();
        }
    }, []);

    return (
        <div className="cvl relative min-h-screen font-sans">
            {loading && <LoadingOverlay />}
            <MenuBar />

            <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
                <main className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1fr)] lg:gap-12">
                    <section className="order-2 hidden lg:block">
                        <div className="max-w-xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9c7ad] bg-[#fffaf1] px-3 py-1.5 text-[11px] font-bold text-[#8b5a16] shadow-sm dark:border-[#37332d] dark:bg-[#262522] dark:text-[#caa26c]">
                                <Sparkles size={13} />
                                Job-search workspace
                            </div>
                            <h1 className="max-w-lg text-[32px] font-bold leading-tight text-[#211b16] dark:text-[#f4f1e9]">
                                Keep every saved role, resume, and interview prep in one calm place.
                            </h1>
                            <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                Sign in to sync the Chrome extension with your CareerVivid dashboard. Save a job, tailor a resume, then practice from the same role context.
                            </p>
                        </div>

                        <div className="mt-8 grid max-w-xl gap-3">
                            <div className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1]/92 p-4 shadow-sm dark:border-[#37332d] dark:bg-[#262522]/92">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[#4a4392] dark:bg-[#302e2a] dark:text-[#8d88e6]">
                                        <Briefcase size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">Application workspace</h2>
                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Synced</span>
                                        </div>
                                        <p className="mt-1 text-xs font-semibold leading-5 text-[#665a4a] dark:text-[#aaa39a]">
                                            Track active jobs with saved descriptions, deadlines, notes, and prep status.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-[#e4d3bc] bg-white/90 p-4 shadow-sm dark:border-[#37332d] dark:bg-[#262522]/90">
                                    <FileText size={18} className="text-[#a97935] dark:text-[#caa26c]" />
                                    <h3 className="mt-3 text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">Tailor resume</h3>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-[#665a4a] dark:text-[#aaa39a]">Open your resume with the selected job already loaded.</p>
                                </div>
                                <div className="rounded-2xl border border-[#e4d3bc] bg-white/90 p-4 shadow-sm dark:border-[#37332d] dark:bg-[#262522]/90">
                                    <PanelRightOpen size={18} className="text-[#4a4392] dark:text-[#8d88e6]" />
                                    <h3 className="mt-3 text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">Practice interview</h3>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-[#665a4a] dark:text-[#aaa39a]">Use the job description to generate focused questions.</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[#e4d3bc] bg-[#f9efe0]/80 p-4 dark:border-[#37332d] dark:bg-[#302e2a]/80">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#665a4a] dark:text-[#aaa39a]">
                                    <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-300" />
                                    New extension installs keep the job context when you move between Chrome and CareerVivid.
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="order-1 w-full max-w-md justify-self-center lg:justify-self-start">
                        <div className="cvl-win">
                          <div className="cvl-bar" style={{ backgroundImage: 'linear-gradient(90deg, rgba(98,91,213,0.16), transparent 65%)' }}>
                            <span className="cvl-dot cvl-dot-r" />
                            <span className="cvl-dot cvl-dot-y" />
                            <span className="cvl-dot cvl-dot-g" />
                            <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-muted)' }}>sign-in</span>
                          </div>
                          <div className="p-6 sm:p-8">
                            <div className="mb-7">
                                {isBioLinkContext ? (
                                    <>
                                        <h2 className="text-2xl font-bold tracking-tight text-[#211b16] dark:text-[#f4f1e9]">
                                            Welcome, creator
                                        </h2>
                                        <p className="mt-2 text-sm font-medium leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                            Sign in to manage your Bio-Link workspace.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-bold tracking-tight text-[#211b16] dark:text-[#f4f1e9]">
                                            {t('auth.welcome_back')}
                                        </h2>
                                        <p className="mt-2 text-sm font-medium leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                            Sign in to sync resumes, saved jobs, and interview prep.
                                        </p>
                                    </>
                                )}
                            </div>

                            <form className="space-y-4" onSubmit={handleSignIn}>
                                <div>
                                    <label htmlFor="email" className="mb-2 block text-xs font-bold text-[#665a4a] dark:text-[#aaa39a]">{t('auth.email_label')}</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                            <Mail className="h-4 w-4 text-[#9a651f] dark:text-[#caa26c]" />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            className="block h-12 w-full rounded-xl border border-[#e4d3bc] bg-white px-4 pl-10 text-sm font-semibold text-[#211b16] placeholder:text-[#9b8b79] transition focus:border-[#5b5599] focus:outline-none focus:ring-4 focus:ring-[#5b5599]/15 dark:border-[#37332d] dark:bg-[#1f1f1d] dark:text-[#f4f1e9] dark:placeholder:text-[#777069]"
                                            placeholder={t('auth.email_placeholder')}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <label htmlFor="password" className="block text-xs font-bold text-[#665a4a] dark:text-[#aaa39a]">{t('auth.password_label')}</label>
                                        <button type="button" onClick={handlePasswordReset} className="text-xs font-bold text-[#4a4392] transition hover:text-[#4e46bf] focus:outline-none focus:ring-2 focus:ring-[#5b5599]/30 dark:text-[#8d88e6]">
                                            {t('auth.forgot_password')}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                            <Lock className="h-4 w-4 text-[#9a651f] dark:text-[#caa26c]" />
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            className="block h-12 w-full rounded-xl border border-[#e4d3bc] bg-white px-4 pl-10 pr-11 text-sm font-semibold text-[#211b16] placeholder:text-[#9b8b79] transition focus:border-[#5b5599] focus:outline-none focus:ring-4 focus:ring-[#5b5599]/15 dark:border-[#37332d] dark:bg-[#1f1f1d] dark:text-[#f4f1e9] dark:placeholder:text-[#777069]"
                                            placeholder={t('auth.password_placeholder')}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#7d6e5e] transition hover:text-[#211b16] focus:outline-none focus:ring-2 focus:ring-[#5b5599]/30 dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
                                        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                                            {error}
                                        </p>
                                        {isMissingUser && (
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/signup?email=${encodeURIComponent(email)}`)}
                                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-[#262522] dark:text-rose-300 dark:hover:bg-rose-950/40"
                                            >
                                                Create a new account
                                                <ChevronRight size={15} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {success && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{success}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#5650c8] bg-[#4a4392] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#5650c8] focus:outline-none focus:ring-4 focus:ring-[#5b5599]/25 disabled:cursor-not-allowed disabled:border-[#d7d0c5] disabled:bg-[#ece5da] disabled:text-[#9b8b79] dark:border-[#8d88e6] dark:bg-[#5b5599] dark:hover:bg-[#8079e4] dark:disabled:border-[#37332d] dark:disabled:bg-[#302e2a] dark:disabled:text-[#777069]"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    {t('auth.sign_in')}
                                </button>
                            </form>

                            <div className="my-6 flex items-center gap-3">
                                <div className="h-px flex-1 bg-[#e4d3bc] dark:bg-[#37332d]" aria-hidden="true"></div>
                                <span className="text-xs font-bold text-[#7d6e5e] dark:text-[#aaa39a]">{t('auth.or_continue_with')}</span>
                                <div className="h-px flex-1 bg-[#e4d3bc] dark:bg-[#37332d]" aria-hidden="true"></div>
                            </div>

                            <div className="space-y-3">
                                {isBioLinkContext && (
                                    <button
                                        onClick={handleTikTokLogin}
                                        disabled={loading}
                                        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#e4d3bc] bg-white px-4 text-sm font-bold text-[#211b16] shadow-sm transition hover:border-[#d9c7ad] hover:bg-[#fffaf1] focus:outline-none focus:ring-4 focus:ring-[#5b5599]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#37332d] dark:bg-[#1f1f1d] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]"
                                    >
                                        <svg className="h-5 w-5 fill-current" viewBox="0 0 448 512"><path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17h0A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z" /></svg>
                                        Continue with TikTok
                                    </button>
                                )}

                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={loading}
                                    className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#e4d3bc] bg-white px-4 text-sm font-bold text-[#211b16] shadow-sm transition hover:border-[#d9c7ad] hover:bg-[#fffaf1] focus:outline-none focus:ring-4 focus:ring-[#5b5599]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#37332d] dark:bg-[#1f1f1d] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]"
                                >
                                    <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 398.2 0 256S111.8 0 244 0c71.2 0 130.9 27.8 176.9 72.9l-63.1 61.3C294.3 93.6 270.3 80 244 80 158.4 80 90 148.2 90 233.9s68.4 153.9 154 153.9c75.5 0 120.9-42.3 124.9-97.9H244v-77.3h236.1c2.4 12.7 3.9 26.1 3.9 40.2z"></path></svg>
                                    {t('auth.google')}
                                </button>
                            </div>

                            <div className="mt-6 flex flex-col gap-3 border-t border-[#e4d3bc] pt-5 text-center dark:border-[#37332d]">
                                <p className="text-xs font-semibold text-[#665a4a] dark:text-[#aaa39a]">
                                    New to CareerVivid?{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate(email ? `/signup?email=${encodeURIComponent(email)}` : '/signup')}
                                        className="font-bold text-[#4a4392] hover:text-[#4e46bf] dark:text-[#8d88e6]"
                                    >
                                        Start for free
                                    </button>
                                </p>
                                <a
                                    href="/community"
                                    className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#e4d3bc] bg-[#fffaf1] px-4 py-2 text-xs font-bold text-[#665a4a] transition hover:border-[#caa26c] hover:text-[#211b16] dark:border-[#37332d] dark:bg-[#302e2a] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]"
                                >
                                    <Users size={14} />
                                    Explore community
                                    <ChevronRight size={13} />
                                </a>
                            </div>
                          </div>
                        </div>
                    </section>
                </main>
            </div>
            <PublicFooter />
        </div>
    );
};

export default SignInPage;
