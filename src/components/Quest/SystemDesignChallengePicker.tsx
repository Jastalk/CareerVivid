import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { SystemDesignPattern } from '../../lib/companyQuests';

interface SystemDesignChallengePickerProps {
    /** The company's system-design prompt pool, in order. */
    pool: SystemDesignPattern[];
    /** Ids of prompts the user has already cleared for this company. */
    solvedIds: string[];
    onSelect: (challenge: SystemDesignPattern) => void;
    onClose: () => void;
}

const CATEGORY_TONE: Record<SystemDesignPattern['category'], string> = {
    'System Design': 'bg-[#eef0ff] text-[#4a4392] ring-[#dfe2ff] dark:bg-[#252244] dark:text-[#c9ccff] dark:ring-[#4a4392]/40',
    'Mobile System Design': 'bg-[#eef9f2] text-[#15803d] ring-[#cfe8d5] dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
};

const SystemDesignChallengePicker: React.FC<SystemDesignChallengePickerProps> = ({
    pool,
    solvedIds,
    onSelect,
    onClose,
}) => {
    const solved = new Set(solvedIds);

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
            <div
                role="menu"
                aria-label="Choose a system design challenge"
                className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#ececf4] bg-white shadow-[0_16px_40px_rgba(17,24,39,0.16)] dark:border-gray-700 dark:bg-gray-900"
            >
                <div className="border-b border-[#ececf4] px-3 py-2 dark:border-gray-800">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Choose a design prompt to improve
                    </p>
                </div>
                <ul className="max-h-80 overflow-y-auto p-1.5">
                    {pool.map((challenge) => {
                        const isSolved = solved.has(challenge.id);
                        return (
                            <li key={challenge.id}>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => onSelect(challenge)}
                                    className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#f7f7fc] dark:hover:bg-gray-800"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1.5">
                                            <span className="truncate text-[13px] font-bold text-gray-900 dark:text-gray-100">
                                                {challenge.title}
                                            </span>
                                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${CATEGORY_TONE[challenge.category]}`}>
                                                {challenge.category === 'Mobile System Design' ? 'mobile' : 'systems'}
                                            </span>
                                        </span>
                                        <span className="mt-0.5 block truncate text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                            {challenge.focus}
                                        </span>
                                    </span>
                                    {isSolved ? (
                                        <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-[#15803d] dark:text-emerald-400">
                                            <CheckCircle2 size={14} /> Cleared
                                        </span>
                                    ) : (
                                        <ChevronRight size={15} className="shrink-0 text-gray-300 transition-colors group-hover:text-[#4a4392] dark:text-gray-600" />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );
};

export default SystemDesignChallengePicker;
