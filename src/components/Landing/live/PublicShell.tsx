import React from 'react';
import { Battery, Wifi } from 'lucide-react';
import './liveLanding.css';
import { useClock } from './liveHooks';

const NAV = [
    { href: '/interview-studio', label: 'quests' },
    { href: '/newresume', label: 'resume' },
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
    const links = anchors ?? NAV;
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
                    <a href="/signin" className="hidden transition hover:opacity-70 sm:block">sign in</a>
                    <a
                        href="/signup"
                        className="font-semibold transition hover:opacity-70"
                        style={{ color: 'var(--cvl-purple)' }}
                    >
                        start free
                    </a>
                </div>
            </div>
        </header>
    );
};

const FOOTER_LINKS = [
    { href: '/interview-studio', label: 'Interview studio' },
    { href: '/newresume', label: 'Resume editor' },
    { href: '/learning', label: 'Learning' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
    { href: '/privacy', label: 'Privacy' },
];

export const PublicFooter: React.FC = () => (
    <footer className="border-t py-9" style={{ borderColor: 'var(--cvl-line)' }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center">
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]" style={{ color: 'var(--cvl-muted)' }}>
                {FOOTER_LINKS.map((link) => (
                    <a key={link.href} href={link.href} className="transition hover:opacity-70">{link.label}</a>
                ))}
            </nav>
            <p className="cvl-mono text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                © {new Date().getFullYear()} careervivid
            </p>
        </div>
    </footer>
);

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
                    <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>{filename}</span>
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
