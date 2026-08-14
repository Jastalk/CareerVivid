import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Footer from '../components/Footer';
import { MenuBar } from '../components/Landing/live/PublicShell';
import '../components/Landing/live/liveLanding.css';

/**
 * Refunds, terms, privacy and Bio-Link — the four policy documents, on the same
 * desk as the rest of the public site.
 *
 * Every answer is verbatim. What changed is the reading experience: one column,
 * a contents rail that follows you down long documents, and native <details>
 * rows so a long answer can no longer be clipped by a fixed max-height.
 */

interface PolicySection {
    title: string;
    slug: string;
    file: string;
    items: { question: string; answer: string }[];
}

const POLICY_SECTIONS: PolicySection[] = [
    {
        title: 'Refund Policy',
        slug: 'refund',
        file: 'refund-policy.md',
        items: [
            {
                question: 'What is your refund policy?',
                answer: 'We offer a 7-day money-back guarantee for all subscription plans (Monthly and Sprint). If you are not satisfied with your purchase, contact us within 7 days of your initial purchase for a full refund. Refunds are not available for one-time PDF download purchases once the download has been used.'
            },
            {
                question: 'How do I request a refund?',
                answer: 'To request a refund, email us at support@careervivid.app with your account email and order details. Include your reason for the refund request (optional but helpful for us to improve). We will process approved refunds within 5-10 business days to your original payment method.'
            },
            {
                question: 'Are there any refund exceptions?',
                answer: 'Refunds are not available after the 7-day window has passed, for renewed subscriptions (only initial purchases qualify), or if your account has been terminated for violating our Terms of Service. One-time PDF download credits cannot be refunded once they have been used to generate a PDF.'
            },
            {
                question: 'What happens to my data after a refund?',
                answer: 'After a refund is processed, your account will be downgraded to the Free plan. Your resumes and data will be preserved, but you will be subject to Free plan limitations (2 resumes max, 100 AI credits per month). You can continue to access and export your data at any time.'
            },
            {
                question: 'Can I get a partial refund for monthly subscriptions?',
                answer: 'We do not offer prorated refunds for monthly subscriptions. If you cancel your monthly subscription, you will retain access to Pro features until the end of your current billing period, and you will not be charged again. No refund will be issued for the remaining days in your billing cycle unless you are within the 7-day money-back guarantee window from your initial purchase.'
            },
            {
                question: 'What about academic or business partner pricing?',
                answer: 'Academic partners and business partners may have custom pricing agreements with different refund terms. Please refer to your partnership agreement or contact your partnership manager for specific refund policies applicable to your account.'
            }
        ]
    },
    {
        title: 'Terms of Service',
        slug: 'terms',
        file: 'terms-of-service.md',
        items: [
            {
                question: 'Who can use CareerVivid?',
                answer: 'CareerVivid is available to users who are at least 16 years old. By using our service, you represent that you meet this age requirement and have the legal capacity to enter into a binding agreement. If you are using the service on behalf of an organization, you represent that you have the authority to bind that organization.'
            },
            {
                question: 'What is our acceptable use policy?',
                answer: 'You agree not to use CareerVivid to create false or misleading resumes, violate any laws or regulations, infringe on intellectual property rights, transmit malicious code, or attempt to gain unauthorized access to our systems. You are responsible for maintaining the confidentiality of your account credentials.'
            },
            {
                question: 'Who owns the content you create?',
                answer: 'You retain all rights to the content you create using CareerVivid, including your resumes and portfolio. By using our service, you grant us a limited license to host, store, and display your content solely for the purpose of providing our services to you. We will never use your resume content for any other purpose without your explicit consent.'
            },
            {
                question: 'What are the subscription terms?',
                answer: 'Subscriptions automatically renew at the end of each billing period unless canceled. You can cancel your subscription at any time through your account settings. If you cancel, you will retain access to Pro features until the end of your current billing period. One-time purchases (Sprint plan, PDF downloads) do not auto-renew.'
            },
            {
                question: 'Can we modify the service or terms?',
                answer: 'We reserve the right to modify or discontinue the service at any time, with or without notice. We may also update these Terms of Service from time to time. If we make material changes, we will notify you by email or through a notice on our website. Your continued use of the service after such changes constitutes acceptance of the new terms.'
            },
            {
                question: 'What is our liability disclaimer?',
                answer: 'CareerVivid is provided "as is" without warranties of any kind. We do not guarantee that our service will be uninterrupted, secure, or error-free. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the service.'
            }
        ]
    },
    {
        title: 'Privacy Policy',
        slug: 'privacy',
        file: 'privacy-policy.md',
        items: [
            {
                question: 'What information do we collect?',
                answer: 'We collect information you provide directly to us, including your name, email address, resume data, and any other information you choose to provide. We also automatically collect certain information about your device when you use our service, including IP address, browser type, and usage data.'
            },
            {
                question: 'How do we use your information?',
                answer: 'We treat your data with the utmost respect and use it primarily to deliver the CareerVivid experience. We analyze system usage and technical logs solely for the purpose of identifying bugs, resolving technical errors, and improving product stability. We do not use your personal data for any purpose other than providing and enhancing our service for you.'
            },
            {
                question: 'How do we protect your information?',
                answer: 'We implement appropriate technical and organizational security measures to protect your personal information. All data is encrypted in transit using SSL/TLS, and we use industry-standard encryption for data at rest. We regularly review and update our security practices.'
            },
            {
                question: 'Do we sell or share your information?',
                answer: 'No. **We strictly do not sell, trade, or rent your personal information to third-party companies.** Your data belongs exclusively to you. We strictly limit data sharing to essential service providers (like payment processors) or instances where you explicitly choose to publish or share your own content (such as sending a resume link). We only facilitate the sharing that you request.'
            },
            {
                question: 'What are your data rights?',
                answer: 'You have the right to access, update, or delete your personal information at any time through your account settings. You can also request a copy of your data or request that we delete your account and all associated data. Contact us at support@careervivid.app for data-related requests.'
            },
            {
                question: 'Do we use cookies?',
                answer: 'Yes, we use cookies and similar tracking technologies to track activity on our service and hold certain information. Cookies help us improve your experience, understand how you use our service, and deliver personalized content. You can control cookies through your browser settings.'
            }
        ]
    },
    {
        title: 'Bio-Link & Creators',
        slug: 'bio-link',
        file: 'bio-link.md',
        items: [
            {
                question: 'What content is allowed on my Bio-Link page?',
                answer: 'Your Bio-Link page is a space for your personal brand. However, you strictly agree NOT to post: illegal content, hate speech, malware/phishing links, sexually explicit material, or content that infringes on others\' intellectual property. We reserve the right to suspend any account violating these guidelines without notice.'
            },
            {
                question: 'Who is responsible for items sold via Bio-Link Store?',
                answer: 'If you use the "Commerce" or "Store" features to sell digital or physical goods, YOU are the merchant of record. CareerVivid provides the platform but is not a party to the transaction. You are responsible for product fulfillment, customer support, refunds, and tax obligations associated with your sales. We are not liable for disputes between you and your customers.'
            },
            {
                question: 'How do you track analytics for my Bio-Link?',
                answer: 'We collect aggregated engagement data (page views, link clicks, device type) to provide you with the "Analytics Dashboard". This data is collected to help you grow your audience. We do not sell this visitor data to third-party advertisers. Visitor privacy is respected in accordance with our general Privacy Policy.'
            },
            {
                question: 'Can I remove the "Powered by CareerVivid" branding?',
                answer: 'Yes, users on the "Bio-Link Pro" or "All-Access" plans have the option to remove the footer branding from their public Bio-Link pages. Free plan users must retain the branding link.'
            },
            {
                question: 'Are there limits on traffic or links?',
                answer: 'We want you to grow! We currently do not enforce hard limits on traffic or the number of links for fair usage. However, we reserve the right to limit access to accounts with abnormal traffic patterns (e.g., bot attacks, DDoS originators) that threaten the stability of our platform for other users.'
            },
            {
                question: 'Can I cancel my subscription anytime?',
                answer: 'Absolutely. We believe in creative freedom, not contracts. You can cancel your Bio-Link Pro subscription at any time with a single click in your dashboard. You will retain access to Pro features until the end of your billing cycle, after which your account will revert to the Free plan. No questions asked.'
            },
            {
                question: 'How does the TikTok integration work with my data?',
                answer: 'Our TikTok integration uses the official TikTok API to display your public stats (followers, views, likes) on your Bio-Link page. This connection is READ-ONLY. We do NOT have access to your password, direct messages, or private settings. We simply fetch your public metrics to showcase them on your profile.'
            }
        ]
    }
];

