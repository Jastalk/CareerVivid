import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { CodingChallenge } from '../../lib/codingChallenges';

interface CodingChallengePickerProps {
    /** The company's coding pool, in order. */
    pool: CodingChallenge[];
    /** Ids of problems the user has already solved for this company. */
    solvedIds: string[];
    onSelect: (challenge: CodingChallenge) => void;
    onClose: () => void;
}

const DIFFICULTY_TONE: Record<CodingChallenge['difficulty'], string> = {
    easy: 'bg-[#eef9f2] text-[#15803d] ring-[#cfe8d5] dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
    medium: 'bg-[#fffbeb] text-[#b45309] ring-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
    hard: 'bg-[#fff1f2] text-[#be123c] ring-[#fecdd3] dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60',
};

/**
 * Dropdown that lets the user pick which problem from the company's coding
 * pool they want to attempt or improve, showing difficulty and solved status.
 */
const CodingChallengePicker: React.FC<CodingChallengePickerProps> = ({ pool, solvedIds, onSelect, onClose }) => {
    const solved = new Set(solvedIds);

    return (
        <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
            <div
                role="menu"
                aria-label="Choose a coding problem"
                className="absolute right-0 top-full z-50 mt-2 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#ececf4] bg-white shadow-[0_16px_40px_rgba(17,24,39,0.16)] dark:border-gray-700 dark:bg-gray-900"
            >
                <div className="border-b border-[#ececf4] px-3 py-2 dark:border-gray-800">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Choose a problem to improve
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
                                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${DIFFICULTY_TONE[challenge.difficulty]}`}>
                                                {challenge.difficulty}
                                            </span>
                                        </span>
                                        <span className="mt-0.5 block truncate text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                            {challenge.topics.slice(0, 3).join(' · ')}
                                        </span>
                                    </span>
                                    {isSolved ? (
                                        <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-[#15803d] dark:text-emerald-400">
                                            <CheckCircle2 size={14} /> Solved
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

export default CodingChallengePicker;
