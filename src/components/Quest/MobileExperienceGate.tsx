import React from 'react';
import { MonitorSmartphone, ArrowRight } from 'lucide-react';

interface MobileExperienceGateProps {
    /** Which round this gate is protecting — tunes the copy. */
    roundType: 'coding' | 'system-design';
    /** Proceed and view the round on mobile anyway. */
    onContinue: () => void;
    /** Optional: back out of the round entirely. */
    onBack?: () => void;
}

const ROUND_COPY: Record<MobileExperienceGateProps['roundType'], { label: string; detail: string }> = {
    coding: {
        label: 'Coding round',
        detail: 'Coding rounds use a full code editor and test runner',
    },
    'system-design': {
        label: 'System design round',
        detail: 'System design rounds involve drawing an architecture diagram',
    },
};

/**
 * Shown on phones before a coding / system-design round opens. It recommends a
 * desktop or laptop for the best experience, and lets the user continue on
 * mobile if they prefer.
 */
const MobileExperienceGate: React.FC<MobileExperienceGateProps> = ({ roundType, onContinue, onBack }) => {
    const copy = ROUND_COPY[roundType];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#171411]/70 p-5 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(17,24,39,0.28)] dark:border-gray-700 dark:bg-gray-900 sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f2ff] text-[#625bd5] dark:bg-[#312d6b]/60 dark:text-[#b8b4ff]">
                    <MonitorSmartphone size={26} />
                </span>

                <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-[#625bd5] dark:text-[#9b96ef]">
                    {copy.label}
                </p>
                <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                    Better on a bigger screen
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {copy.detail} — you&rsquo;ll have a much better experience on a desktop or laptop.
                </p>

                <button
                    type="button"
                    onClick={onContinue}
                    className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#625bd5] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#514ac5] dark:bg-[#7069dc] dark:hover:bg-[#8d88e6]"
                >
                    Continue on mobile
                    <ArrowRight size={16} />
                </button>

                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        Go back
                    </button>
                )}
            </div>
        </div>
    );
};

export default MobileExperienceGate;
