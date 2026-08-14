import React from 'react';
import { ArrowRight, Gift, Percent, Sparkles } from 'lucide-react';

interface RetentionModalProps {
    isOpen: boolean;
    step: 'offer_10' | 'offer_20';
    onAccept: () => void;
    onDecline: () => void;
    isLoading?: boolean;
}

const RetentionModal: React.FC<RetentionModalProps> = ({ isOpen, step, onAccept, onDecline, isLoading = false }) => {
    if (!isOpen) return null;

    const isFirstOffer = step === 'offer_10';
    const content = isFirstOffer
        ? {
            eyebrow: 'Before you cancel',
            title: 'Keep your plan with 10% off.',
            body: 'You keep your current AI-credit capacity, saved workflows, and paid tools while we reduce the next three billing cycles.',
            badge: '10% off for 3 months',
            accept: 'Apply 10% discount',
            decline: 'No thanks, continue',
            icon: Percent,
            tone: 'text-[#4a4392] bg-[#eef0ff]',
        }
        : {
            eyebrow: 'Final retention offer',
            title: 'Take 20% off instead.',
            body: 'This is the strongest discount available before you move back to Free. Your account stays active and your cancellation request stops.',
            badge: '20% off for 3 months',
            accept: 'Apply 20% discount',
            decline: 'Continue to cancellation reason',
            icon: Gift,
            tone: 'text-[#9a651f] bg-[#fff4cc]',
        };

    const Icon = content.icon;

    return (
        <div className="fixed inset-0 z-50 flex min-w-[320px] items-center justify-center px-4 py-6">
            <div className="absolute inset-0 bg-[#211b16]/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#e4d3bc] bg-white shadow-2xl dark:border-[#37332d] dark:bg-[#1f1f1d]">
                <div className="border-b border-[#eee3d2] bg-[#fffaf1] p-6 dark:border-[#37332d] dark:bg-[#262522]">
                    <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${content.tone} dark:bg-[#302e2a]`}>
                            <Icon size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a97935] dark:text-[#caa26c]">
                                {content.eyebrow}
                            </p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">
                                {content.title}
                            </h2>
                            <p className="mt-3 text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                {content.body}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="rounded-2xl border border-[#e9e1d6] bg-[#fffaf1] p-4 dark:border-[#37332d] dark:bg-[#262522]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#4a4392] shadow-sm dark:bg-[#1f1f1d] dark:text-[#8d88e6]">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7d6e5e] dark:text-[#aaa39a]">
                                        Retention discount
                                    </p>
                                    <p className="mt-1 text-sm font-black text-[#211b16] dark:text-[#f4f1e9]">{content.badge}</p>
                                </div>
                            </div>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                                No plan reset
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        <button
                            type="button"
                            onClick={onAccept}
                            disabled={isLoading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#211b16] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#3a2b20] disabled:cursor-wait disabled:opacity-70 dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]"
                        >
                            {isLoading ? 'Applying...' : content.accept}
                            {!isLoading && <ArrowRight size={16} />}
                        </button>

                        <button
                            type="button"
                            onClick={onDecline}
                            disabled={isLoading}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-[#d8c6ad] bg-white px-4 py-3 text-sm font-black text-[#211b16] transition hover:bg-[#fffaf1] disabled:opacity-60 dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]"
                        >
                            {content.decline}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetentionModal;
