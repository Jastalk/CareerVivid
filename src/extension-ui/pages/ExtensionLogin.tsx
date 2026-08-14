import React from 'react';
import {
    Briefcase,
    Chrome,
    LogIn,
    Mic,
    Monitor,
    Moon,
    Sparkles,
    Sun,
    UserPlus,
    Wand2,
} from 'lucide-react';
import { Theme, useTheme } from '../../contexts/ThemeContext';
import { getAppUrl } from '../../utils/extensionUtils';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOGO ASSETS: Dynamic theming based on user preference
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LOGO_LIGHT = 'https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Flogo_light_mode.png?alt=media';
const LOGO_DARK = 'https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Flogo_dark_mode.png?alt=media';

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: React.ElementType }> = [
    { value: 'system', label: 'Default', icon: Monitor },
    { value: 'bright', label: 'Bright', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
];

const WORKSPACE_STEPS = [
    {
        title: 'Save jobs',
        description: 'Keep roles organized with the job context attached.',
        icon: Briefcase,
        iconClassName: 'bg-[#eef0ff] text-[#4a4392] dark:bg-[#302f49] dark:text-[#b8b3ff]',
    },
    {
        title: 'Tailor resume',
        description: 'Open your resume with the active listing loaded.',
        icon: Wand2,
        iconClassName: 'bg-[#fbf2ff] text-[#8f3df0] dark:bg-[#302f49] dark:text-[#b8b3ff]',
    },
    {
        title: 'Practice',
        description: 'Build interview prep from the same job signal.',
        icon: Mic,
        iconClassName: 'bg-[#fff0f7] text-[#d95b92] dark:bg-[#3a2630] dark:text-[#ff9ac4]',
    },
];

const ExtensionThemeMenu: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const activeTheme = theme === 'light' ? 'system' : theme;
    const CurrentIcon = THEME_OPTIONS.find((option) => option.value === activeTheme)?.icon || Monitor;

    return (
        <div className="relative group">
            <button
                type="button"
                title="Theme"
                aria-label="Theme"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ececf4] bg-white text-slate-400 shadow-sm transition-colors hover:bg-[#f8f8fb] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d88e6] dark:border-[#3a3834] dark:bg-[#262522] dark:text-[#aaa39a] dark:hover:bg-[#302e2a] dark:hover:text-[#f4f1e9]"
            >
                <CurrentIcon size={16} />
            </button>
            <div className="pointer-events-none absolute right-0 top-full z-20 w-max translate-y-1 pt-2 opacity-0 transition-all group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <div className="flex gap-1 rounded-2xl border border-[#ececf4] bg-white/95 p-1.5 shadow-[0_14px_28px_rgba(15,23,42,0.12)] backdrop-blur dark:border-[#3a3834] dark:bg-[#262522]/95 dark:shadow-[0_18px_34px_rgba(0,0,0,0.35)]">
                    {THEME_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isActive = activeTheme === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setTheme(option.value)}
                                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d88e6] ${
                                    isActive
                                        ? 'border-[#c8c7f4] bg-[#f3f2ff] text-[#4a4392] dark:border-[#4d4a73] dark:bg-[#302f49] dark:text-[#b8b3ff]'
                                        : 'border-transparent text-slate-400 hover:border-[#ececf4] hover:bg-[#f8f8fb] hover:text-slate-700 dark:text-[#aaa39a] dark:hover:border-[#3a3834] dark:hover:bg-[#302e2a] dark:hover:text-[#f4f1e9]'
                                }`}
                                title={option.label}
                                aria-label={`Use ${option.label} theme`}
                            >
                                <Icon size={15} />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const ExtensionLogin: React.FC = () => {
    const { resolvedTheme } = useTheme();
    const isDarkMode = resolvedTheme === 'dark';
    const logoSrc = isDarkMode ? LOGO_DARK : LOGO_LIGHT;

    const openWebPage = (path: string) => {
        const url = getAppUrl(path);
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url });
        } else {
            window.open(url, '_blank');
        }
    };

    const openAuthPage = (mode: 'signin' | 'signup') => {
        const extensionId = typeof chrome !== 'undefined' && chrome.runtime?.id
            ? `&extension_id=${encodeURIComponent(chrome.runtime.id)}`
            : '';
        const redirect = encodeURIComponent('/extension-auth-complete');
        openWebPage(`/${mode}?redirect=${redirect}${extensionId}`);
    };

    return (
        <div className="flex h-full min-h-[520px] w-full flex-col overflow-hidden bg-[#f8f8fb] px-4 py-4 text-slate-950 dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
            <header className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#ececf4] bg-white shadow-sm dark:border-[#3a3834] dark:bg-[#262522]">
                        <img
                            src={logoSrc}
                            alt="CareerVivid"
                            className="h-7 w-7 rounded-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-[#f4f1e9]">CareerVivid</p>
                        <p className="text-[10px] font-semibold text-[#6b66d8] dark:text-[#b8b3ff]">Application workspace</p>
                    </div>
                </div>
                <ExtensionThemeMenu />
            </header>

            <main className="flex flex-1 flex-col justify-center gap-4 py-5">
                <section className="rounded-[24px] border border-[#ececf4] bg-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:border-[#3a3834] dark:bg-[#262522] dark:shadow-none">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e4d3bc] bg-[#fffaf1] px-2.5 py-1 text-[10px] font-semibold text-[#8a6027] dark:border-[#4b4235] dark:bg-[#302e2a] dark:text-[#caa26c]">
                        <Chrome size={12} />
                        Chrome extension
                    </div>

                    <div className="mt-4 space-y-2">
                        <h1 className="text-[22px] font-bold leading-tight tracking-normal text-slate-950 dark:text-[#f4f1e9]">
                            Sign in to CareerVivid
                        </h1>
                        <p className="text-sm leading-relaxed text-slate-500 dark:text-[#aaa39a]">
                            Save jobs, tailor resumes, and practice interviews from one workspace.
                        </p>
                    </div>

                    <div className="mt-4 space-y-2">
                        {WORKSPACE_STEPS.map((step) => {
                            const Icon = step.icon;

                            return (
                                <div
                                    key={step.title}
                                    className="flex items-start gap-3 rounded-2xl border border-[#ececf4] bg-[#fbfbfe] px-3 py-2.5 dark:border-[#3a3834] dark:bg-[#1f1f1d]"
                                >
                                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${step.iconClassName}`}>
                                        <Icon size={14} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-950 dark:text-[#f4f1e9]">{step.title}</p>
                                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-[#aaa39a]">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 space-y-2.5">
                        <button
                            onClick={() => openAuthPage('signin')}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4a4392] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(98,91,213,0.18)] transition-colors hover:bg-[#5851c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d88e6] focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px dark:bg-[#8d88e6] dark:text-[#111827] dark:shadow-none dark:hover:bg-[#a19df0] dark:focus-visible:ring-offset-[#262522]"
                        >
                            <LogIn size={15} />
                            Sign in
                        </button>

                        <button
                            onClick={() => openAuthPage('signup')}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ececf4] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#d9d7fb] hover:bg-[#f8f8fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d88e6] dark:border-[#3a3834] dark:bg-[#302e2a] dark:text-[#f4f1e9] dark:hover:border-[#4d4a73] dark:hover:bg-[#36332f]"
                        >
                            <UserPlus size={15} />
                            Create account
                        </button>
                    </div>
                </section>

                <section className="rounded-[20px] border border-[#e6dac8] bg-[#fffaf1] p-3 dark:border-[#4b4235] dark:bg-[#262522]">
                    <div className="flex items-start gap-2.5">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#f3f2ff] text-[#4a4392] dark:bg-[#302f49] dark:text-[#b8b3ff]">
                            <Sparkles size={14} />
                        </span>
                        <div>
                            <p className="text-xs font-semibold text-[#211b16] dark:text-[#f4f1e9]">Job context stays ready</p>
                            <p className="mt-0.5 text-[11px] leading-snug text-[#665a4a] dark:text-[#aaa39a]">
                                Open a supported job page, then use the extension to carry that role into your tracker, resume, and interview prep.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-[#ececf4] pt-3 text-center dark:border-[#3a3834]">
                <button
                    type="button"
                    onClick={() => openWebPage('/terms')}
                    className="text-[10px] font-medium text-slate-400 transition-colors hover:text-[#4a4392] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d88e6] dark:text-[#8e887f] dark:hover:text-[#b8b3ff]"
                >
                    By continuing, you agree to our Terms of Service
                </button>
            </footer>
        </div>
    );
};

export default ExtensionLogin;