/**
 * The Bio-Link section is the newest of the four, and the pre-change page said so
 * with a pinging dot on its jump link. Same signal, on the token palette — the
 * .cvl stylesheet already stills the ping under prefers-reduced-motion.
 */
const NewDot: React.FC = () => (
    <span className="relative ml-1.5 inline-flex h-2 w-2 shrink-0" aria-hidden="true">
        <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: 'var(--cvl-purple)' }}
        />
        <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: 'var(--cvl-purple)' }}
        />
    </span>
);

/** One question. Native <details> so a long answer is never clipped. */
const PolicyItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
    <details className="group border-b last:border-b-0" style={{ borderColor: 'var(--cvl-line)' }}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
            {question}
            <ChevronDown
                size={16}
                className="shrink-0 transition group-open:rotate-180"
                style={{ color: 'var(--cvl-faint)' }}
            />
        </summary>
        <p className="pb-5 pr-6 text-[15px] leading-[1.75]" style={{ color: 'var(--cvl-muted)' }}>
            {answer}
        </p>
    </details>
);

const PolicyPage: React.FC = () => {
    const [activeSlug, setActiveSlug] = useState<string | null>(null);

    // Auto-scroll to section based on hash
    React.useEffect(() => {
        if (window.location.hash) {
            const id = window.location.hash.substring(1);
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                    // Provide visual feedback
                    setActiveSlug(id);
                    setTimeout(() => setActiveSlug(null), 2000);
                }
            }, 500); // Small delay to ensure render
        }
    }, []);

    return (
        <div className="cvl min-h-screen">
            <MenuBar />

            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
                <header className="max-w-3xl">
                    <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                        legal
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">legal and policies</h1>
                    <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                        Refunds, terms, privacy, and the Bio-Link rules — the four documents in full,
                        answer by answer.
                    </p>
                    <p className="cvl-mono mt-3 text-[12px]" style={{ color: 'var(--cvl-faint)' }}>
                        Last updated: December 16, 2025
                    </p>

                    {/* Quick navigation — the contents rail is desktop-only, so small
                        screens keep their own jump links. */}
                    <nav className="mt-6 flex flex-wrap gap-2 lg:hidden">
                        {POLICY_SECTIONS.map((section) => (
                            <a
                                key={section.slug}
                                href={`#${section.slug}`}
                                className="rounded-full border px-3.5 py-1.5 text-[13px] transition hover:opacity-70"
                                style={{
                                    borderColor: 'var(--cvl-line)',
                                    background: 'var(--cvl-paper)',
                                    color: 'var(--cvl-muted)',
                                }}
                            >
                                {section.title}
                                {section.slug === 'bio-link' && (
                                    <>
                                        <NewDot />
                                        <span className="sr-only"> (new)</span>
                                    </>
                                )}
                            </a>
                        ))}
                    </nav>
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
                                {POLICY_SECTIONS.map((section) => (
                                    <a
                                        key={section.slug}
                                        href={`#${section.slug}`}
                                        className="inline-flex items-center transition hover:opacity-70"
                                        style={{ color: 'var(--cvl-muted)' }}
                                    >
                                        {section.title}
                                        {section.slug === 'bio-link' && (
                                            <>
                                                <NewDot />
                                                <span className="sr-only"> (new)</span>
                                            </>
                                        )}
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    <div className="max-w-3xl space-y-6">
                        {POLICY_SECTIONS.map((section, sectionIdx) => (
                            <section
                                key={section.slug}
                                id={section.slug}
                                className="cvl-win scroll-mt-16"
                                style={activeSlug === section.slug
                                    ? { borderColor: 'var(--cvl-purple)', boxShadow: '0 0 0 3px var(--cvl-purple-soft)' }
                                    : undefined}
                            >
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
                                        section {String(sectionIdx + 1).padStart(2, '0')}
                                    </p>
                                    <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{section.title}</h2>
                                    <div className="mt-3">
                                        {section.items.map((item) => (
                                            <PolicyItem key={item.question} question={item.question} answer={item.answer} />
                                        ))}
                                    </div>
                                </div>
                            </section>
                        ))}

                        {/* Contact */}
                        <div className="cvl-win">
                            <div className="cvl-bar">
                                <span className="cvl-dot cvl-dot-r" />
                                <span className="cvl-dot cvl-dot-y" />
                                <span className="cvl-dot cvl-dot-g" />
                                <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                                    have-questions.txt
                                </span>
                            </div>
                            <div className="p-5 sm:p-7">
                                <h2 className="text-xl font-semibold tracking-tight">have questions?</h2>
                                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                    If you have any questions about our policies or need clarification, we're here to help.
                                </p>
                                <a
                                    href="/contact"
                                    className="cvl-cta mt-5 inline-flex items-center justify-center rounded-xl px-5 py-3 text-[14px] font-semibold transition hover:opacity-90"
                                >
                                    Contact support
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PolicyPage;
