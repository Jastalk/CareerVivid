import React from 'react';
import { ExternalLink, FileText, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    ApplicationStatus,
    APPLICATION_STATUSES,
    JobPriority,
    JOB_PRIORITIES,
    NEXT_ACTION_OPTIONS,
    NO_NEXT_ACTION,
    WorkModel,
    WORK_MODELS,
} from '../../types';
import AddJobEditHeader from './AddJobEditHeader';
import type { InitialJobData } from './AddJobUrlModal';
import { toSafeExternalUrl } from '../../utils/safeUrl';

interface AddJobEditFormProps {
    initialJobData?: InitialJobData;
    jobTitle: string;
    setJobTitle: React.Dispatch<React.SetStateAction<string>>;
    companyName: string;
    setCompanyName: React.Dispatch<React.SetStateAction<string>>;
    location: string;
    setLocation: React.Dispatch<React.SetStateAction<string>>;
    salaryRange: string;
    setSalaryRange: React.Dispatch<React.SetStateAction<string>>;
    status: ApplicationStatus;
    setStatus: React.Dispatch<React.SetStateAction<ApplicationStatus>>;
    workModel: WorkModel;
    setWorkModel: React.Dispatch<React.SetStateAction<WorkModel>>;
    interviewStage: string;
    setInterviewStage: React.Dispatch<React.SetStateAction<string>>;
    dateApplied: string;
    setDateApplied: React.Dispatch<React.SetStateAction<string>>;
    priority: JobPriority;
    setPriority: React.Dispatch<React.SetStateAction<JobPriority>>;
    nextAction: string;
    setNextAction: React.Dispatch<React.SetStateAction<string>>;
    nextActionDueDate: string;
    setNextActionDueDate: React.Dispatch<React.SetStateAction<string>>;
    contactName: string;
    setContactName: React.Dispatch<React.SetStateAction<string>>;
    jobPostURL: string;
    setJobPostURL: React.Dispatch<React.SetStateAction<string>>;
    directApplicationURL: string;
    setDirectApplicationURL: React.Dispatch<React.SetStateAction<string>>;
    onClose: () => void;
    onBackToPaste: () => void;
    onSubmit: (event: React.FormEvent) => void;
}

const fieldClass = 'w-full bg-transparent border-b border-gray-300 dark:border-[#2e2b38] py-2 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors font-medium text-sm focus:ring-0';
const selectClass = `${fieldClass} dark:bg-[#201e27] cursor-pointer`;
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1';

