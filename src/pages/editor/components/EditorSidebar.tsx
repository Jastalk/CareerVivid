import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Sparkles, Edit3, Sliders, Lock } from 'lucide-react';
import { ResumeData, TemplateInfo } from '../../../types';
import ResumeForm from '../../../components/ResumeForm';
import CommentsPanel from '../../../components/CommentsPanel';
import TemplateSelector from './TemplateSelector';
import DesignControls from './DesignControls';
import { AIReviewPanel } from './AIReviewPanel';
import type { GuestGatedFeature } from '../../../hooks/useEditor';

interface EditorSidebarProps {
    resume: ResumeData;
    currentUser: any;
    activeTab: 'content' | 'template' | 'design' | 'comments' | 'score';
    activeTemplate: TemplateInfo;
    templates: TemplateInfo[];
    sidebarWidth: string;
    sidebarMode: 'standard' | 'expanded' | 'closed';
    isDesktop: boolean;
    isGuestMode: boolean;
    /** Signed-out visitor editing a local draft (not the shared-link editor). */
    isGuestDraft?: boolean;
    isShared: boolean;
    isTemplateLoading: boolean;
    tempPhoto: string | null;
    sampleResume: ResumeData; // For template previews
    viewMode: 'edit' | 'preview';

    setActiveTab: (tab: 'content' | 'template' | 'design' | 'comments' | 'score') => void;
    setTempPhoto: (photo: string | null) => void;

    onResumeChange: (updates: Partial<ResumeData>) => void;
    onTemplateSelect: (template: TemplateInfo) => void;
    onDesignChange: (updates: Partial<ResumeData>) => void;
    onResizeSidebar: (direction: 'left' | 'right') => void;
    onCloseComments: () => void;
    /** Ask the visitor to sign in, naming the feature that needs an account. */
    onRequireSignIn?: (feature: GuestGatedFeature) => void;
}

/**
 * Stands in for a panel whose backend needs a signed-in owner.
 *
 * The AI review and the comments thread both resolve the resume from the
 * caller's uid, so on an unsaved local draft there is nothing for them to read.
 * Showing the reason beats rendering a panel whose every button errors out.
 */
const SignInToUsePanel: React.FC<{ title: string; body: string; onSignIn?: () => void }> = ({ title, body, onSignIn }) => {
    const { t } = useTranslation();

    return (
        // bg-[#fbf8f3]/80 rather than bg-white/70: index.css lists bg-white/70
        // among the light surfaces it repaints text on under html.dark, matching
        // on the class attribute regardless of the dark: override that actually
        // paints this panel dark. Any text-gray-* child added here later would
        // come out dark brown on a near-black panel.
        <div className="mx-auto max-w-sm rounded-2xl border border-[#e6ddd0] bg-[#fbf8f3]/80 p-6 text-center dark:border-gray-800 dark:bg-gray-900/60">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3eee6] text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                <Lock size={20} />
            </span>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">{title}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-400">{body}</p>
            <button
                type="button"
                onClick={onSignIn}
                className="mt-4 rounded-full bg-[#22143f] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#341f5f] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
                {t('editor.guest.sign_in_free')}
            </button>
        </div>
    );
};

