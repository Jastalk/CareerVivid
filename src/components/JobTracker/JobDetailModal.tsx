import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { JobApplicationData, ApplicationStatus, WorkModel, JobPriority, APPLICATION_STATUSES, WORK_MODELS, JOB_PRIORITIES, ResumeData, ResumeMatchAnalysis } from '../../types';
import { Loader2, Wand2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useResumes } from '../../hooks/useResumes';
import { generateJobPrepNotes, regenerateJobPrepSection, analyzeResumeMatch } from '../../services/geminiService';
import ConfirmationModal from '../ConfirmationModal';
import { navigate } from '../../utils/navigation';
import { useAICreditCheck } from '../../hooks/useAICreditCheck';

import { EditablePrepSection, MarkdownRenderer, RegenerateModal } from './JobDetailModalParts';
import JobDetailSidebar from './JobDetailSidebar';
import JobDetailHeader from './JobDetailHeader';

interface JobDetailModalProps {
    job: JobApplicationData;
    onClose: () => void;
    onUpdate: (id: string, data: Partial<JobApplicationData>) => void;
    onDelete: (id: string) => void;
    highlightGenerateButton?: boolean;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, onUpdate, onDelete, highlightGenerateButton = false }) => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const { resumes } = useResumes();

    const { checkCredit, CreditLimitModal } = useAICreditCheck();
    const [localJob, setLocalJob] = useState(job);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [regenModalState, setRegenModalState] = useState<{ section: keyof JobApplicationData, name: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'description' | 'prep'>('description');
    const [fontSize, setFontSize] = useState(1);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [shouldAnimateButton, setShouldAnimateButton] = useState(highlightGenerateButton);

    const [isHighlighting, setIsHighlighting] = useState(false);
    const prepNotesContainerRef = useRef<HTMLDivElement>(null);
    const prevPrepNotesRef = useRef<string | undefined>(job.prep_RoleOverview);

    const { resumes: allResumes } = useResumes();
    const [selectedResumeId, setSelectedResumeId] = useState<string>('');
    const [analysis, setAnalysis] = useState<ResumeMatchAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');

    useEffect(() => {
        if (selectedResumeId && localJob.matchAnalyses) {
            setAnalysis(localJob.matchAnalyses[selectedResumeId] || null);
        } else {
            setAnalysis(null);
        }
    }, [selectedResumeId, localJob.matchAnalyses]);


    useEffect(() => {
        setLocalJob(job);
    }, [job]);

    useEffect(() => {
        if (allResumes.length > 0 && !selectedResumeId) {
            const savedResumeId = localJob.resumeId || job.resumeId;
            const savedResumeExists = savedResumeId && allResumes.some(resume => resume.id === savedResumeId);
            setSelectedResumeId(savedResumeExists ? savedResumeId : allResumes[0].id);
        }
    }, [allResumes, selectedResumeId, localJob.resumeId, job.resumeId]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'CAREER_VIVID_EXTENSION_RESUME_CHANGED') {
                const newResumeId = event.data.resumeId;
                if (newResumeId) {
                    setSelectedResumeId(newResumeId);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        if (!prevPrepNotesRef.current && job.prep_RoleOverview) {
            const scrollTimer = setTimeout(() => {
                prepNotesContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setIsHighlighting(true);
            }, 100);

            const highlightTimer = setTimeout(() => {
                setIsHighlighting(false);
            }, 2100);

            return () => {
                clearTimeout(scrollTimer);
                clearTimeout(highlightTimer);
            };
        }
        prevPrepNotesRef.current = job.prep_RoleOverview;
    }, [job.prep_RoleOverview]);

    const handleFontSizeChange = (direction: 'increase' | 'decrease') => {
        setFontSize(currentSize => {
            if (direction === 'increase') return Math.min(2, currentSize + 1);
            return Math.max(0, currentSize - 1);
        });
    };
    const textSizeClass = ['text-sm', 'text-base', 'text-lg'][fontSize];

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        if (isEditingDescription && descriptionTextareaRef.current) {
            descriptionTextareaRef.current.style.height = 'auto';
            descriptionTextareaRef.current.style.height = `${descriptionTextareaRef.current.scrollHeight}px`;
            descriptionTextareaRef.current.focus();
        }
    }, [isEditingDescription, localJob.jobDescription]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (JSON.stringify(localJob) !== JSON.stringify(job)) {
                onUpdate(localJob.id, localJob);
            }
        }, 1000);
        return () => clearTimeout(handler);
    }, [localJob, onUpdate, job]);

    const handleChange = (field: keyof JobApplicationData, value: any) => {
        setLocalJob(prev => ({ ...prev, [field]: value }));
    };

    const handleDateChange = (dateString: string) => {
        if (dateString) {
            const date = new Date(dateString + 'T00:00:00');
            handleChange('dateApplied', date);
        } else {
            handleChange('dateApplied', null);
        }
    };

    const handleDateFieldChange = (field: keyof JobApplicationData, dateString: string) => {
        handleChange(field, dateString ? new Date(dateString + 'T00:00:00') : null);
    };

    const formatDateForInput = (date: any) => {
        if (!date) return '';
        
        let d: Date;
        if (date.toDate && typeof date.toDate === 'function') {
            d = date.toDate();
        } else if (date && typeof date === 'object' && typeof date.seconds === 'number') {
            d = new Date(date.seconds * 1000);
        } else {
            d = new Date(date);
        }
        
        if (isNaN(d.getTime())) {
            return '';
        }
        
        return d.toISOString().split('T')[0];
    };

    const handleDelete = () => {
        setIsConfirmDeleteOpen(true);
    };

    const confirmDelete = () => {
        setIsDeleting(true);
        onDelete(job.id);
        setIsConfirmDeleteOpen(false);
        onClose();
    };

    const getResumeContext = (): string => {
        const activeResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];
        if (!activeResume) return "No resume available.";
        let context = `Name: ${activeResume.personalDetails.firstName} ${activeResume.personalDetails.lastName} \n`;
        context += `Job Title: ${activeResume.personalDetails.jobTitle} \n\nSUMMARY: \n${activeResume.professionalSummary} \n\n`;
        if (activeResume.employmentHistory.length > 0) {
            context += `EXPERIENCE: \n`;
            activeResume.employmentHistory.forEach(job => {
                context += `- ${job.jobTitle} at ${job.employer} \n${job.description} \n`;
            });
        }
        if (activeResume.skills.length > 0) {
            context += `\nSKILLS: ${activeResume.skills.map(s => s.name).join(', ')} \n`;
        }
        return context;
    };

    const handleGenerateAllPrepNotes = async () => {
        if (!currentUser) return;

        if (!checkCredit()) return;
        setShouldAnimateButton(false);
        setIsGeneratingAll(true);
        try {
            const resumeContext = getResumeContext();
            const generatedNotes = await generateJobPrepNotes(currentUser.uid, localJob, resumeContext);
            onUpdate(localJob.id, { ...localJob, ...generatedNotes });
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to generate notes.");
        } finally {
            setIsGeneratingAll(false);
        }
    };

    const handleRegenerateSection = async (instruction: string) => {
        if (!currentUser || !regenModalState) return;

        if (!checkCredit()) return;
        const resumeContext = getResumeContext();
        try {
            const newText = await regenerateJobPrepSection(
                currentUser.uid,
                regenModalState.name,
                localJob,
                resumeContext,
                instruction
            );
            handleChange(regenModalState.section, newText);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to regenerate section.");
        }
    };

    const formatResumeForAnalysis = (resume: ResumeData): string => {
        let text = `Title: ${resume.personalDetails.jobTitle} \n\n`;
        text += `Summary: ${resume.professionalSummary} \n\n`;
        text += `Skills: ${resume.skills.map(s => s.name).join(', ')} \n\n`;
        text += 'Experience:\n';
        resume.employmentHistory.forEach(job => {
            text += `- ${job.jobTitle} at ${job.employer} \n${job.description} \n`;
        });
        text += '\nEducation:\n';
        resume.education.forEach(edu => {
            text += `- ${edu.degree} from ${edu.school} \n`;
        });
        return text;
    };

    const handleAnalyzeMatch = async () => {
        if (!currentUser || !selectedResumeId || !localJob.jobDescription) {
            setAnalysisError('A resume must be selected and the job must have a description.');
            return;
        }

        if (!checkCredit()) return;

        const selectedResume = allResumes.find(r => r.id === selectedResumeId);
        if (!selectedResume) {
            setAnalysisError('Could not find the selected resume.');
            return;
        }

        setIsAnalyzing(true);
        setAnalysis(null);
        setAnalysisError('');

        try {
            const resumeText = formatResumeForAnalysis(selectedResume);
            const result = await analyzeResumeMatch(currentUser.uid, resumeText, localJob.jobDescription);
            setAnalysis(result);
            const updatedAnalyses = { ...(localJob.matchAnalyses || {}), [selectedResumeId]: result };
            handleChange('matchAnalyses', updatedAnalyses);
        } catch (error) {
            setAnalysisError(error instanceof Error ? error.message : 'An unknown error occurred during analysis.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleOptimizeResume = () => {
        sessionStorage.setItem('jobDescriptionForOptimization', job.jobDescription || '');
        sessionStorage.setItem('jobTitleForOptimization', job.jobTitle || '');
        if (analysis) {
            sessionStorage.setItem('jobMatchAnalysis', JSON.stringify(analysis));
        } else {
            sessionStorage.removeItem('jobMatchAnalysis');
        }
        navigate(`/edit/${selectedResumeId}`);
    };

    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);

    useEffect(() => {
        const loadVoices = () => {
            const allVoices = Array.from(window.speechSynthesis.getVoices());
            const googleVoices = allVoices.filter(v => v.name.includes('Google'));
            const finalVoices = googleVoices.length > 0 ? googleVoices : allVoices;

            setVoices(finalVoices);

            if (finalVoices.length > 0) {
                const savedVoiceURI = localStorage.getItem('preferredVoiceURI');
                if (savedVoiceURI) {
                    const found = finalVoices.find(v => v.voiceURI === savedVoiceURI);
                    if (found) setSelectedVoice(found);
                } else {
                    const defaultVoice = finalVoices.find(v => v.name.includes('Google US English')) || finalVoices[0];
                    setSelectedVoice(defaultVoice);
                }
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const handleVoiceSelect = (voice: SpeechSynthesisVoice) => {
        setSelectedVoice(voice);
        localStorage.setItem('preferredVoiceURI', voice.voiceURI);
        setIsVoiceDropdownOpen(false);
    };

    const handleVoiceReset = () => {
        localStorage.removeItem('preferredVoiceURI');
        const availVoices = window.speechSynthesis.getVoices();
        if (availVoices.length > 0) {
            const defaultVoice = availVoices.find(v => v.name.includes('Google US English'));
            if (defaultVoice) setSelectedVoice(defaultVoice);
            else setSelectedVoice(availVoices[0]);
        }
        setIsVoiceDropdownOpen(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-1.5 backdrop-blur-sm sm:p-3">
            <CreditLimitModal />
            {regenModalState && (
                <RegenerateModal
                    sectionName={regenModalState.name}
                    onClose={() => setRegenModalState(null)}
                    onRegenerate={handleRegenerateSection}
                />
            )}
            {isConfirmDeleteOpen && (
                <ConfirmationModal
                    isOpen={isConfirmDeleteOpen}
                    title={t('job_tracker.modal.delete_title')}
                    message={t('job_tracker.modal.delete_confirm')}
                    onConfirm={confirmDelete}
                    onCancel={() => setIsConfirmDeleteOpen(false)}
                    confirmText={t('job_tracker.modal.delete_btn')}
                />
            )}
            <div className="flex h-[calc(100vh-0.75rem)] w-full max-w-[1800px] flex-col overflow-hidden rounded-3xl border border-[#e6dac8] bg-[#f8f8fb] shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:border-gray-800 dark:bg-[#1f1f1d] sm:h-[calc(100vh-1.5rem)]">
                <JobDetailHeader
                    localJob={localJob}
                    t={t}
                    isVoiceDropdownOpen={isVoiceDropdownOpen}
                    setIsVoiceDropdownOpen={setIsVoiceDropdownOpen}
                    voices={voices}
                    selectedVoice={selectedVoice}
                    handleVoiceReset={handleVoiceReset}
                    handleVoiceSelect={handleVoiceSelect}
                    fontSize={fontSize}
                    handleFontSizeChange={handleFontSizeChange}
                    handleDelete={handleDelete}
                    isDeleting={isDeleting}
                    onClose={onClose}
                />

                <div className="flex-grow overflow-y-auto bg-[#f7f1e7] p-3 dark:bg-[#111827] sm:p-5">
                    {/* Wide screens get a two-column sidebar so all cards fit without scrolling. */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_720px]">
                        <main className="min-w-0 space-y-4">
                            <div className="overflow-hidden rounded-2xl border border-[#ececf4] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex items-center gap-1 border-b border-[#ececf4] px-3 pt-3 dark:border-gray-800">
                                    <button
                                        onClick={() => setActiveTab('description')}
                                        className={`rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'description' ? 'bg-[#f7f1e7] text-gray-950 dark:bg-gray-800 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}
                                    >
                                        Description
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('prep')}
                                        className={`rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'prep' ? 'bg-[#f7f1e7] text-gray-950 dark:bg-gray-800 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}
                                    >
                                        Prep
                                    </button>
                                </div>

                                {activeTab === 'description' ? (
                                    <section className="p-4 sm:p-5 min-w-0">
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('job_tracker.modal.job_description')}</h3>
                                            <button
                                                onClick={() => setIsEditingDescription(true)}
                                                className="rounded-full border border-[#d9d7fb] bg-[#f3f2ff] px-3 py-1 text-xs font-semibold text-[#4a4392] transition-colors hover:bg-[#ecebff] dark:border-[#4a456f] dark:bg-[#302e4c] dark:text-[#c8c5ff]"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        {isEditingDescription ? (
                                            <textarea
                                                ref={descriptionTextareaRef}
                                                value={localJob.jobDescription || ''}
                                                onChange={(e) => {
                                                    handleChange('jobDescription', e.target.value);
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                                }}
                                                onBlur={() => setIsEditingDescription(false)}
                                                onKeyDown={(e) => e.key === 'Escape' && setIsEditingDescription(false)}
                                                className="w-full min-h-[420px] p-3 text-inherit leading-relaxed bg-[#fffaf4] dark:bg-gray-950 rounded-xl border-2 border-[#8d88e6] focus:outline-none resize-none overflow-hidden text-gray-800 dark:text-gray-100"
                                                placeholder="Paste the job description here."
                                            />
                                        ) : (
                                            <div
                                                onClick={() => setIsEditingDescription(true)}
                                                className={`w-full min-h-[480px] max-h-[68vh] overflow-y-auto rounded-xl border border-transparent p-3 transition-colors hover:bg-[#fffaf4] dark:hover:bg-gray-800/60 cursor-pointer ${textSizeClass}`}
                                            >
                                                {localJob.jobDescription ? (
                                                    <div className="whitespace-pre-wrap break-words">
                                                        <MarkdownRenderer text={localJob.jobDescription} />
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No job description yet.</p>
                                                )}
                                            </div>
                                        )}
                                    </section>
                                ) : (
                                    <section className="p-4 sm:p-5 min-w-0">
                                        <div className="flex items-center justify-between gap-3 mb-4">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Prep</h3>
                                            <button
                                                onClick={handleGenerateAllPrepNotes}
                                                disabled={isGeneratingAll}
                                                className={`flex items-center justify-center gap-2 rounded-lg bg-[#4a4392] px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-[#5750c8] disabled:bg-[#c8c5ff] ${shouldAnimateButton ? 'animate-gentle-pulse' : ''}`}
                                            >
                                                {isGeneratingAll ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
                                                {isGeneratingAll ? t('job_tracker.modal.generating') : t('job_tracker.modal.generate_prep')}
                                            </button>
                                        </div>
                                        <div className={`space-y-8 ${textSizeClass} transition-all duration-300 ${isHighlighting ? 'animate-highlight p-4 -m-4 rounded-lg' : ''}`} ref={prepNotesContainerRef}>
                                            <EditablePrepSection label={t('job_tracker.modal.prep_sections.role_research')} value={localJob.prep_RoleOverview || ''} onChange={v => handleChange('prep_RoleOverview', v)} placeholder={t('job_tracker.modal.prep_sections.role_research_ph')} onRegenerate={() => setRegenModalState({ section: 'prep_RoleOverview', name: t('job_tracker.modal.prep_sections.role_research') })} selectedVoice={selectedVoice} />
                                            <EditablePrepSection label={t('job_tracker.modal.prep_sections.my_story')} value={localJob.prep_MyStory || ''} onChange={v => handleChange('prep_MyStory', v)} placeholder={t('job_tracker.modal.prep_sections.my_story_ph')} onRegenerate={() => setRegenModalState({ section: 'prep_MyStory', name: t('job_tracker.modal.prep_sections.my_story') })} selectedVoice={selectedVoice} />
                                            <EditablePrepSection label={t('job_tracker.modal.prep_sections.interview_prep')} value={localJob.prep_InterviewPrep || ''} onChange={v => handleChange('prep_InterviewPrep', v)} placeholder={t('job_tracker.modal.prep_sections.interview_prep_ph')} onRegenerate={() => setRegenModalState({ section: 'prep_InterviewPrep', name: t('job_tracker.modal.prep_sections.interview_prep') })} selectedVoice={selectedVoice} />
                                            <EditablePrepSection label={t('job_tracker.modal.prep_sections.questions_for_them')} value={localJob.prep_QuestionsForInterviewer || ''} onChange={v => handleChange('prep_QuestionsForInterviewer', v)} placeholder={t('job_tracker.modal.prep_sections.questions_for_them_ph')} onRegenerate={() => setRegenModalState({ section: 'prep_QuestionsForInterviewer', name: t('job_tracker.modal.prep_sections.questions_for_them') })} selectedVoice={selectedVoice} />
                                            <EditablePrepSection label={t('job_tracker.modal.prep_sections.general_notes')} value={localJob.notes || ''} onChange={v => handleChange('notes', v)} placeholder={t('job_tracker.modal.prep_sections.general_notes_ph')} onRegenerate={() => setRegenModalState({ section: 'notes', name: t('job_tracker.modal.prep_sections.general_notes') })} selectedVoice={selectedVoice} />
                                        </div>
                                    </section>
                                )}
                            </div>
                        </main>

                        <JobDetailSidebar
                            t={t}
                            localJob={localJob}
                            allResumes={allResumes}
                            selectedResumeId={selectedResumeId}
                            setSelectedResumeId={setSelectedResumeId}
                            handleChange={handleChange}
                            handleDateFieldChange={handleDateFieldChange}
                            handleDateChange={handleDateChange}
                            formatDateForInput={formatDateForInput}
                            handleAnalyzeMatch={handleAnalyzeMatch}
                            isAnalyzing={isAnalyzing}
                            analysisError={analysisError}
                            analysis={analysis}
                            handleOptimizeResume={handleOptimizeResume}
                            setActiveTab={setActiveTab}
                            handleGenerateAllPrepNotes={handleGenerateAllPrepNotes}
                            isGeneratingAll={isGeneratingAll}
                            shouldAnimateButton={shouldAnimateButton}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetailModal;
