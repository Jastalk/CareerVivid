import React from 'react';
import { ArrowRight, CheckCircle, Loader2, Wand2, XCircle } from 'lucide-react';
import { APPLICATION_STATUSES, JOB_PRIORITIES, WORK_MODELS, NEXT_ACTION_OPTIONS, NO_NEXT_ACTION, ApplicationStatus, JobPriority, WorkModel } from '../../types';
import { EditableField, EditableSelect } from './JobDetailModalParts';

interface JobDetailSidebarProps {
  t: any;
  localJob: any;
  allResumes: any[];
  selectedResumeId: string;
  setSelectedResumeId: (id: string) => void;
  handleChange: (field: any, value: any) => void;
  handleDateFieldChange: (field: any, dateString: string) => void;
  handleDateChange: (dateString: string) => void;
  formatDateForInput: (date: any) => string;
  handleAnalyzeMatch: () => void;
  isAnalyzing: boolean;
  analysisError: string;
  analysis: any;
  handleOptimizeResume: () => void;
  setActiveTab: (tab: 'description' | 'prep') => void;
  handleGenerateAllPrepNotes: () => void;
  isGeneratingAll: boolean;
  shouldAnimateButton: boolean;
}

const normalizeUrl = (url?: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.trim().replace(/\/$/, '');
  }
};

const SidebarSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <section className={`rounded-2xl border border-[#ececf4] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-gray-900 ${className}`}>
    <h3 className="mb-3 text-sm font-bold text-gray-950 dark:text-gray-100">{title}</h3>
    {children}
  </section>
);

