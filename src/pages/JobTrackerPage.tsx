import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useJobTracker } from '../hooks/useJobTracker';
import { useResumes } from '../hooks/useResumes'; // Import useResumes
import { ApplicationStatus, APPLICATION_STATUSES, JobApplicationData, JobPriority } from '../types';
import StatusOverview from '../components/JobTracker/StatusOverview';
import KanbanBoard from '../components/JobTracker/KanbanBoard';
import StrategyMap from '../components/JobTracker/StrategyMap';
import JobDetailModal from '../components/JobTracker/JobDetailModal';
import AddJobModal, { type InitialJobData } from '../components/JobTracker/AddJobUrlModal';
import TodayJobSearchPlan from '../components/JobTracker/TodayJobSearchPlan';
import PipelineControls from '../components/JobTracker/PipelineControls';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { navigate } from '../utils/navigation';
import AppLayout from '../components/Layout/AppLayout';
import { useNavigation } from '../contexts/NavigationContext';
import { db } from '../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

type TrackerTransitData = {
    scrapeId?: string;
    localTransitId?: string;
    fallbackDescription?: string;
    url?: string;
    title?: string;
    company?: string;
    location?: string;
    salary?: string;
    stage?: string;
    resumeId?: string;
    resumeTitle?: string;
};

const trackerTransitFields = [
    'scrapeId',
    'localTransitId',
    'fallbackDescription',
    'url',
    'title',
    'company',
    'location',
    'salary',
    'stage',
    'resumeId',
    'resumeTitle',
] as const;

const readTrackerTransit = (value: unknown): TrackerTransitData | null => {
    if (!value || typeof value !== 'object') return null;

    const record = value as Record<string, unknown>;
    const transit = trackerTransitFields.reduce<TrackerTransitData>((result, field) => {
        const fieldValue = record[field];
        if (typeof fieldValue === 'string') result[field] = fieldValue;
        return result;
    }, {});

    return transit.localTransitId || transit.scrapeId || transit.url || transit.title || transit.company
        ? transit
        : null;
};


const JobTrackerPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const { jobApplications, isLoading, addJobApplication, updateJobApplication, deleteJobApplication } = useJobTracker();
    const { resumes } = useResumes(); // Fetch resumes
    const { navPosition } = useNavigation();

    const [selectedJob, setSelectedJob] = useState<JobApplicationData | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [highlightForNewJob, setHighlightForNewJob] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'strategy'>('kanban');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
    const [priorityFilter, setPriorityFilter] = useState<JobPriority | 'All'>('All');
    const [sortMode, setSortMode] = useState<'updated' | 'due' | 'priority'>('updated');
    const handledDeepLinkRef = useRef('');

    const [initialJobDescription, setInitialJobDescription] = useState('');
    const [initialJobPostUrl, setInitialJobPostUrl] = useState('');
    const [initialJobData, setInitialJobData] = useState<InitialJobData | undefined>(undefined);
    const [autoSubmit, setAutoSubmit] = useState(false);
    const pendingTrackerTransitRef = useRef<TrackerTransitData | null>(null);
    const handledTrackerTransitsRef = useRef(new Set<string>());

    useEffect(() => {
        // The extension supplies this payload over a same-origin message. Do not persist
        // job descriptions, compensation, or contact details in web storage.
        const params = new URLSearchParams(window.location.search);
        const source = params.get('source');
        if (source === 'extension_tracker') {
            pendingTrackerTransitRef.current = {
                scrapeId: params.get('scrapeId') || '',
                localTransitId: params.get('localTransitId') || '',
                fallbackDescription: params.get('fallbackDescription') || '',
                url: params.get('url') || '',
                title: params.get('title') || '',
                company: params.get('company') || '',
                location: params.get('location') || '',
                salary: params.get('salary') || '',
                stage: params.get('stage') || '',
                resumeId: params.get('resumeId') || '',
                resumeTitle: params.get('resumeTitle') || '',
            };

            // Remove sensitive fields from the address bar immediately.
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }

        const acknowledgeExtensionTransit = (transitId?: string) => {
            if (!transitId) return;
            window.postMessage({
                type: 'CAREERVIVID_WEB_TRACKER_TRANSIT_CONSUMED',
                transitId,
            }, window.location.origin);
        };

        const syncTransitJob = async (transitData: TrackerTransitData | null = pendingTrackerTransitRef.current) => {
            if (!transitData) return;

            const { scrapeId = '', localTransitId = '', fallbackDescription = '', url = '', title = '', company = '', location = '', salary = '', stage = '', resumeId: fallbackResumeId = '', resumeTitle: fallbackResumeTitle = '' } = transitData;
            const transitKey = localTransitId || scrapeId || `${url}:${title}:${company}`;
            if (!transitKey || handledTrackerTransitsRef.current.has(transitKey)) return;

            const finishTransit = (transitId = localTransitId) => {
                handledTrackerTransitsRef.current.add(transitKey);
                pendingTrackerTransitRef.current = null;
                acknowledgeExtensionTransit(transitId);
            };

            if (scrapeId) {
                if (!currentUser?.uid) return;

                try {
                    const docRef = doc(db, 'users', currentUser.uid, 'temporaryScrapes', scrapeId);
                    const docSnap = await getDoc(docRef);
                    if (!docSnap.exists()) return;

                    const data = docSnap.data();
                    const jd = data.description || '';
                    const jobUrl = data.url || data.jobPostURL || '';
                    const resumeId = data.resumeId || '';
                    const resumeTitle = data.resumeTitle || '';
                    const resolvedTransitId = data.localTransitId || localTransitId;
                    let matchAnalyses: InitialJobData['matchAnalyses'] | undefined;

                    if (resumeId && data.matchAnalysisJson) {
                        try {
                            matchAnalyses = { [resumeId]: JSON.parse(data.matchAnalysisJson) };
                        } catch (parseError) {
                            console.warn('Unable to parse extension match analysis transit payload:', parseError);
                        }
                    }

                    const structuredJob: InitialJobData = {
                        jobTitle: data.title || '',
                        companyName: data.company || '',
                        location: data.location || '',
                        salaryRange: data.salary || '',
                        jobPostURL: jobUrl,
                        applicationURL: jobUrl,
                        jobDescription: jd,
                        stage: data.stage || '',
                        resumeId,
                        resumeTitle,
                        matchAnalyses,
                    };

                    setInitialJobDescription(jd);
                    setInitialJobPostUrl(jobUrl);
                    setInitialJobData(structuredJob);
                    setAutoSubmit(true);
                    setIsAddModalOpen(true);
                    finishTransit(resolvedTransitId);
                    await deleteDoc(docRef);
                } catch (error) {
                    console.error('Error syncing transit job in JobTrackerPage:', error);
                }
            } else if (fallbackDescription) {
                    const structuredJob: InitialJobData = {
                        jobTitle: title || '',
                        companyName: company || '',
                        location: location || '',
                        salaryRange: salary || '',
                        jobPostURL: url || '',
                        applicationURL: url || '',
                        jobDescription: fallbackDescription || '',
                        stage: stage || '',
                        resumeId: fallbackResumeId || '',
                        resumeTitle: fallbackResumeTitle || '',
                    };
                    setInitialJobDescription(fallbackDescription);
                    setInitialJobPostUrl(url || '');
                    setInitialJobData(structuredJob);
                    setAutoSubmit(true);
                    setIsAddModalOpen(true);
                    finishTransit();
            } else if (title || company || location || salary) {
                    const structuredJob: InitialJobData = {
                        jobTitle: title || '',
                        companyName: company || '',
                        location: location || '',
                        salaryRange: salary || '',
                        jobPostURL: url || '',
                        applicationURL: url || '',
                        stage: stage || '',
                        resumeId: fallbackResumeId || '',
                        resumeTitle: fallbackResumeTitle || '',
                    };
                    setInitialJobDescription('');
                    setInitialJobPostUrl(url || '');
                    setInitialJobData(structuredJob);
                    setAutoSubmit(false);
                    setIsAddModalOpen(true);
                    finishTransit();
            }
        };

        const handleExtensionTransit = (event: MessageEvent) => {
            if (event.source !== window || event.origin !== window.location.origin) return;
            if (event.data?.type !== 'CAREERVIVID_EXTENSION_TRACKER_TRANSIT_PAYLOAD') return;
            const transit = readTrackerTransit(event.data?.transit);
            if (!transit) return;
            pendingTrackerTransitRef.current = transit;
            void syncTransitJob(transit);
        };

        window.addEventListener('message', handleExtensionTransit);
        window.postMessage({ type: 'CAREERVIVID_WEB_TRACKER_TRANSIT_REQUEST' }, window.location.origin);
        void syncTransitJob();

        return () => {
            window.removeEventListener('message', handleExtensionTransit);
        };
    }, [currentUser?.uid]);

    const handleCardClick = (job: JobApplicationData) => {
        setSelectedJob(job);
        setHighlightForNewJob(false); // Don't highlight when clicking existing cards
    };

    const handleCloseDetailModal = () => {
        setSelectedJob(null);
        setHighlightForNewJob(false);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const jobId = params.get('job');
        const queryText = params.get('q');
        const action = params.get('action');
        const signature = `${jobId || ''}:${queryText || ''}:${action || ''}:${jobApplications.length}`;

        if (!jobId && !queryText && !action) return;
        if (handledDeepLinkRef.current === signature) return;

        // Deep link from the dashboard goal panel: open the "Track a New Job
        // Application" modal directly (e.g. "Save target job" / "Run match"
        // when no job is saved yet).
        if (action === 'new') {
            setIsAddModalOpen(true);
        }

        if (queryText) {
            setSearchQuery(queryText);
        }

        if (jobId && jobApplications.length) {
            const matchedJob = jobApplications.find(job => job.id === jobId);
            if (matchedJob) {
                setSelectedJob(matchedJob);
                setHighlightForNewJob(false);
            }
        }

        handledDeepLinkRef.current = signature;
    }, [jobApplications]);

    const handleJobAdded = async (jobData: Omit<JobApplicationData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
        setIsAddModalOpen(false);
        if (!currentUser) return;

        try {
            const newJobId = await addJobApplication(jobData);
            if (newJobId) {
                sessionStorage.setItem('cv_last_welcome_job_id', newJobId);
                // Create a temporary object to immediately open the modal.
                // The snapshot listener will update the main list with the server-stamped data.
                const tempJobForModal: JobApplicationData = {
                    ...jobData,
                    id: newJobId,
                    userId: currentUser.uid,
                    createdAt: new Date(), // temp value
                    updatedAt: new Date(), // temp value
                };
                setSelectedJob(tempJobForModal);
                setHighlightForNewJob(true);
            }
        } catch (error) {
            console.error("Error adding job application:", error);
            // Optionally, show an alert to the user here.
        }
    };

    const toTime = (value: any): number => {
        if (!value) return Number.MAX_SAFE_INTEGER;
        if (value.toDate && typeof value.toDate === 'function') return value.toDate().getTime();
        if (typeof value === 'object' && typeof value.seconds === 'number') return value.seconds * 1000;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
    };

    const focusedStatus = statusFilter === 'All' ? null : statusFilter;

    const statusCounts = useMemo(() => {
        return APPLICATION_STATUSES.reduce((counts, status) => {
            counts[status] = jobApplications.filter(job => job.applicationStatus === status).length;
            return counts;
        }, {} as Record<ApplicationStatus, number>);
    }, [jobApplications]);

    const filteredApplications = jobApplications
        .filter(job => {
            const query = searchQuery.trim().toLowerCase();
            if (!query) return true;
            return [
                job.jobTitle,
                job.companyName,
                job.location,
                job.interviewStage,
                job.nextAction,
                job.contactName,
            ].some(value => (value || '').toLowerCase().includes(query));
        })
        .filter(job => statusFilter === 'All' || job.applicationStatus === statusFilter)
        .filter(job => priorityFilter === 'All' || (job.priority || 'Medium') === priorityFilter)
        .sort((a, b) => {
            if (sortMode === 'due') return toTime(a.nextActionDueDate) - toTime(b.nextActionDueDate);
            if (sortMode === 'priority') {
                const score: Record<JobPriority, number> = { High: 0, Medium: 1, Low: 2 };
                return score[a.priority || 'Medium'] - score[b.priority || 'Medium'] || toTime(a.nextActionDueDate) - toTime(b.nextActionDueDate);
            }
            return toTime(b.updatedAt) - toTime(a.updatedAt);
        });

    return (
        <AppLayout>
            {/*
              * `min-w-0` matters here: this sits in a column flex container, where
              * the default `min-width: auto` floors the element at its min-content
              * width. The kanban's five columns make that ~1536px, so without this
              * the page pushed past the viewport instead of letting the board use
              * its own horizontal scroll.
              */}
            <div className="cv-design-page cv-design-grid mx-auto min-h-screen w-full min-w-0 max-w-screen-2xl">
                {/* Inline page header */}
                <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                    <div className="flex min-w-0 items-center gap-3">
                        {navPosition !== 'side' && (
                            <button
                                onClick={() => navigate('/dashboard')}
                                title={t('nav.dashboard')}
                                className="shrink-0 text-[var(--cv-text-body)] hover:text-[var(--cv-text-heading)]"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div className="min-w-0">
                            <h1 className="cv-design-title text-[22px]">
                                {t('job_tracker.title')}
                            </h1>
                            <p className="cv-design-body mt-0.5 text-[13px]">
                                {t('job_tracker.subtitle')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="cv-design-button-primary h-9 shrink-0 px-3.5 text-xs"
                    >
                        <PlusCircle size={14} />
                        {t('job_tracker.track_new')}
                    </button>
                </div>

                <div className="px-3 pb-6 sm:px-5 lg:px-6">
                        {isLoading ? (
                            <p className="text-center text-gray-500 dark:text-gray-400">{t('job_tracker.loading')}</p>
                        ) : (
                            <>
                                {/*
                                  * The status strip that used to sit here is gone in Kanban view.
                                  *
                                  * Every figure on it — total, active, interviewing, offers,
                                  * rejected — was already printed on the board's own column
                                  * headers a few hundred pixels below, where the jobs those
                                  * numbers count actually live. Between it, the plan's counters
                                  * and the status chips, `Interviewing 0` appeared three times on
                                  * one screen, and 448px of the 820px viewport was spent before
                                  * the first job card. Strategy view has no columns of its own, so
                                  * it keeps the strip.
                                  */}
                                {viewMode === 'strategy' && (
                                    <StatusOverview applications={jobApplications} variant="compact" />
                                )}

                                <TodayJobSearchPlan applications={jobApplications} onJobSelect={handleCardClick} />

                                <PipelineControls
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    priorityFilter={priorityFilter}
                                    setPriorityFilter={setPriorityFilter}
                                    sortMode={sortMode}
                                    setSortMode={setSortMode}
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    statusFilter={statusFilter}
                                    setStatusFilter={setStatusFilter}
                                    statusCounts={statusCounts}
                                    filteredCount={filteredApplications.length}
                                    totalCount={jobApplications.length}
                                />

                                <div className="mt-4">
                                    {viewMode === 'kanban' ? (
                                        <KanbanBoard
                                            applications={filteredApplications}
                                            onCardClick={handleCardClick}
                                            onUpdateApplication={updateJobApplication}
                                            focusedStatus={focusedStatus}
                                        />
                                    ) : (
                                        <StrategyMap
                                            applications={filteredApplications}
                                            resumes={resumes} // Pass resumes
                                            onCardClick={handleCardClick}
                                            onUpdateJob={updateJobApplication} // Pass update function
                                        />
                                    )}
                                </div>
                            </>
                        )}
                </div>

                {isAddModalOpen && (
                    <AddJobModal
                        onClose={() => {
                            setIsAddModalOpen(false);
                            setInitialJobDescription('');
                            setInitialJobPostUrl('');
                            setInitialJobData(undefined);
                            setAutoSubmit(false);
                        }}
                        onJobAdded={(jobData) => {
                            handleJobAdded(jobData);
                            setInitialJobDescription('');
                            setInitialJobPostUrl('');
                            setInitialJobData(undefined);
                            setAutoSubmit(false);
                        }}
                        initialJobDescription={initialJobDescription}
                        initialJobPostUrl={initialJobPostUrl}
                        initialJobData={initialJobData}
                        autoSubmit={autoSubmit}
                    />
                )}

                {selectedJob && (
                    <JobDetailModal
                        job={jobApplications.find(j => j.id === selectedJob.id) || selectedJob}
                        onClose={handleCloseDetailModal}
                        onUpdate={updateJobApplication}
                        onDelete={deleteJobApplication}
                        highlightGenerateButton={highlightForNewJob}
                    />
                )}
            </div>
        </AppLayout>
    );
};

export default JobTrackerPage;
