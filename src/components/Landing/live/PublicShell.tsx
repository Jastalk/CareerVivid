import React from 'react';
import { Battery, Wifi } from 'lucide-react';
import './liveLanding.css';
import { useClock } from './liveHooks';
import { useAuth } from '../../../contexts/AuthContext';

/*
 * The editor has two doors and the right one depends on who is knocking.
 *
 * /newresume is behind ProtectedRoute and opens the signed-in workspace with
 * every saved resume in it. /edit/new is the guest door: a blank draft in local
 * storage, no account. Pointing everyone at one of them is wrong in both
 * directions — a guest sent to /newresume hits a sign-in wall, and a signed-in
 * user sent to /edit/new starts a throwaway draft beside the resumes they
 * already have.
 */
export const resumeHref = (signedIn: boolean): string => (signedIn ? '/newresume' : '/edit/new');

const navFor = (signedIn: boolean) => [
    { href: '/jobs', label: 'jobs' },
    { href: '/interview-studio', label: 'quests' },
    { href: resumeHref(signedIn), label: 'resume' },
    { href: '/learning', label: 'learning' },
    { href: '/pricing', label: 'pricing' },
];

/**
 * The strip along the top of every public page. It is a menu bar, and the clock
 * is the real time — the one piece of chrome that proves the page is running.
 *
 * `anchors` swaps the product links for in-page ones on the landing page, where
 * the sections being linked to are on the page already.
 */
export const MenuBar: React.FC<{ anchors?: { href: string; label: string }[] }> = ({ anchors }) => {
    const time = useClock();
    const { currentUser } = useAuth();
    const signedIn = Boolean(currentUser);
    const links = anchors ?? navFor(signedIn);
    return (
        <header
            className="sticky top-0 z-40 border-b backdrop-blur-md"
            style={{ borderColor: 'var(--cvl-line)', background: 'color-mix(in srgb, var(--cvl-desk) 82%, transparent)' }}
        >
            <div className="mx-auto flex h-9 max-w-[1400px] items-center gap-5 px-4 text-[12.5px]">
                <a href="/" className="font-semibold tracking-tight">careervivid</a>
                <nav className="hidden gap-4 sm:flex" style={{ color: 'var(--cvl-muted)' }}>
                    {links.map((link) => (
                        <a key={link.href} href={link.href} className="transition hover:opacity-70">{link.label}</a>
                    ))}
                </nav>
                <div className="ml-auto flex items-center gap-3" style={{ color: 'var(--cvl-faint)' }}>
                    <Wifi size={13} className="hidden sm:block" />
                    <Battery size={14} className="hidden sm:block" />
                    <span className="cvl-mono text-[12px] tabular-nums">{time}</span>
                    {signedIn ? (
                        <a
                            href="/dashboard"
                            className="font-semibold transition hover:opacity-70"
                            style={{ color: 'var(--cvl-purple)' }}
                        >
                            dashboard
                        </a>
                    ) : (
                        <>
                            <a href="/signin" className="hidden transition hover:opacity-70 sm:block">sign in</a>
                            <a
                                href="/signup"
                                className="font-semibold transition hover:opacity-70"
                                style={{ color: 'var(--cvl-purple)' }}
                            >
                                start free
                            </a>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

/*
 * Terms and Policy are here because this footer is the only place a public
 * page links to them. The old site-wide Footer carried both; when the public
 * pages moved onto this one, /terms and /policy stopped being reachable from
 * anywhere a visitor or a crawler could get to — on a product that takes
 * payment on /pricing, that is a legal problem before it is an SEO one.
 */
const footerLinksFor = (signedIn: boolean) => [
    { href: '/interview-studio', label: 'Interview studio' },
    { href: resumeHref(signedIn), label: 'Resume editor' },
    { href: '/learning', label: 'Learning' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
    { href: '/policy', label: 'Policy' },
];

/*
 * pb-24 rather than a symmetric py-9: the Career Agent launcher is
 * `position: fixed` in a bottom corner at 288px wide, and App.tsx mounts it on
 * every authenticated route with no path filter, so a signed-in visitor
 * scrolled to the bottom of /pricing on a narrow viewport had the launcher
 * sitting on the copyright line and part of the link row. The pages' own pb-16
 * sits above the footer and does not help.
 */
export const PublicFooter: React.FC = () => {
    const { currentUser } = useAuth();
    return (
    <footer className="border-t pt-9 pb-24" style={{ borderColor: 'var(--cvl-line)' }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center">
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]" style={{ color: 'var(--cvl-muted)' }}>
                {footerLinksFor(Boolean(currentUser)).map((link) => (
                    <a key={link.href} href={link.href} className="transition hover:opacity-70">{link.label}</a>
                ))}
            </nav>
            <p className="cvl-mono text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                © {new Date().getFullYear()} careervivid
            </p>
        </div>
    </footer>
    );
};

/**
 * The desk, with one window on it. Sign-in and sign-up put their existing forms
 * inside this so they arrive on the same surface as the rest of the site rather
 * than a lavender gradient of their own.
 */
export const AuthShell: React.FC<{
    filename: string;
    title: string;
    subtitle?: string;
    /** Shown under the card — the reason to go through with it. */
    aside?: React.ReactNode;
    children: React.ReactNode;
}> = ({ filename, title, subtitle, aside, children }) => (
    <div className="cvl min-h-screen">
        <MenuBar />
        <main className="mx-auto flex w-full max-w-md flex-col px-4 py-10 sm:py-16">
            <div className="cvl-win">
                <div className="cvl-bar" style={{ backgroundImage: 'linear-gradient(90deg, rgba(98,91,213,0.16), transparent 65%)' }}>
                    <span className="cvl-dot cvl-dot-r" />
                    <span className="cvl-dot cvl-dot-y" />
                    <span className="cvl-dot cvl-dot-g" />
                    <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-muted)' }}>{filename}</span>
                </div>
                <div className="px-6 py-8 sm:px-8">
                    <h1 className="text-center text-2xl font-semibold tracking-tight">{title}</h1>
                    {subtitle && (
                        <p className="mt-2 text-center text-[14px]" style={{ color: 'var(--cvl-muted)' }}>{subtitle}</p>
                    )}
                    <div className="mt-7">{children}</div>
                </div>
            </div>
            {aside && <div className="mt-5">{aside}</div>}
        </main>
        <PublicFooter />
    </div>
);