const EditorSidebar: React.FC<EditorSidebarProps> = ({
    resume, currentUser, activeTab, activeTemplate, templates,
    sidebarWidth, sidebarMode, isDesktop, isGuestMode, isGuestDraft = false, isShared, isTemplateLoading,
    tempPhoto, sampleResume, viewMode,
    setActiveTab, setTempPhoto,
    onResumeChange, onTemplateSelect, onDesignChange, onResizeSidebar, onCloseComments,
    onRequireSignIn
}) => {
    const { t } = useTranslation();

    return (
        <>
            <div
                className={`
                    flex-shrink-0 border-r border-[#e5dccf] bg-[#fbf8f3] dark:border-gray-800 dark:bg-gray-950
                    h-full z-20
                    absolute md:relative
                    transition-all duration-300 ease-in-out
                    ${isDesktop ? '' : (viewMode === 'preview' ? 'hidden' : 'translate-x-0 w-full')}
                    ${isDesktop && sidebarMode === 'closed' ? 'w-0 overflow-hidden' : ''}
                    md:translate-x-0
                    overflow-hidden
                `}
                style={{ width: isDesktop ? sidebarWidth : '100%' }}
            >
                <div className="w-full h-full flex flex-col" style={{ minWidth: isDesktop ? '520px' : '100%' }}>

                    <div className="flex items-center justify-between gap-1 border-b border-[#e8dfd3] bg-white/80 p-2 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 select-none">
                        <button
                            onClick={() => setActiveTab('score')}
                            className={`flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${activeTab === 'score' ? 'bg-[#22143f] text-white shadow-sm scale-[1.01]' : 'text-slate-500 hover:bg-[#f3eee6] hover:text-slate-800 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                        >
                            <Sparkles size={14} className={activeTab === 'score' ? 'animate-pulse' : ''} /> AI Review
                        </button>
                        <button
                            data-tour="tab-content"
                            onClick={() => setActiveTab('content')}
                            className={`flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${activeTab === 'content' ? 'bg-[#22143f] text-white shadow-sm scale-[1.01]' : 'text-slate-500 hover:bg-[#f3eee6] hover:text-slate-800 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                        >
                            <Edit3 size={14} /> Editor
                        </button>
                        <button
                            data-tour="tab-design"
                            onClick={() => setActiveTab('design')}
                            className={`flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${activeTab === 'design' ? 'bg-[#22143f] text-white shadow-sm scale-[1.01]' : 'text-slate-500 hover:bg-[#f3eee6] hover:text-slate-800 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                        >
                            <Sliders size={14} /> Layout & Style
                        </button>
                    </div>

                    <div data-editor-sidebar-scroll data-tour="editor-fields" className="custom-scrollbar flex-grow overflow-y-auto p-4">
                        {activeTab === 'score' && (
                            <div className="h-full animate-fade-in">
                                {currentUser?.uid && !isGuestDraft ? (
                                    <AIReviewPanel
                                        resume={resume}
                                        currentUserUid={currentUser.uid}
                                        onUpdate={onResumeChange}
                                    />
                                ) : (
                                    <SignInToUsePanel
                                        title={t('editor.guest.review_panel_title')}
                                        body={t('editor.guest.review_panel_body')}
                                        onSignIn={() => onRequireSignIn?.('ai_review')}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === 'content' && (
                            <div className="animate-fade-in">
                                <ResumeForm
                                    resume={resume}
                                    onChange={onResumeChange}
                                    tempPhoto={tempPhoto}
                                    setTempPhoto={setTempPhoto}
                                />
                            </div>
                        )}

                        {activeTab === 'design' && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h4 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">
                                        Choose Template
                                    </h4>
                                    <TemplateSelector
                                        templates={templates}
                                        activeTemplate={activeTemplate}
                                        sampleResume={sampleResume}
                                        isLoading={isTemplateLoading}
                                        activeColor={resume.themeColor}
                                        onSelect={onTemplateSelect}
                                        onColorSelect={(color) => onResumeChange({ themeColor: color })}
                                    />
                                </div>
                                <hr className="border-gray-200 dark:border-gray-700" />
                                <div>
                                    <h4 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">
                                        Customize Style
                                    </h4>
                                    <DesignControls
                                        resume={resume}
                                        activeTemplate={activeTemplate}
                                        onDesignChange={onDesignChange}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'comments' && (
                            <div className="h-full flex flex-col animate-slide-in-right">
                                {currentUser?.uid && resume.id && !isGuestDraft ? (
                                    <CommentsPanel
                                        isOpen={true}
                                        onClose={onCloseComments}
                                        resumeId={resume.id}
                                        ownerId={currentUser.uid}
                                        currentUser={currentUser}
                                    />
                                ) : (
                                    <SignInToUsePanel
                                        title={t('editor.guest.feedback_panel_title')}
                                        body={t('editor.guest.feedback_panel_body')}
                                        onSignIn={() => onRequireSignIn?.('feedback')}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar Resize Handle (Desktop Only) */}
            <div
                className={`
                    hidden md:flex flex-col absolute top-1/2 -translate-y-1/2 z-30
                    shadow-md rounded-r-xl overflow-hidden border border-l-0 border-gray-200 dark:border-gray-700
                    transition-all duration-300 ease-in-out
                `}
                style={{ left: sidebarMode === 'closed' ? '0' : sidebarWidth }}
            >
                <button
                    onClick={() => onResizeSidebar('right')}
                    disabled={sidebarMode === 'expanded' || (sidebarMode === 'standard' && activeTab !== 'content')}
                    className={`
                        w-8 h-10 flex items-center justify-center
                        bg-white dark:bg-gray-800
                        text-gray-500 dark:text-gray-400
                        hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500
                        border-b border-gray-200 dark:border-gray-700
                        transition-colors
                    `}
                    title="Expand Content"
                >
                    <ChevronRight size={20} />
                </button>
                <button
                    onClick={() => onResizeSidebar('left')}
                    disabled={sidebarMode === 'closed'}
                    className={`
                        w-8 h-10 flex items-center justify-center
                        bg-white dark:bg-gray-800
                        text-gray-500 dark:text-gray-400
                        hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500
                        transition-colors
                    `}
                    title="Collapse Sidebar"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>
        </>
    );
};

export default EditorSidebar;
