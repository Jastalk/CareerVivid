import React from 'react';
import { useResumes } from '../../hooks/useResumes';
import { usePortfolios } from '../../hooks/usePortfolios';
import { useWhiteboards } from '../../hooks/useWhiteboards';
import { usePracticeHistory } from '../../hooks/useJobHistory';
import { useJobTracker } from '../../hooks/useJobTracker';
import { useMyCommunityPosts } from '../../hooks/useMyCommunityPosts';
import { ResumeData, PracticeHistoryEntry, JobApplicationData, WhiteboardData } from '../../types';
import { PortfolioData } from '../../features/portfolio/types/portfolio';
import { useTranslation } from 'react-i18next';
import { navigate } from '../../utils/navigation';
import DashboardPreviewSection, { DraggableSectionHeader } from './DashboardPreviewSection';
import DashboardSummaryCards from './DashboardSummaryCards';
import ResumeCard from './ResumeCard';
import PortfolioCard from '../PortfolioCard';
import InterviewHistoryCard from './InterviewHistoryCard';
import WhiteboardCard from './WhiteboardCard';
import {
    MobileInterviewHistoryCard,
    MobilePortfolioCard,
    MobileResumeCard,
    MobileWhiteboardCard
} from './DashboardMobileCards';
import StatusOverview from '../JobTracker/StatusOverview';
import KanbanBoard from '../JobTracker/KanbanBoard';
import '../Landing/live/liveLanding.css';

export const WorkspaceSummaryCards: React.FC = () => {
    const { resumes } = useResumes();
    const { portfolios } = usePortfolios();
    const { practiceHistory } = usePracticeHistory();
    const { jobApplications } = useJobTracker();
    const { posts } = useMyCommunityPosts();

    return (
        <DashboardSummaryCards
            resumeCount={resumes.length}
            interviewCount={practiceHistory.length}
            portfolioCount={portfolios.length}
            jobCount={jobApplications.length}
            communityPostCount={posts.length}
        />
    );
};

interface SectionProps {
    viewMode: 'row' | 'grid';
    sectionName: string;
    onLongPress: () => void;
    onTitleChange: (name: string) => void;
}

export const ResumesSection: React.FC<SectionProps & { setShareModalResume: (r: ResumeData) => void }> = ({ 
    viewMode, sectionName, onLongPress, onTitleChange, setShareModalResume 
}) => {
    const { resumes, deleteResume, duplicateResume, updateResume } = useResumes();
    const { t } = useTranslation();
    
    return (
        <DashboardPreviewSection
            title={sectionName}
            items={resumes}
            viewMode={viewMode}
            onLongPress={onLongPress}
            onViewAll={() => navigate('/newresume')}
            onTitleChange={onTitleChange}
            emptyMessage={t('dashboard.no_resumes', 'No resumes created yet. Create your first resume!')}
            mobileRenderItem={(resume) => (
                <MobileResumeCard
                    key={resume.id}
                    resume={resume}
                    onDelete={deleteResume}
                    onDuplicate={duplicateResume}
                    onUpdate={updateResume}
                    onShare={setShareModalResume}
                />
            )}
            renderItem={(resume) => (
                <ResumeCard
                    key={resume.id}
                    resume={resume}
                    onDelete={deleteResume}
                    onDuplicate={duplicateResume}
                    onUpdate={updateResume}
                    onShare={setShareModalResume}
                    onDragStart={(e) => e.preventDefault()}
                />
            )}
        />
    );
};

export const PortfoliosSection: React.FC<SectionProps & { 
    setShareModalPortfolio: (p: PortfolioData) => void;
    handleDuplicatePortfolio: (id: string) => void;
}> = ({ 
    viewMode, sectionName, onLongPress, onTitleChange, setShareModalPortfolio, handleDuplicatePortfolio 
}) => {
    const { portfolios, deletePortfolio, updatePortfolio } = usePortfolios();
    
    return (
        <DashboardPreviewSection
            title={sectionName}
            items={portfolios}
            viewMode={viewMode}
            onLongPress={onLongPress}
            onViewAll={() => navigate('/portfolio')}
            onTitleChange={onTitleChange}
            emptyMessage="No portfolios created yet."
            mobileRenderItem={(portfolio) => (
                <MobilePortfolioCard
                    key={portfolio.id}
                    portfolio={portfolio}
                    onDelete={deletePortfolio}
                    onDuplicate={handleDuplicatePortfolio}
                    onShare={setShareModalPortfolio}
                />
            )}
            renderItem={(portfolio) => (
                <PortfolioCard
                    key={portfolio.id}
                    portfolio={portfolio}
                    onDelete={deletePortfolio}
                    onDuplicate={handleDuplicatePortfolio}
                    onUpdate={updatePortfolio}
                    onShare={setShareModalPortfolio}
                    onDragStart={(e) => e.preventDefault()}
                />
            )}
        />
    );
};

