import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MenuBar, PublicFooter } from '../components/Landing/live/PublicShell';
import '../components/Landing/live/liveLanding.css';
import { Send, Loader2, CheckCircle, CreditCard, Activity, ChevronDown, AlertTriangle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import LanguageSelect from '../components/LanguageSelect';

/**
 * Support and contact, on the same desk as the rest of the public site.
 *
 * The form's handler, fields and translation keys are untouched — only the
 * surface changed. The FAQ below is the same `faq.*` copy the shared component
 * renders, laid out as <details> rows so it reads as part of this desk rather
 * than a slab of another design.
 */

/** The three ways to reach a human, before the form. */
const CHANNELS = [
    {
        href: 'mailto:support@careervivid.app',
        icon: Send,
        title: 'general support',
        address: 'support@careervivid.app',
        file: 'support.eml',
    },
    {
        href: 'mailto:billing@careervivid.app',
        icon: CreditCard,
        title: 'billing and subscriptions',
        address: 'billing@careervivid.app',
        file: 'billing.eml',
    },
    {
        href: 'mailto:partners@careervivid.app',
        icon: Activity,
        title: 'partnerships and media',
        address: 'partners@careervivid.app',
        file: 'partners.eml',
    },
];

const FAQ_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const inputStyle: React.CSSProperties = {
    background: 'var(--cvl-paper-2)',
    borderColor: 'var(--cvl-line)',
    color: 'var(--cvl-ink)',
};

const ContactPage: React.FC = () => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !subject || !message) {
            setError("Please fill in all fields.");
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await addDoc(collection(db, 'contact_messages'), {
                name,
                email,
                subject,
                message,
                status: 'unread',
                timestamp: serverTimestamp(),
            });
            setSuccess(t('contact.success_message'));
            setName('');
            setEmail('');
            setSubject('');
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            setError(t('contact.error_send_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="cvl min-h-screen">
            <MenuBar />

            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                            support
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">support and contact</h1>
                        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                            {t('contact.subtitle')}
                        </p>
                    </div>
                    {/* Every heading, label, placeholder and answer below comes from
                        t(). MenuBar has no language control, so without this one the
                        translations on this page are unreachable. */}
                    <LanguageSelect />
                </header>

                {/* Direct Email Channels */}
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {CHANNELS.map((channel) => {
                        const Icon = channel.icon;
                        return (
                            <a key={channel.href} href={channel.href} className="cvl-win cvl-win-lift block">
                                <div className="cvl-bar">
                                    <span className="cvl-dot cvl-dot-r" />
                                    <span className="cvl-dot cvl-dot-y" />
                                    <span className="cvl-dot cvl-dot-g" />
                                    <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                                        {channel.file}
                                    </span>
                                </div>
                                <div className="p-5">
                                    <span
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                                        style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                                    >
                                        <Icon size={17} />
                                    </span>
                                    <h2 className="mt-3 text-[15px] font-semibold">{channel.title}</h2>
                                    <p className="cvl-mono mt-1 text-[12px]" style={{ color: 'var(--cvl-muted)' }}>
                                        {channel.address}
                                    </p>
                                </div>
                            </a>
                        );
                    })}
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    {/* FAQ */}
                    <div className="cvl-win self-start">
                        <div className="cvl-bar">
                            <span className="cvl-dot cvl-dot-r" />
                            <span className="cvl-dot cvl-dot-y" />
                            <span className="cvl-dot cvl-dot-g" />
                            <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                                common-questions.md
                            </span>
                        </div>
                        <div className="p-5 sm:p-7">
                            <p
                                className="cvl-mono text-[11px] uppercase tracking-[0.18em]"
                                style={{ color: 'var(--cvl-faint)' }}
                            >
                                answers first
                            </p>
                            <h2 className="mt-2 text-xl font-semibold tracking-tight">{t('contact.faq_title')}</h2>
                            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                {t('faq.subtitle')}
                            </p>
                            <div className="mt-3">
                                {FAQ_KEYS.map((key) => (
                                    <details
                                        key={key}
                                        className="group border-b last:border-b-0"
                                        style={{ borderColor: 'var(--cvl-line)' }}
                                    >
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                                            {t(`faq.q${key}`)}
                                            <ChevronDown
                                                size={16}
                                                className="shrink-0 transition group-open:rotate-180"
                                                style={{ color: 'var(--cvl-faint)' }}
                                            />
                                        </summary>
                                        <p
                                            className="pb-5 pr-6 text-[15px] leading-[1.75]"
                                            style={{ color: 'var(--cvl-muted)' }}
                                        >
                                            {t(`faq.a${key}`)}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="cvl-win self-start">
                        <div className="cvl-bar">
                            <span className="cvl-dot cvl-dot-r" />
                            <span className="cvl-dot cvl-dot-y" />
                            <span className="cvl-dot cvl-dot-g" />
                            <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                                new-message.txt
                            </span>
                        </div>
                        <div className="p-5 sm:p-7">
                            <p
                                className="cvl-mono text-[11px] uppercase tracking-[0.18em]"
                                style={{ color: 'var(--cvl-faint)' }}
                            >
                                still stuck
                            </p>
                            <h2 className="mt-2 text-xl font-semibold tracking-tight">{t('contact.form_title')}</h2>
                            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                {t('contact.form_subtitle')}
                            </p>

                            {success && (
                                <div
                                    className="mt-5 flex items-start gap-3 rounded-xl border p-4"
                                    style={{
                                        background: 'var(--cvl-green-soft)',
                                        borderColor: 'var(--cvl-line)',
                                        color: 'var(--cvl-green)',
                                    }}
                                >
                                    <CheckCircle size={18} className="mt-[2px] shrink-0" />
                                    <div>
                                        <p className="text-[14px] font-semibold">{t('contact.success_title')}</p>
                                        <p className="mt-0.5 text-[13.5px] leading-relaxed">{success}</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="cvl-mono mb-1.5 block text-[11px] uppercase tracking-[0.14em]"
                                        style={{ color: 'var(--cvl-faint)' }}
                                    >
                                        {t('contact.label_name')}
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-lg border px-4 py-3 text-[15px] transition"
                                        style={inputStyle}
                                        placeholder={t('contact.placeholder_name')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="cvl-mono mb-1.5 block text-[11px] uppercase tracking-[0.14em]"
                                        style={{ color: 'var(--cvl-faint)' }}
                                    >
                                        {t('contact.label_email')}
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-lg border px-4 py-3 text-[15px] transition"
                                        style={inputStyle}
                                        placeholder={t('contact.placeholder_email')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="subject"
                                        className="cvl-mono mb-1.5 block text-[11px] uppercase tracking-[0.14em]"
                                        style={{ color: 'var(--cvl-faint)' }}
                                    >
                                        {t('contact.label_subject')}
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full rounded-lg border px-4 py-3 text-[15px] transition"
                                        style={inputStyle}
                                        placeholder={t('contact.placeholder_subject')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="message"
                                        className="cvl-mono mb-1.5 block text-[11px] uppercase tracking-[0.14em]"
                                        style={{ color: 'var(--cvl-faint)' }}
                                    >
                                        {t('contact.label_message')}
                                    </label>
                                    <textarea
                                        id="message"
                                        rows={5}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full resize-none rounded-lg border px-4 py-3 text-[15px] leading-relaxed transition"
                                        style={inputStyle}
                                        placeholder={t('contact.placeholder_message')}
                                        required
                                    ></textarea>
                                </div>
                                {error && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-3 rounded-xl border p-4"
                                        style={{
                                            background: 'var(--cvl-amber-soft)',
                                            borderColor: 'var(--cvl-amber)',
                                            color: 'var(--cvl-ink)',
                                        }}
                                    >
                                        <AlertTriangle size={18} className="mt-[2px] shrink-0" style={{ color: 'var(--cvl-amber)' }} />
                                        <p className="text-[13.5px] font-medium leading-relaxed">{error}</p>
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="cvl-cta flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
                                    {isSubmitting ? t('common.loading') : t('contact.button_send')}
                                </button>
                            </form>

                            {success && (
                                <div className="mt-5 text-center">
                                    <button
                                        onClick={() => setSuccess(null)}
                                        className="text-[14px] font-semibold underline underline-offset-2 transition hover:opacity-70"
                                        style={{ color: 'var(--cvl-purple)' }}
                                    >
                                        {t('contact.send_another_message')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
};

export default ContactPage;
