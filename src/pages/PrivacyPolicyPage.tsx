import React from 'react';
import { MenuBar, PublicFooter } from '../components/Landing/live/PublicShell';
import '../components/Landing/live/liveLanding.css';

/**
 * The privacy policy, on the same desk as the rest of the public site.
 *
 * The copy is untouched — it is a legal document. What changed is the shape it
 * arrives in: one measured column instead of full-bleed slabs, a contents rail
 * that follows you down the page, and the token palette so the text stays
 * readable in both themes.
 */

const SECTIONS = [
    { id: 'collect', title: 'what we collect', file: 'what-we-collect' },
    { id: 'ai', title: 'how Gemini sees your data', file: 'gemini-analysis' },
    { id: 'sharing', title: 'how we use and share it', file: 'use-and-sharing' },
    { id: 'rights', title: 'your rights', file: 'your-rights' },
];

const Dots: React.FC = () => (
    <>
        <span className="cvl-dot cvl-dot-r" />
        <span className="cvl-dot cvl-dot-y" />
        <span className="cvl-dot cvl-dot-g" />
    </>
);

const Section: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => {
    const section = SECTIONS[index];
    return (
        <section id={section.id} className="cvl-win scroll-mt-16">
            <div className="cvl-bar">
                <Dots />
                <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                    {section.file}
                </span>
            </div>
            <div className="p-5 sm:p-7">
                <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                    section {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{section.title}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75]">{children}</div>
            </div>
        </section>
    );
};

const PrivacyPolicyPage: React.FC = () => {
    return (
        <div className="cvl min-h-screen">
            <MenuBar />

            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
                <header className="max-w-3xl">
                    <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                        legal
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
                    <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                        Your privacy is our priority.
                    </p>
                    <p className="cvl-mono mt-3 text-[12px]" style={{ color: 'var(--cvl-faint)' }}>
                        Effective Date: July 20, 2026
                    </p>
                </header>

                <div className="mt-10 lg:grid lg:grid-cols-[184px_minmax(0,1fr)] lg:gap-10">
                    <aside className="hidden lg:block">
                        <div className="sticky top-16">
                            <p
                                className="cvl-mono text-[11px] uppercase tracking-[0.18em]"
                                style={{ color: 'var(--cvl-faint)' }}
                            >
                                contents
                            </p>
                            <nav className="mt-3 flex flex-col gap-2.5 border-l pl-3 text-[13px] leading-snug" style={{ borderColor: 'var(--cvl-line)' }}>
                                {SECTIONS.map((section) => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className="transition hover:opacity-70"
                                        style={{ color: 'var(--cvl-muted)' }}
                                    >
                                        {section.title}
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    <div className="max-w-3xl space-y-6">
                        <Section index={0}>
                            <p><strong>Account Information:</strong> When you register, we collect your name, username, email address, and password. This account data is stored securely within CareerVivid; passwords are always encrypted and are never stored in plain text.</p>
                            <p><strong>Resume &amp; Interview Content:</strong> When you use our coaching tools, we process the content you provide — such as resume text, practice answers, and interview transcripts — so we can generate your feedback and reports.</p>
                            <p><strong>Usage Data:</strong> We automatically collect log data such as your IP address, browser type, and pages visited to improve platform performance and security.</p>
                            <p><strong>Google Sign-In (Optional):</strong> If you choose to sign in with Google, we receive basic profile information (your name and email) to create and secure your account. We never receive your Google password.</p>
                            <p><strong>Cookies:</strong> We use cookies to maintain your session and preference settings.</p>
                        </Section>

                        <Section index={1}>
                            <p>
                                CareerVivid uses Google's <strong>Gemini API</strong> to power its resume and interview coaching. When you request feedback, the relevant content you provide — such as resume text, practice answers, and interview transcripts — is sent to the Gemini API solely to generate your analysis and results.
                            </p>
                            <ul className="list-disc space-y-2 pl-5">
                                <li>We send <strong>only</strong> the content needed for the analysis you request.</li>
                                <li>We do <strong>NOT</strong> send your password or payment details to the AI provider.</li>
                                <li>Your account credentials and profile stay within CareerVivid and are <strong>not</strong> shared with the AI provider.</li>
                                <li>We do <strong>NOT</strong> sell your data or use it for third-party advertising.</li>
                            </ul>
                            <p>
                                Content sent for analysis is processed only to provide the Service and is handled in accordance with Google's API data policies.
                            </p>
                        </Section>

                        <Section index={2}>
                            <p>We use your data to:</p>
                            <ul className="list-disc space-y-2 pl-5">
                                <li>Provide and maintain the Service.</li>
                                <li>Generate AI-powered resume and interview feedback via Google's Gemini API.</li>
                                <li>Process payments (via Stripe - we do not store credit card numbers).</li>
                                <li>Send service notifications (e.g., billing, security alerts).</li>
                            </ul>
                            <p><strong>Data Sharing:</strong> We do NOT sell your personal data. We only share data with trusted processors necessary to operate the Service — Firebase for secure hosting and account storage, Google's Gemini API for AI analysis, and Stripe for payments.</p>
                        </Section>

                        <Section index={3}>
                            <p>Depending on your location (e.g., EU under GDPR, California under CCPA), you have rights to:</p>
                            <ul className="list-disc space-y-2 pl-5">
                                <li><strong>Access:</strong> Request a copy of your personal data.</li>
                                <li><strong>Correction:</strong> Update inaccurate information via your account settings.</li>
                                <li><strong>Deletion:</strong> Request permanent deletion of your account and data.</li>
                            </ul>
                            <p>
                                To exercise these rights, please contact us at{' '}
                                <a
                                    href="mailto:privacy@careervivid.app"
                                    className="font-semibold underline underline-offset-2 transition hover:opacity-70"
                                    style={{ color: 'var(--cvl-purple)' }}
                                >
                                    privacy@careervivid.app
                                </a>.
                            </p>
                        </Section>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
};

export default PrivacyPolicyPage;
