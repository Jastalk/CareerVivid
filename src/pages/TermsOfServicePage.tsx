import React from 'react';
import { MenuBar, PublicFooter } from '../components/Landing/live/PublicShell';
import '../components/Landing/live/liveLanding.css';

/**
 * Terms of service. Same desk, same window chrome as the rest of the public
 * site — and one measured column, because this is a document people are
 * expected to actually read.
 *
 * The clauses below are verbatim. Only the container changed.
 */

interface TermsSection {
    id: string;
    file: string;
    title: string;
    items: { title: string; content: string }[];
}

const SECTIONS: TermsSection[] = [
    {
        id: 'account',
        file: 'account-terms.md',
        title: 'account terms',
        items: [
            {
                title: 'registration and security',
                content: 'By registering for CareerVivid, you agree to provide accurate and complete information. You are responsible for maintaining the security of your account credentials. You must immediately notify us of any unauthorized use of your account. We are not liable for any loss or damage arising from your failure to comply with this security obligation.'
            },
            {
                title: 'eligibility',
                content: 'You must be at least 16 years old to use this Service. By creating an account, you warrant that you meet this age requirement and have the legal capacity to enter into a binding contract.'
            }
        ]
    },
    {
        id: 'acceptable-use',
        file: 'acceptable-use.md',
        title: 'acceptable use',
        items: [
            {
                title: 'prohibited content',
                content: 'You strictly agree NOT to use CareerVivid (including Bio-Link pages) to post: illegal content, hate speech, malware, phishing links, sexually explicit material, or content that infringes on intellectual property rights. We reserve the right to remove such content and suspend accounts without notice.'
            },
            {
                title: 'Bio-Link commerce',
                content: 'If you use the "Store" feature, YOU are the Merchant of Record. CareerVivid is not a party to your transactions. You are solely responsible for product fulfillment, customer support, refunds, and tax obligations. You indemnify CareerVivid against any claims arising from your sales.'
            }
        ]
    },
    {
        id: 'payments',
        file: 'payments.md',
        title: 'payment and subscriptions',
        items: [
            {
                title: 'subscription terms',
                content: 'Subscriptions renew automatically at the end of each billing period unless canceled. You authorize us to charge your payment method for the renewal term.'
            },
            {
                title: 'cancellation and refunds',
                content: 'You may cancel your "Bio-Link Pro" or other subscriptions at ANY TIME via your dashboard. You will retain access until the end of your complete billing cycle. We offer a 7-day money-back guarantee for initial purchases only. Refunds are not available for renewal charges or one-time digital downloads once used.'
            }
        ]
    },
    {
        id: 'ip',
        file: 'intellectual-property.md',
        title: 'intellectual property',
        items: [
            {
                title: 'your content',
                content: 'You retain full ownership of the resumes, portfolios, and data you upload. You grant CareerVivid a limited license to host and display this content solely for providing the Service to you.'
            },
            {
                title: 'platform rights',
                content: 'CareerVivid owns all rights to the platform code, design, logos, and trademarks. You may not copy, modify, or reverse engineer any part of the Service.'
            }
        ]
    },
    {
        id: 'ai',
        file: 'ai-services.md',
        title: 'AI services',
        items: [
            {
                title: 'AI-generated feedback',
                content: 'CareerVivid uses a third-party AI provider (Google’s Gemini API) to analyze the content you submit — such as resume text, practice answers, and interview transcripts — and generate coaching feedback. This feedback is provided for guidance only, may contain errors or omissions, and is not professional career, legal, or hiring advice. You are responsible for reviewing and verifying any AI-generated output before relying on it.'
            },
            {
                title: 'content you submit for analysis',
                content: 'When you request an analysis, the relevant content you provide is sent to the AI provider solely to produce your results. We do not sell this content or use it for advertising, and your account credentials (email, username, and password) are never shared with the AI provider. You retain ownership of the content you submit.'
            }
        ]
    },
    {
        id: 'liability',
        file: 'liability.md',
        title: 'liability and disclaimers',
        items: [
            {
                title: 'disclaimer of warranties',
                content: 'The Service is provided "AS IS" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or completely secure.'
            },
            {
                title: 'limitation of liability',
                content: 'To the maximum extent permitted by law, CareerVivid shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use or inability to use the Service.'
            }
        ]
    },
    {
        id: 'legal-contact',
        file: 'legal-contact.md',
        title: 'legal contact',
        items: [
            {
                title: 'formal notices',
                content: 'For any formal legal notices, subpoenas, or intellectual property disputes, please contact our legal department directly at: legal@careervivid.app. General support inquiries sent to this address will not receive a response.'
            }
        ]
    }
];

const TermsOfServicePage: React.FC = () => {
    return (
        <div className="cvl min-h-screen">
            <MenuBar />

            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
                <header className="max-w-3xl">
                    <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                        legal
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Terms of Service</h1>
                    <p className="cvl-mono mt-4 text-[12px]" style={{ color: 'var(--cvl-faint)' }}>
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
                            <nav
                                className="mt-3 flex flex-col gap-2.5 border-l pl-3 text-[13px] leading-snug"
                                style={{ borderColor: 'var(--cvl-line)' }}
                            >
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
                        {SECTIONS.map((section, index) => (
                            <section key={section.id} id={section.id} className="cvl-win scroll-mt-16">
                                <div className="cvl-bar">
                                    <span className="cvl-dot cvl-dot-r" />
                                    <span className="cvl-dot cvl-dot-y" />
                                    <span className="cvl-dot cvl-dot-g" />
                                    <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                                        {section.file}
                                    </span>
                                </div>
                                <div className="p-5 sm:p-7">
                                    <p
                                        className="cvl-mono text-[11px] uppercase tracking-[0.18em]"
                                        style={{ color: 'var(--cvl-faint)' }}
                                    >
                                        section {String(index + 1).padStart(2, '0')}
                                    </p>
                                    <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{section.title}</h2>

                                    <div className="mt-5 space-y-5">
                                        {section.items.map((item, itemIdx) => (
                                            <div
                                                key={item.title}
                                                className={itemIdx > 0 ? 'border-t pt-5' : undefined}
                                                style={itemIdx > 0 ? { borderColor: 'var(--cvl-line)' } : undefined}
                                            >
                                                <h3 className="text-[15px] font-semibold">{item.title}</h3>
                                                <p className="mt-2 text-[15px] leading-[1.75]">{item.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
};

export default TermsOfServicePage;
