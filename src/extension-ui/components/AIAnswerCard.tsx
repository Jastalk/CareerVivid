import React from 'react';
import { ChevronDown, ChevronUp, CheckCheck, Copy } from 'lucide-react';

export interface AIAnswer {
    label: string;
    answer: string;
    confidence: 'high' | 'medium' | 'low';
    source: 'profile_field' | 'ai_generated' | 'skipped' | 'answer_library';
    reasoning?: string;
    injected?: boolean;
    copied?: boolean;
}

const CONFIDENCE_STYLES = {
    high:   'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-red-100 text-red-600',
};

export const AIAnswerCard: React.FC<{ answer: AIAnswer; onInject: () => void }> = ({ answer, onInject }) => {
    const [expanded, setExpanded] = React.useState(false);

    const isSkipped = answer.source === 'skipped' || !answer.answer;
    const isAI = answer.source === 'ai_generated';
    const isLibrary = answer.source === 'answer_library';

    return (
        <div className={`rounded-2xl border p-2.5 transition-all ${answer.injected ? 'border-green-200 bg-green-50' : 'border-[#ececf4] bg-white hover:border-[#d9d7fb]'}`}>
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-gray-500 truncate max-w-[140px]">
                            {answer.label}
                        </span>
                        {(isAI || isLibrary) && (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${CONFIDENCE_STYLES[answer.confidence]}`}>
                                {answer.confidence}
                            </span>
                        )}
                        {isLibrary && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                library
                            </span>
                        )}
                        {answer.source === 'profile_field' && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                profile
                            </span>
                        )}
                    </div>

                    {isSkipped ? (
                        <p className="text-[10px] text-gray-400 italic">No answer — fill manually</p>
                    ) : (
                        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                            {answer.answer}
                        </p>
                    )}

                    {isAI && answer.reasoning && (
                        <button
                            onClick={() => setExpanded(e => !e)}
                            className="flex items-center gap-0.5 text-[9px] text-gray-400 hover:text-gray-600 mt-0.5"
                        >
                            {expanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                            {expanded ? 'less' : 'why?'}
                        </button>
                    )}
                    {expanded && answer.reasoning && (
                        <p className="text-[9px] text-gray-400 italic mt-1 leading-relaxed">{answer.reasoning}</p>
                    )}
                </div>

                {!isSkipped && (
                    <button
                        onClick={onInject}
                        disabled={answer.injected}
                        className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-all ${
                            answer.injected
                                ? 'bg-green-100 text-green-600 cursor-default'
                                : 'bg-[#4a4392] text-white hover:bg-[#5851c8] active:scale-95'
                        }`}
                    >
                        {answer.injected ? <CheckCheck size={11} /> : <Copy size={11} />}
                        {answer.injected ? 'Done' : 'Fill'}
                    </button>
                )}
            </div>
        </div>
    );
};
