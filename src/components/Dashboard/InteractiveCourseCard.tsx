import React from 'react';
import { BookOpen, GraduationCap, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface CourseCardProps {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    stepsCount: number;
    progressPct: number;
    isLocked?: boolean;
    onClick?: () => void;
}

export const InteractiveCourseCard: React.FC<CourseCardProps> = ({
    id,
    title,
    description,
    difficulty,
    stepsCount,
    progressPct,
    isLocked = false,
    onClick,
}) => {
    return (
        <div
            onClick={!isLocked ? onClick : undefined}
            className={`flex flex-col bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border transition-all duration-300 overflow-hidden group relative h-full ${
                isLocked 
                    ? 'border-slate-200/50 dark:border-slate-800/50 opacity-75' 
                    : 'border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-400/40 shadow-sm hover:shadow-md hover:shadow-indigo-500/[0.03] cursor-pointer'
            }`}
        >
            {/* Gradient Top Visual or Thumbnail Preview */}
            <div className="relative w-full aspect-[16/9] overflow-hidden border-b border-slate-200/50 dark:border-slate-800/50">
                {/* Stunning Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 group-hover:scale-105 ${
                    isLocked 
                        ? 'from-slate-200/40 to-slate-300/40 dark:from-slate-800/40 dark:to-slate-900/40' 
                        : id === 'ai-agent-curriculum'
                            ? 'from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-pink-500/20'
                            : 'from-blue-500/10 via-cyan-500/10 to-teal-500/10 dark:from-blue-500/20 dark:via-cyan-500/20 dark:to-teal-500/20'
                }`} />

                {/* Card graphics */}
                <div className="absolute inset-0 flex items-center justify-center p-6">
                    {isLocked ? (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-sm">
                            <Lock size={24} />
                        </div>
                    ) : (
                        <div className="relative flex flex-col items-center">
                            {/* Animated circular progress or large icon */}
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-[var(--cv-action-primary)] shadow-sm border border-indigo-100/50 dark:border-indigo-900/50 transform group-hover:rotate-6 transition-transform duration-300">
                                <GraduationCap size={32} />
                            </div>
                            
                            {/* Radial circular indicator for progress if in progress */}
                            {!isLocked && progressPct > 0 && (
                                <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--cv-success-600)] text-white text-[10px] font-extrabold shadow-sm">
                                    {progressPct}%
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Difficulty and Step tags */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isLocked 
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' 
                            : 'bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)] border border-[var(--cv-action-border)]/20'
                    }`}>
                        {difficulty}
                    </span>
                    
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <BookOpen size={12} /> {stepsCount} steps
                    </span>
                </div>
            </div>

            {/* Content area */}
            <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-snug group-hover:text-[var(--cv-action-primary)] transition-colors">
                        {title}
                    </h3>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                        {description}
                    </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    {isLocked ? (
                        <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Coming Soon
                        </span>
                    ) : progressPct === 100 ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--cv-success-600)]">
                            <CheckCircle2 size={14} /> Completed
                        </span>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            {/* Progress bar inside the footer */}
                            {progressPct > 0 ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-[var(--cv-action-solid)]" style={{ width: `${progressPct}%` }} />
                                    </div>
                                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{progressPct}%</span>
                                </div>
                            ) : null}

                            <span className="text-xs font-extrabold text-[var(--cv-action-primary)] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-300 ml-auto">
                                {progressPct > 0 ? 'Continue' : 'Start course'} <ArrowRight size={14} />
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
