import React from 'react';
import { FileText, Mic, Globe, Briefcase, MessageSquare, Plus } from 'lucide-react';
import { navigate } from '../../utils/navigation';
import '../Landing/live/liveLanding.css';

interface DashboardSummaryCardsProps {
    resumeCount: number;
    interviewCount: number;
    portfolioCount: number;
    jobCount: number; // Not strictly used for count display in design, but good to have
    communityPostCount?: number;
}

const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({
    resumeCount,
    interviewCount,
    portfolioCount,
    jobCount,
    communityPostCount = 0
}) => {
    const cards = [
        {
            title: 'resumes',
            file: 'resumes.md',
            count: resumeCount,
            icon: FileText,
            accent: 'var(--cvl-green)',
            soft: 'var(--cvl-green-soft)',
            link: '/newresume',
            isAction: false
        },
        {
            title: 'find jobs',
            file: 'jobs.md',
            count: null,
            icon: Briefcase,
            accent: 'var(--cvl-amber)',
            soft: 'var(--cvl-amber-soft)',
            link: '/jobs/recommend',
            isAction: true,
            actionText: 'Find jobs'
        },
        {
            title: 'interview rounds',
            file: 'rounds.log',
            count: interviewCount,
            icon: Mic,
            accent: 'var(--cvl-purple)',
            soft: 'var(--cvl-purple-soft)',
            link: '/interview-studio',
            isAction: false
        },
        {
            title: 'portfolios',
            file: 'portfolios.md',
            count: portfolioCount,
            icon: Globe,
            accent: 'var(--cvl-purple)',
            soft: 'var(--cvl-purple-soft)',
            link: '/portfolio',
            isAction: false
        },
        {
            title: 'jobs you are chasing',
            file: 'pipeline.md',
            count: jobCount > 0 ? jobCount : null,
            icon: Briefcase,
            accent: 'var(--cvl-green)',
            soft: 'var(--cvl-green-soft)',
            link: '/job-tracker',
            isAction: jobCount === 0,
            actionText: 'Track a job'
        },
        {
            title: 'community posts',
            file: 'posts.md',
            count: communityPostCount,
            icon: MessageSquare,
            accent: 'var(--cvl-amber)',
            soft: 'var(--cvl-amber-soft)',
            link: '/my-posts',
            isAction: false
        }
    ];

    return (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-5 xl:grid-cols-6">
            {cards.map((card, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => navigate(card.link)}
                    className="cvl-win cvl-win-lift group relative flex min-h-[128px] cursor-pointer flex-col text-left md:h-40"
                >
                    <div className="cvl-bar w-full">
                        <span className="cvl-dot cvl-dot-r" />
                        <span className="cvl-dot cvl-dot-y" />
                        <span className="cvl-dot cvl-dot-g" />
                        <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                            {card.file}
                        </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-4 md:p-5">
                    <div className="flex items-start gap-3">
                        <span
                            className="flex shrink-0 items-center justify-center rounded-xl p-2 md:p-2.5"
                            style={{ background: card.soft, color: card.accent }}
                        >
                            <card.icon className="h-4 w-4" />
                        </span>
                        <h3
                            className="cvl-mono text-left text-[11px] uppercase leading-tight tracking-[0.18em]"
                            style={{ color: 'var(--cvl-muted)' }}
                        >
                            {card.title}
                        </h3>
                    </div>

                    <div className="mt-auto flex items-end justify-between">
                        {card.isAction ? (
                            <span
                                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-bold"
                                style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                            >
                                {card.actionText}
                            </span>
                        ) : (
                            <span className="text-2xl font-bold leading-none tracking-tight md:text-3xl">
                                {card.count !== null ? card.count : 0}
                            </span>
                        )}
                        <span
                            className="flex h-7 w-7 -translate-x-1 items-center justify-center rounded-full opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                            style={{ background: 'var(--cvl-paper-2)', color: 'var(--cvl-purple)' }}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </span>
                    </div>
                    </div>
                </button>
            ))}
        </div>
    );
};

export default DashboardSummaryCards;