const JobDetailSidebar: React.FC<JobDetailSidebarProps> = ({
  t, localJob, allResumes, selectedResumeId, setSelectedResumeId, handleChange,
  handleDateFieldChange, handleDateChange, formatDateForInput, handleAnalyzeMatch,
  isAnalyzing, analysisError, analysis, handleOptimizeResume, setActiveTab,
  handleGenerateAllPrepNotes, isGeneratingAll, shouldAnimateButton,
}) => {
const jobPostUrl = localJob.jobPostURL || '';
const applicationUrl = localJob.applicationURL || '';
const primaryUrl = jobPostUrl || applicationUrl;
const hasDuplicateUrls = Boolean(jobPostUrl && applicationUrl && normalizeUrl(jobPostUrl) === normalizeUrl(applicationUrl));

const actionLabels: Record<string, string> = {
  apply_now: 'Apply now',
  tailor_first: 'Tailor first',
  network_first: 'Network first',
  skip_for_now: 'Skip for now',
};

const actionTone = analysis?.recommendedAction === 'apply_now'
  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
  : analysis?.recommendedAction === 'network_first'
    ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
    : analysis?.recommendedAction === 'skip_for_now'
      ? 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800'
      : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';

return (
<aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start xl:grid xl:grid-cols-2 xl:items-start">
    <SidebarSection title="Pipeline">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            <EditableSelect label={t('job_tracker.modal.status.label', { defaultValue: 'Status' })} value={localJob.applicationStatus} onChange={v => handleChange('applicationStatus', v as ApplicationStatus)} options={APPLICATION_STATUSES} />
            <EditableSelect label="Priority" value={localJob.priority || 'Medium'} onChange={v => handleChange('priority', v as JobPriority)} options={JOB_PRIORITIES} />
            <EditableSelect
                label="Next Action"
                value={localJob.nextAction || NO_NEXT_ACTION}
                onChange={v => {
                    handleChange('nextAction', v);
                    if (v === NO_NEXT_ACTION) handleDateFieldChange('nextActionDueDate', '');
                }}
                options={NEXT_ACTION_OPTIONS}
            />
            <EditableField label="Due Date" value={formatDateForInput(localJob.nextActionDueDate)} onChange={v => handleDateFieldChange('nextActionDueDate', v)} type="date" />
            <EditableField label={t('job_tracker.modal.date_applied')} value={formatDateForInput(localJob.dateApplied)} onChange={handleDateChange} type="date" />
            <EditableField label={t('job_tracker.modal.interview_stage')} value={localJob.interviewStage || ''} onChange={v => handleChange('interviewStage', v)} placeholder="e.g., Technical Screen" />
            <EditableField label="Contact" value={localJob.contactName || ''} onChange={v => handleChange('contactName', v)} placeholder="e.g., Jane Smith" />
        </div>
    </SidebarSection>

    <SidebarSection title="Role" className="space-y-4">
        <EditableField label={t('job_tracker.modal.job_title')} value={localJob.jobTitle} onChange={v => handleChange('jobTitle', v)} placeholder="e.g., Software Engineer" />
        <EditableField label={t('job_tracker.modal.company')} value={localJob.companyName} onChange={v => handleChange('companyName', v)} placeholder="e.g., Google" />
        <EditableField label={t('job_tracker.modal.location')} value={localJob.location || ''} onChange={v => handleChange('location', v)} placeholder="e.g., San Francisco, CA" />
        <EditableField label={t('job_tracker.modal.salary_range')} value={localJob.salaryRange || ''} onChange={v => handleChange('salaryRange', v)} placeholder="e.g., $120k - $150k" />
        <EditableSelect label={t('job_tracker.modal.work_model')} value={localJob.workModel || ''} onChange={v => handleChange('workModel', v as WorkModel)} options={WORK_MODELS} />
    </SidebarSection>

    <SidebarSection title="Links" className="space-y-4">
        <EditableField
            label={hasDuplicateUrls ? 'Job URL' : jobPostUrl ? t('job_tracker.modal.job_post_url') : t('job_tracker.modal.direct_app_url')}
            value={primaryUrl}
            onChange={v => {
                if (jobPostUrl || !applicationUrl) {
                    handleChange('jobPostURL', v);
                    if (hasDuplicateUrls) handleChange('applicationURL', v);
                } else {
                    handleChange('applicationURL', v);
                }
            }}
            placeholder="https://..."
        />
        {applicationUrl && !hasDuplicateUrls && (
            <EditableField label={t('job_tracker.modal.direct_app_url')} value={applicationUrl} onChange={v => handleChange('applicationURL', v)} placeholder="https://..." />
        )}
        {hasDuplicateUrls && (
            <p className="rounded-lg border border-[#ececf4] bg-[#fbfbfe] px-3 py-2 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                Direct apply uses the same link.
            </p>
        )}
    </SidebarSection>

    <SidebarSection title={t('job_tracker.modal.resume_match')} className="space-y-4">
        <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{t('job_tracker.modal.compare_resume')}</label>
            <select
                value={selectedResumeId}
                onChange={e => {
                    const nextResumeId = e.target.value;
                    const nextResume = allResumes.find(resume => resume.id === nextResumeId);
                    setSelectedResumeId(nextResumeId);
                    handleChange('resumeId', nextResumeId);
                    handleChange('resumeTitle', nextResume?.title || '');
                    window.postMessage({ type: 'CAREER_VIVID_WEB_RESUME_CHANGED', resumeId: nextResumeId }, '*');
                }}
                className="h-10 w-full min-w-0 rounded-lg border border-[#e4d8c8] bg-[#fffaf4] px-3 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-[#8d88e6] focus:bg-white focus:ring-2 focus:ring-[#f3f2ff] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
                {allResumes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
        </div>
        <button
            onClick={handleAnalyzeMatch}
            disabled={isAnalyzing || !localJob.jobDescription}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4a4392] px-4 py-2.5 font-semibold text-white shadow-[0_10px_20px_rgba(98,91,213,0.16)] transition-colors hover:bg-[#5750c8] disabled:bg-[#c8c5ff]"
        >
            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
            {isAnalyzing ? t('job_tracker.modal.analyzing') : t('job_tracker.modal.analyze_match')}
        </button>
        {analysisError && <p className="text-red-500 text-sm break-words">{analysisError}</p>}
        {analysis && (
            <div className="bg-blue-600/10 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-3 rounded-md space-y-3">
                <div>
                    <div className="flex justify-between gap-3 font-semibold text-sm">
                        <span>{analysis.matchedKeywords.length} / {analysis.totalKeywords} keywords</span>
                        <span>{Math.round(analysis.matchPercentage)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, analysis.matchPercentage))}%` }}></div>
                    </div>
                </div>
                <p className="text-xs font-medium break-words">{analysis.summary}</p>
                {(analysis.recommendedAction || analysis.suggestedResumeAngle) && (
                    <div className="rounded-md border border-blue-100 bg-white/70 p-3 text-xs dark:border-blue-900/40 dark:bg-gray-950/50">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Recommended action</span>
                            {analysis.recommendedAction && (
                                <span className={`rounded-full border px-2 py-0.5 font-bold ${actionTone}`}>
                                    {actionLabels[analysis.recommendedAction] || analysis.recommendedAction}
                                </span>
                            )}
                        </div>
                        {analysis.suggestedResumeAngle && (
                            <p className="mt-2 font-medium text-gray-600 dark:text-gray-300">{analysis.suggestedResumeAngle}</p>
                        )}
                    </div>
                )}
                {(analysis.strongMatches?.length || analysis.experienceGaps?.length) && (
                    <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-1">
                        {analysis.strongMatches?.length > 0 && (
                            <div className="rounded-md border border-green-100 bg-green-50/60 p-2 dark:border-green-900/50 dark:bg-green-950/20">
                                <h4 className="font-bold text-green-700 dark:text-green-300">Strong match</h4>
                                <ul className="mt-1 list-disc space-y-1 pl-4 text-green-800 dark:text-green-200">
                                    {analysis.strongMatches.slice(0, 3).map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                        {analysis.experienceGaps?.length > 0 && (
                            <div className="rounded-md border border-amber-100 bg-amber-50/60 p-2 dark:border-amber-900/50 dark:bg-amber-950/20">
                                <h4 className="font-bold text-amber-700 dark:text-amber-300">Gaps to address</h4>
                                <ul className="mt-1 list-disc space-y-1 pl-4 text-amber-800 dark:text-amber-200">
                                    {analysis.experienceGaps.slice(0, 3).map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                <div className="space-y-2 text-xs">
                    <div>
                        <h4 className="font-bold text-green-700 dark:text-green-400 flex items-center gap-1"><CheckCircle size={14} /> {t('job_tracker.modal.matched_keywords')}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {analysis.matchedKeywords.map(k => <span key={k} className="bg-green-200/50 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-md break-all">{k}</span>)}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-yellow-700 dark:text-yellow-400 flex items-center gap-1"><XCircle size={14} /> {t('job_tracker.modal.missing_keywords')}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {analysis.missingKeywords.map(k => <span key={k} className="bg-yellow-200/50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-md break-all">{k}</span>)}
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleOptimizeResume}
                    className="w-full bg-[#4a4392] text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-[#5750c8] transition-colors flex items-center justify-center gap-2"
                >
                    {t('job_tracker.modal.optimize_resume')} <ArrowRight size={16} />
                </button>
            </div>
        )}
    </SidebarSection>

    <SidebarSection title="Prep" className="space-y-3">
        <button
            onClick={() => {
                setActiveTab('prep');
                handleGenerateAllPrepNotes();
            }}
            disabled={isGeneratingAll}
            className={`w-full bg-[#4a4392] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:bg-[#5750c8] transition-colors flex items-center justify-center gap-2 disabled:bg-[#c8c5ff] ${shouldAnimateButton ? 'animate-gentle-pulse' : ''}`}
        >
            {isGeneratingAll ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
            {isGeneratingAll ? t('job_tracker.modal.generating') : t('job_tracker.modal.generate_prep')}
        </button>
    </SidebarSection>
</aside>
);
};

export default JobDetailSidebar;