export const InterviewStudioSection: React.FC<SectionProps & { setSelectedJobForReport: (e: PracticeHistoryEntry) => void }> = ({ 
    viewMode, sectionName, onLongPress, onTitleChange, setSelectedJobForReport 
}) => {
    const { practiceHistory, deletePracticeHistory } = usePracticeHistory();
    
    return (
        <DashboardPreviewSection
            title={sectionName}
            items={practiceHistory}
            viewMode={viewMode}
            onLongPress={onLongPress}
            onViewAll={() => navigate('/interview-studio')}
            onTitleChange={onTitleChange}
            emptyMessage="No practice sessions yet. Start your first mock interview!"
            mobileRenderItem={(session) => (
                <MobileInterviewHistoryCard
                    key={session.id}
                    entry={session}
                    onDelete={deletePracticeHistory}
                    onShowReport={setSelectedJobForReport}
                />
            )}
            renderItem={(session) => (
                <InterviewHistoryCard
                    key={session.id}
                    entry={session}
                    onDelete={deletePracticeHistory}
                    onShowReport={setSelectedJobForReport}
                    onDragStart={(e) => e.preventDefault()}
                />
            )}
        />
    );
};

export const WhiteboardsSection: React.FC<SectionProps & { setShareModalWhiteboard: (w: WhiteboardData) => void }> = ({ 
    viewMode, sectionName, onLongPress, onTitleChange, setShareModalWhiteboard 
}) => {
    const { whiteboards, deleteWhiteboard, duplicateWhiteboard, updateWhiteboard, createWhiteboard } = useWhiteboards();
    
    return (
        <React.Fragment>
            <DashboardPreviewSection
                title={sectionName}
                items={whiteboards}
                viewMode={viewMode}
                onLongPress={onLongPress}
                onViewAll={() => navigate('/whiteboard')}
                onTitleChange={onTitleChange}
                emptyMessage="No whiteboards created yet."
                mobileRenderItem={(whiteboard) => (
                    <MobileWhiteboardCard
                        key={whiteboard.id}
                        whiteboard={whiteboard}
                        onDelete={deleteWhiteboard}
                        onDuplicate={duplicateWhiteboard}
                        onShare={setShareModalWhiteboard}
                    />
                )}
                renderItem={(whiteboard) => (
                    <WhiteboardCard
                        key={whiteboard.id}
                        whiteboard={whiteboard}
                        onDelete={deleteWhiteboard}
                        onDuplicate={duplicateWhiteboard}
                        onUpdate={updateWhiteboard}
                        onShare={setShareModalWhiteboard}
                        onDragStart={(e) => e.preventDefault()}
                    />
                )}
            />
            {whiteboards.length === 0 && (
                <div className="flex justify-center -mt-8 mb-10">
                    <button
                        onClick={async () => {
                            const id = await createWhiteboard();
                            navigate(`/whiteboard/${id}`);
                        }}
                        className="cvl-cta rounded-xl px-6 py-2.5 text-[14px] font-semibold transition"
                    >
                        Create a whiteboard
                    </button>
                </div>
            )}
        </React.Fragment>
    );
};

export const JobTrackerSection: React.FC<SectionProps & { setSelectedJobApplication: (j: JobApplicationData) => void }> = ({ 
    viewMode, sectionName, onLongPress, onTitleChange, setSelectedJobApplication 
}) => {
    const { jobApplications, updateJobApplication } = useJobTracker();
    
    return (
        <div className="mb-10">
            <DraggableSectionHeader
                title={sectionName}
                viewMode={viewMode}
                onLongPress={onLongPress}
                onViewAll={() => navigate('/job-tracker')}
                hasItems={jobApplications.length > 0}
                onTitleChange={onTitleChange}
            />

            <div className="mb-6 hidden md:block">
                <StatusOverview applications={jobApplications} />
            </div>
            <div className="mb-6 md:hidden">
                <StatusOverview applications={jobApplications} variant="compact" />
            </div>

            <KanbanBoard
                applications={jobApplications}
                onCardClick={setSelectedJobApplication}
                onUpdateApplication={updateJobApplication}
            />
        </div>
    );
};