const AddJobEditForm: React.FC<AddJobEditFormProps> = ({
    initialJobData,
    jobTitle,
    setJobTitle,
    companyName,
    setCompanyName,
    location,
    setLocation,
    salaryRange,
    setSalaryRange,
    status,
    setStatus,
    workModel,
    setWorkModel,
    interviewStage,
    setInterviewStage,
    dateApplied,
    setDateApplied,
    priority,
    setPriority,
    nextAction,
    setNextAction,
    nextActionDueDate,
    setNextActionDueDate,
    contactName,
    setContactName,
    jobPostURL,
    setJobPostURL,
    directApplicationURL,
    setDirectApplicationURL,
    onClose,
    onBackToPaste,
    onSubmit,
}) => {
    const { t } = useTranslation();
    const safeJobPostUrl = toSafeExternalUrl(jobPostURL);
    const safeDirectApplicationUrl = toSafeExternalUrl(directApplicationURL);

    return (
        <form onSubmit={onSubmit}>
            <AddJobEditHeader jobTitle={jobTitle} companyName={companyName} onClose={onClose} />
            {initialJobData?.resumeTitle && (
                <div className="border-b border-[#ececf4] bg-[#fbfbfe] px-6 py-3 text-xs font-semibold text-gray-600 dark:border-[#2e2b38] dark:bg-[#201e27] dark:text-gray-300 sm:px-8">
                    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#d9d7fb] bg-white px-3 py-1.5 text-[#4a4392] dark:border-indigo-900/50 dark:bg-[#1a1820] dark:text-indigo-300">
                        <FileText size={13} className="shrink-0" />
                        <span className="truncate">Resume context: {initialJobData.resumeTitle}</span>
                    </span>
                </div>
            )}

            <div className="bg-white p-6 dark:bg-[#1a1820] sm:p-8">
                <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm dark:border-[#2e2b38] dark:bg-[#201e27]">
                    <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
                        <div>
                            <label className={labelClass}>{t('job_tracker.modal.job_title')}</label>
                            <input type="text" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g., Software Engineer" required className={fieldClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('job_tracker.modal.company')}</label>
                            <input type="text" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g., Google" required className={fieldClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('job_tracker.modal.location')}</label>
                            <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g., San Francisco, CA" className={fieldClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('job_tracker.modal.salary_range')}</label>
                            <input type="text" value={salaryRange} onChange={(event) => setSalaryRange(event.target.value)} placeholder="e.g., $120k - $150k" className={fieldClass} />
                        </div>
                    </div>

                    <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
                        <div>
                            <label className={labelClass}>{t('job_tracker.modal.status.label', { defaultValue: 'Status' })}</label>
                            <select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus)} className={selectClass}>
                                {APPLICATION_STATUSES.map(option => <option key={option} value={option} className="dark:bg-[#201e27]">{option}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('job_tracker.modal.work_model')}</label>
                            <select value={workModel} onChange={(event) => setWorkModel(event.target.value as WorkModel)} className={selectClass}>
                                {WORK_MODELS.map(option => <option key={option} value={option} className="dark:bg-[#201e27]">{option}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('job_tracker.modal.interview_stage')}</label>
                            <input type="text" value={interviewStage} onChange={(event) => setInterviewStage(event.target.value)} placeholder="e.g., Technical Screen" className={fieldClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('job_tracker.modal.date_applied')}</label>
                            <input type="date" value={dateApplied} onChange={(event) => setDateApplied(event.target.value)} className={`${fieldClass} cursor-pointer`} />
                        </div>
                    </div>

                    <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
                        <div>
                            <label className={labelClass}>Priority</label>
                            <select value={priority} onChange={(event) => setPriority(event.target.value as JobPriority)} className={selectClass}>
                                {JOB_PRIORITIES.map(option => <option key={option} value={option} className="dark:bg-[#201e27]">{option}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Next Action</label>
                            <select
                                value={nextAction}
                                onChange={(event) => {
                                    setNextAction(event.target.value);
                                    if (event.target.value === NO_NEXT_ACTION) setNextActionDueDate('');
                                }}
                                className={selectClass}
                            >
                                {NEXT_ACTION_OPTIONS.map(option => <option key={option} value={option} className="dark:bg-[#201e27]">{option}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Action Due</label>
                            <input type="date" value={nextActionDueDate} onChange={(event) => setNextActionDueDate(event.target.value)} className={`${fieldClass} cursor-pointer`} />
                        </div>
                        <div>
                            <label className={labelClass}>Contact</label>
                            <input type="text" value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Recruiter or contact" className={fieldClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('job_tracker.modal.job_post_url')}</label>
                                {safeJobPostUrl && (
                                    <a href={safeJobPostUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-indigo-500 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
                                        <span>Open URL</span>
                                        <ExternalLink size={12} />
                                    </a>
                                )}
                            </div>
                            <input type="url" value={jobPostURL} onChange={(event) => setJobPostURL(event.target.value)} placeholder="https://openai.com/careers/..." className={fieldClass} />
                        </div>

                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('job_tracker.modal.direct_app_url')}</label>
                                {safeDirectApplicationUrl && (
                                    <a href={safeDirectApplicationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-indigo-500 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
                                        <span>Open URL</span>
                                        <ExternalLink size={12} />
                                    </a>
                                )}
                            </div>
                            <input type="url" value={directApplicationURL} onChange={(event) => setDirectApplicationURL(event.target.value)} placeholder="https://jobs.ashbyhq.com/..." className={fieldClass} />
                        </div>
                    </div>
                </div>
            </div>

            <footer className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 p-6 dark:border-[#2e2b38] dark:bg-[#1a1820]">
                <button
                    type="button"
                    onClick={onBackToPaste}
                    className="rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-indigo-500 transition-all hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-[#201e27] dark:hover:text-indigo-400"
                >
                    Parse New Text
                </button>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-5 py-2 text-sm font-semibold text-gray-500 transition-all hover:bg-gray-100 dark:hover:bg-[#2c2937]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-indigo-500/20 active:scale-95"
                    >
                        <Sparkles size={16} />
                        Save to Pipeline
                    </button>
                </div>
            </footer>
        </form>
    );
};

export default AddJobEditForm;
