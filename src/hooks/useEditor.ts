import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { useResumes } from '../hooks/useResumes';
import { ResumeData, TemplateInfo, ResumeMatchAnalysis } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../utils/navigation';
import { trackUsage } from '../services/trackingService';
import { translateResumeContent, duplicateAndTranslateResume } from '../services/translationService';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { playNotificationSound } from '../utils/notificationSound';
import { getLatestAnnotation, AnnotationObject, subscribeToAnnotations } from '../services/annotationService';
import { subscribeToComments, Comment } from '../services/commentService';
import { TEMPLATES } from '../templates';
import { createNewResume, createBlankResume } from '../constants';
import { auth, functions } from '../firebase';
import { resolveChunkFieldId } from '../utils/resumeTextChunks';
import { STRIPE_PRICE_IDS } from '../config/stripePrices';
import { User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getGoogleDriveAccessToken } from '../utils/googleDriveAuth';

interface UseEditorProps {
    resumeId?: string;
    initialData?: ResumeData;
    isShared?: boolean;
    onSharedUpdate?: (data: Partial<ResumeData>) => void;
    initialViewMode?: 'edit' | 'preview';
    initialActiveTab?: 'content' | 'template' | 'design' | 'comments' | 'score';
}

/**
 * The two editor routes that never touch Firestore.
 *
 * `/edit/new` starts a signed-out visitor on a blank draft; `/edit/guest` is
 * where that draft lives afterwards, and where the demo generator drops its
 * result. Neither one resolves a document by id, so a guest can never open
 * somebody else's resume.
 */
/**
 * The features that need a saved resume, as ids rather than display names, so
 * the prompt they raise can be translated like everything else.
 */
export type GuestGatedFeature =
    | 'sharing'
    | 'translation'
    | 'cover_letter'
    | 'tailor'
    | 'ai_review'
    | 'feedback'
    | 'score_panel';

export const GUEST_RESUME_STORAGE_KEY = 'guestResume';
const GUEST_ROUTE_IDS = ['guest', 'new'];
const isGuestRouteId = (id?: string) => Boolean(id && GUEST_ROUTE_IDS.includes(id));

const readGuestDraft = (): ResumeData | null => {
    try {
        const stored = localStorage.getItem(GUEST_RESUME_STORAGE_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return parsed && typeof parsed === 'object' ? (parsed as ResumeData) : null;
    } catch (e) {
        console.warn('Could not read the guest draft; starting a fresh one.', e);
        return null;
    }
};

const writeGuestDraft = (draft: ResumeData) => {
    try {
        localStorage.setItem(GUEST_RESUME_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
        if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            console.warn('Storage quota exceeded, clearing guestResume to free up space.');
            localStorage.removeItem(GUEST_RESUME_STORAGE_KEY);
        }
    }
};

const waitForNextPaint = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

const getVisibleResumeExportRoot = () => {
    const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-resume-export-root="true"]'));

    return roots.find((root) => {
        const rect = root.getBoundingClientRect();
        const styles = window.getComputedStyle(root);
        const hasRenderedContent = Boolean(root.textContent?.trim());

        return (
            rect.width > 100 &&
            rect.height > 100 &&
            styles.display !== 'none' &&
            styles.visibility !== 'hidden' &&
            hasRenderedContent
        );
    }) || null;
};

const waitForResumeExportRoot = async (timeoutMs = 8000) => {
    const startedAt = performance.now();

    while (performance.now() - startedAt < timeoutMs) {
        const root = getVisibleResumeExportRoot();
        if (root) return root;
        await waitForNextPaint();
    }

    return getVisibleResumeExportRoot();
};

export const useEditor = ({
    resumeId,
    initialData,
    isShared = false,
    onSharedUpdate,
    initialViewMode = 'edit',
    initialActiveTab = 'content'
}: UseEditorProps) => {
    // Hooks & Context
    const { getResumeById, updateResume, addBlankResume, isLoading: isResumeLoading } = useResumes();
    const { currentUser, userProfile, isPremium, loading: isAuthLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { t } = useTranslation();

    // State
    const [resume, setResume] = useState<ResumeData | null>(null);
    const [tempPhoto, setTempPhoto] = useState<string | null>(null);
    const [activeTemplate, setActiveTemplate] = useState<TemplateInfo>(TEMPLATES[0]);

    const [viewMode, setViewMode] = useState<'edit' | 'preview'>(initialViewMode);
    const [activeTab, setActiveTab] = useState<'content' | 'template' | 'design' | 'comments' | 'score'>(initialActiveTab);
    const [previousTab, setPreviousTab] = useState<'content' | 'template' | 'design'>('content');

    const [sidebarMode, setSidebarMode] = useState<'closed' | 'standard' | 'expanded'>('standard');
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

    // Modals & UI States
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    /*
     * Seeded from the route so the first paint of /edit/new or /edit/guest is
     * the editor, not the "resume not found for this account" screen.
     *
     * The route alone decides the FIRST paint, not the mode: the load effect
     * below turns this off the moment auth resolves to a signed-in user, and
     * `isGuestDraft` (which is what actually gates saving and every feature
     * wall) requires `!currentUser` on top of it. Deriving guest mode from the
     * URL alone sent a signed-in user's keystrokes to localStorage instead of
     * Firestore and showed them "sign in free" while they were signed in.
     */
    const [isGuestMode, setIsGuestMode] = useState(() => isGuestRouteId(resumeId) && !isShared);
    const [isTemplateLoading, setIsTemplateLoading] = useState(false);
    /*
     * A signed-in visitor on /edit/new has no document yet: we are either
     * creating one or waiting for useGuestDataMigration to save their draft and
     * navigate to it. Without this the editor would show "Resume not found for
     * this account" for the half second in between, which is both wrong and
     * alarming.
     */
    const [isPreparingResume, setIsPreparingResume] = useState(false);
    const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '' });
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [signupPrompt, setSignupPrompt] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: '',
        message: '',
    });
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isBuyingPdfCredit, setIsBuyingPdfCredit] = useState(false);
    const [exportProgress, setExportProgress] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isExportSuccessModalOpen, setIsExportSuccessModalOpen] = useState(false);
    const [exportedDocUrl, setExportedDocUrl] = useState('');
    const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
    const [translationSuccessModal, setTranslationSuccessModal] = useState<{
        isOpen: boolean;
        newResumeId: string;
    }>({ isOpen: false, newResumeId: '' });


    // Optimization & Preview States
    const [optimizationJob, setOptimizationJob] = useState<{ title: string; description: string; analysis?: ResumeMatchAnalysis } | null>(null);
    const [isPreviewBlurred, setIsPreviewBlurred] = useState(false);
    const [scale, setScale] = useState(1);
    const editorPreviewContainerRef = useRef<HTMLDivElement>(null);

    // Feedback & Collaboration
    const [hasAnnotations, setHasAnnotations] = useState(false);
    const [annotationUrl, setAnnotationUrl] = useState<string | null>(null);
    const [annotationObjects, setAnnotationObjects] = useState<AnnotationObject[]>([]);
    const [showAnnotationOverlay, setShowAnnotationOverlay] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [hasViewedFeedback, setHasViewedFeedback] = useState(false);
    const [lastFeedbackTimestamp, setLastFeedbackTimestamp] = useState<number>(0);
    const isInitialLoadRef = useRef(true);
    const guestDraftLoadedRef = useRef<string | null>(null);
    /** The uid we have already created a real document for, so we do it once. */
    const adoptedGuestRouteRef = useRef<string | null>(null);

    // Onboarding
    const [showGuideArrow, setShowGuideArrow] = useState(false);
    const [guideArrowShownCount, setGuideArrowShownCount] = useState(0);

    // Memoized Values
    const sampleResumeForPreview = useMemo(() => createNewResume(), []);
    const [verifiedDownloadCredits, setVerifiedDownloadCredits] = useState(0);
    const downloadCredits = Math.max(Number(userProfile?.downloadCredits || 0), verifiedDownloadCredits);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const pdfCreditStatus = params.get('pdfCredit');
        const sessionId = params.get('session_id');

        if (!pdfCreditStatus) return;

        if (pdfCreditStatus === 'success' && sessionId && !currentUser) return;

        const clearCheckoutParams = () => {
            params.delete('pdfCredit');
            params.delete('session_id');
            const query = params.toString();
            window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
        };

        if (pdfCreditStatus === 'success') {
            if (sessionId && currentUser) {
                setToastMessage('Payment received. Confirming your PDF credit...');
                const verifyCheckout = httpsCallable(functions, 'verifyPdfCreditCheckout');

                verifyCheckout({ sessionId })
                    .then((result: any) => {
                        const nextCredits = Number(result.data?.downloadCredits || 1);
                        setVerifiedDownloadCredits(Math.max(1, nextCredits));
                        setToastMessage(
                            result.data?.credited
                                ? 'PDF credit added. You can download your resume now.'
                                : 'PDF credit already applied. You can download your resume now.'
                        );
                    })
                    .catch((error) => {
                        console.error('PDF credit verification failed:', error);
                        setToastMessage('Payment received. Your PDF credit is still syncing; try again in a moment.');
                    });
            } else {
                setToastMessage('Checkout complete. Your PDF credit is being added; try download in a moment.');
            }
        } else if (pdfCreditStatus === 'cancelled') {
            setToastMessage('PDF credit checkout cancelled.');
        }

        clearCheckoutParams();
    }, [currentUser]);

    const sidebarWidth = useMemo(() => {
        if (!isDesktop) return '100%';
        switch (sidebarMode) {
            case 'closed': return '0px';
            case 'expanded': return 'calc(100% - 2rem)';
            default: return '520px';
        }
    }, [isDesktop, sidebarMode]);

    // Handlers
    const handleResumeChange = useCallback((updatedData: Partial<ResumeData>) => {
        if (resume) {
            if (updatedData.personalDetails?.photo && updatedData.personalDetails.photo !== resume.personalDetails.photo) {
                setTempPhoto(null);
            }
            const newResumeState = { ...resume, ...updatedData };
            setResume(newResumeState);

            if (isShared && onSharedUpdate) {
                onSharedUpdate(updatedData);
            } else if (isGuestMode && !currentUser) {
                // The browser is the only place this draft exists. A signed-in
                // user never takes this branch, even on /edit/new — their
                // keystrokes have an account to go to.
                writeGuestDraft(newResumeState);
            } else if (!isGuestMode) {
                updateResume(resume.id, updatedData);
            }
        }
    }, [resume, updateResume, isGuestMode, isShared, onSharedUpdate, currentUser]);

    const handleDesignChange = (updatedData: Partial<ResumeData>) => handleResumeChange(updatedData);

    const handleSidebarResize = (direction: 'left' | 'right') => {
        if (direction === 'left') {
            if (sidebarMode === 'expanded') setSidebarMode('standard');
            else if (sidebarMode === 'standard') setSidebarMode('closed');
        } else {
            if (sidebarMode === 'closed') setSidebarMode('standard');
            else if (sidebarMode === 'standard' && activeTab === 'content') setSidebarMode('expanded');
        }
    };

    const handleFocusField = useCallback((fieldId: string) => {
        setActiveTab('content');
        if (isDesktop && sidebarMode === 'closed') setSidebarMode('standard');
        if (!isDesktop && viewMode === 'preview') setViewMode('edit');
        setTimeout(() => {
            const { baseFieldId, formFieldId } = resolveChunkFieldId(fieldId);
            const exactElement = document.getElementById(formFieldId) ||
                document.getElementById(baseFieldId) ||
                document.getElementById(`${baseFieldId}.chunk.0`);
            const container = document.getElementById(`container-${baseFieldId}`);
            const element = exactElement || container?.querySelector<HTMLElement>('textarea, input, select, button, [tabindex]:not([tabindex="-1"])');
            const scrollTarget = element || container;

            if (scrollTarget) {
                scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            if (element) {
                element.focus({ preventScroll: true });
                element.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2', 'bg-primary-50', 'dark:bg-primary-900/20');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2', 'bg-primary-50', 'dark:bg-primary-900/20');
                }, 2000);
            }
        }, 300);
    }, [isDesktop, sidebarMode, viewMode]);

    const handleTemplateSelect = (template: TemplateInfo) => {
        if (activeTemplate.id === template.id) return;
        setIsTemplateLoading(true);
        setActiveTemplate(template);
        const updates: Partial<ResumeData> = { templateId: template.id };
        if (!template.availableColors.includes(resume?.themeColor || '')) {
            updates.themeColor = template.availableColors[0];
        }
        handleResumeChange(updates);
        setTimeout(() => setIsTemplateLoading(false), 400);
    };

    const closeSignupPrompt = useCallback(() => {
        setSignupPrompt({ isOpen: false, title: '', message: '' });
    }, []);

    /**
     * Ask the visitor to sign in, and say what for.
     *
     * The old gate showed one generic wall for every blocked action, which read
     * as "we want your email" rather than "this genuinely cannot run without an
     * account". Callers pass the real reason instead.
     */
    const promptSignIn = useCallback((title?: string, message?: string) => {
        setSignupPrompt({
            isOpen: true,
            title: title || t('editor.signup_prompt_title'),
            message: message || t('editor.signup_prompt_msg'),
        });
    }, [t]);

    /*
     * A local-only draft: no account to save it to, and no document id for any
     * Cloud Function to read. Signed in is signed in even on /edit/new, so the
     * auth check belongs here rather than only in the effect that sets the mode
     * — this value gates every save path and every feature wall.
     */
    const isGuestDraft = isGuestMode && !isShared && !currentUser;

    /** Returns true (and prompts) when the action needs a signed-in account. */
    const requireAccount = useCallback((title?: string, message?: string) => {
        if (isGuestDraft) {
            promptSignIn(title, message);
            return true;
        }
        return false;
    }, [isGuestDraft, promptSignIn]);

    /**
     * Prompt for a feature whose Cloud Function resolves the resume from the
     * caller's uid — it has no document to read for an unsaved local draft.
     *
     * Takes a feature *id*, not a display name. The previous version built
     * `Sign in to use ${featureName}` out of an English literal passed in by
     * the caller, which is untranslatable by construction — and this is the
     * handler behind sharing, translation, AI Tailor, the cover letter, AI
     * Review and feedback, on routes that are served with a language prefix
     * (/es/edit/guest). The id picks the translated name out of the same
     * bundle as the sentence around it.
     */
    const promptSignInFor = useCallback((feature: GuestGatedFeature) => {
        promptSignIn(
            t('editor.guest.gate_title', { feature: t(`editor.guest.feature_${feature}`) }),
            t('editor.guest.gate_msg'),
        );
    }, [promptSignIn, t]);

    const requireAccountFor = useCallback((feature: GuestGatedFeature) => {
        if (isGuestDraft) {
            promptSignInFor(feature);
            return true;
        }
        return false;
    }, [isGuestDraft, promptSignInFor]);

    const handleShare = useCallback(() => {
        if (requireAccountFor('sharing')) return;
        setIsShareModalOpen(true);
    }, [requireAccountFor]);

    const handleBuyOneTimePdfCredit = useCallback(async () => {
        if (!currentUser) {
            promptSignIn();
            return;
        }

        if (!resume?.id) return;

        setIsBuyingPdfCredit(true);

        try {
            const priceId = STRIPE_PRICE_IDS.DOWNLOAD_ONCE;
            await trackUsage(currentUser.uid, 'checkout_session_start', {
                priceId,
                purchaseType: 'pdf_download_credit',
                resumeId: resume.id,
            });

            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
            const returnUrl = `${window.location.origin}/edit/${resume.id}`;
            const result: any = await createCheckoutSession({
                priceId,
                quantity: 1,
                mode: 'payment',
                successUrl: `${returnUrl}?pdfCredit=success&session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${returnUrl}?pdfCredit=cancelled`,
                metadata: {
                    purchaseType: 'pdf_download_credit',
                    resumeId: resume.id,
                },
            });

            if (result.data?.url) {
                window.location.href = result.data.url;
                return;
            }

            throw new Error('No checkout URL returned');
        } catch (error: any) {
            console.error("PDF credit checkout failed:", error);
            setAlertState({
                isOpen: true,
                title: 'Checkout unavailable',
                message: 'We could not open checkout for the one-time PDF download. Please try again.',
            });
        } finally {
            setIsBuyingPdfCredit(false);
        }
    }, [currentUser, resume, promptSignIn]);

    const handleExport = async (optionId: string) => {
        if (!resume) return;
        // PDF is the one export a guest can genuinely complete in the browser.
        if (optionId !== 'pdf' && requireAccount()) return;

        setIsExporting(true);
        const formatName = optionId;
        setExportProgress(t('editor.generating', { format: formatName }));

        // A signed-out visitor's PDF is rasterised in the browser (see the
        // html2canvas branch below), so it costs us nothing to render — charging
        // for it would be a paywall in front of an image.
        //
        // `!currentUser` is load-bearing, not belt-and-braces: a signed-in user
        // sitting on /edit/guest still satisfies `canUseBackend`, so without it
        // they would take the paid puppeteer renderer for free.
        const isGuestPdf = isGuestDraft && !currentUser && optionId === 'pdf';

        try {
            const canUseDownloadCredit = !isShared && downloadCredits > 0;
            if (optionId === 'pdf' && !isPremium && !canUseDownloadCredit && !isGuestPdf) {
                setIsExporting(false);
                setIsUpgradeModalOpen(true);
                return;
            }
            const canUseBackend = currentUser && !isShared;
            if (optionId === 'pdf' && canUseBackend) {
                const token = await currentUser.getIdToken();
                const projectId = 'jastalk-firebase';
                const functionUrl = `https://us-west1-${projectId}.cloudfunctions.net/generateResumePdfHttp`;
                const response = await fetch(functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ resumeData: resume, templateId: resume.templateId }) });
                if (!response.ok) throw new Error(`Backend generation failed.`);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${resume.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                if (canUseDownloadCredit) {
                    setVerifiedDownloadCredits((current) => Math.max(0, current - 1));
                }
                if (!isGuestMode && !isShared) setIsFeedbackModalOpen(true);
            } else {
                if (optionId === 'pdf') {
                    setViewMode('preview');
                }

                const elementToCapture = await waitForResumeExportRoot();
                if (!elementToCapture) throw new Error("Preview element not found");
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(elementToCapture, {
                    scale: 3,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    windowWidth: elementToCapture.scrollWidth,
                    windowHeight: elementToCapture.scrollHeight
                });

                if (optionId === 'pdf') {
                    const { jsPDF } = await import('jspdf');
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const imgProps = pdf.getImageProperties(imgData);
                    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                    pdf.save(`${resume.title}.pdf`);
                    if (isGuestPdf) {
                        // Say what they actually got. This path pastes a picture of
                        // the resume into a PDF: no selectable text, so no applicant
                        // tracking system can read a word of it.
                        setToastMessage(t('editor.guest.pdf_image_toast'));
                    }
                } else {
                    const dataUrl = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = `${resume.title}.png`;
                    link.href = dataUrl;
                    link.click();
                }
            }

            if (currentUser) {
                trackUsage(currentUser.uid, 'resume_download', { format: formatName });
            }
        } catch (error: any) {
            console.error("Export failed:", error);
            setAlertState({ isOpen: true, title: t('editor.export_failed'), message: t('editor.export_failed_msg') });
        } finally {
            setIsExporting(false);
        setExportProgress('');
        }
    };

    const handleTranslateResume = async (targetLanguageCode: string) => {
        if (!resume) return;
        // Translation duplicates the stored document into a second resume, so
        // there has to be a stored document first.
        if (requireAccountFor('translation')) return;
        setIsTranslating(true);
        try {
            const newResumeId = await duplicateAndTranslateResume(resume.id!, targetLanguageCode);
            setTranslationSuccessModal({ isOpen: true, newResumeId });
        } catch (error: any) {
            console.error('Translation failed:', error);
            setAlertState({ isOpen: true, title: t('editor.translation_failed'), message: error.message || 'Failed' });
        } finally {
            setIsTranslating(false);
        }
    };

    const getGoogleDocExportUrl = (docUrl: string) => {
        const docId = docUrl.match(/\/document\/d\/([^/?#]+)/)?.[1];
        return docId ? `https://docs.google.com/document/d/${docId}/export?format=docx` : '';
    };

    const triggerDownloadUrl = (url: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openGoogleDocsExportTab = () => {
        const exportTab = window.open('', '_blank');
        if (!exportTab) return null;
        exportTab.opener = null;
        exportTab.document.title = 'Preparing Google Doc...';
        exportTab.document.body.innerHTML = `
            <main style="font-family: Inter, Arial, sans-serif; display: grid; min-height: 100vh; place-items: center; margin: 0; color: #111827; background-color: #f9fafb;">
                <div style="text-align: center; padding: 24px;">
                    <div style="margin-bottom: 20px; display: inline-block; width: 48px; height: 48px; border: 4px solid #3b82f6; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
                    <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 8px; color: #1f2937;">Preparing your Google Doc...</h1>
                    <p style="color: #6b7280; font-size: 15px; margin: 0; max-width: 320px; line-height: 1.5;">We are generating your resume document. This page will automatically redirect once it is ready.</p>
                </div>
                <style>
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            </main>
        `;
        return exportTab;
    };

    const isGoogleDocUrl = (url: string) => {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname === 'docs.google.com' && parsedUrl.pathname.startsWith('/document/d/');
        } catch {
            return false;
        }
    };

    const getExportUser = async () => {
        if (currentUser?.email) return currentUser;
        if (auth.currentUser?.email) return auth.currentUser;

        try {
            await (auth as any).authStateReady?.();
        } catch (error) {
            console.warn("Firebase auth state was not ready for export:", error);
        }

        return auth.currentUser?.email ? auth.currentUser : null;
    };

    const openGeneratedGoogleDoc = (docUrl: string, exportTab: Window | null) => {
        if (!isGoogleDocUrl(docUrl)) {
            exportTab?.close();
            throw new Error("Google Docs export finished, but the returned document link was invalid.");
        }
        if (exportTab && !exportTab.closed) {
            exportTab.location.href = docUrl;
            return;
        }
        window.open(docUrl, '_blank', 'noopener,noreferrer');
    };

    const handleGoogleDocsExport = async (format: 'google-docs' | 'docx' = 'google-docs') => {
        if (!resume) return;
        // Both of these build the file inside the user's own Google Drive
        // (functions/src/googleDocs.ts needs a Drive OAuth access token), so
        // there is no signed-out version of them to offer.
        if (requireAccount(
            t('editor.guest.docs_title'),
            format === 'docx' ? t('editor.guest.docs_msg_docx') : t('editor.guest.docs_msg_gdoc'),
        )) return;

        const exportUser = await getExportUser();

        if (!exportUser || !exportUser.email) {
            setAlertState({ isOpen: true, title: "Export Failed", message: "Please sign in before exporting your resume." });
            return;
        }

        setIsExporting(true);
        setExportProgress(format === 'docx' ? "Preparing Word document..." : "Preparing Google Doc...");

        let exportTab: Window | null = null;
        const cacheKey = `gdoc_access_token_${exportUser.uid}`;
        let tokenToUse = googleAccessToken;
        let isPreAuthorized = false;

        // Try to retrieve a valid cached token from sessionStorage if React state is empty
        if (!tokenToUse) {
            try {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const { token, expiresAt } = JSON.parse(cached);
                    if (expiresAt > Date.now() + 60000) { // 1 minute safety buffer
                        tokenToUse = token;
                        setGoogleAccessToken(token);
                        isPreAuthorized = true;
                    }
                }
            } catch (e) {
                console.warn("Failed to retrieve cached Google token:", e);
            }
        } else {
            isPreAuthorized = true;
        }

        try {
            // 1. If we don't have the Google access token yet, request it first.
            // We do NOT open the exportTab yet, to prevent the browser from seeing two popups (Auth popup + exportTab)
            // in the same click handler and triggering the popup blocker.
            if (!tokenToUse) {
                setExportProgress("Choose a Google account for Drive access...");
                const accessToken = await getGoogleDriveAccessToken(exportUser, auth, 'gdoc-export');
                tokenToUse = accessToken;
                setGoogleAccessToken(accessToken);

                // Cache the token in sessionStorage (valid for ~1 hour)
                try {
                    const expiresAt = Date.now() + 3500 * 1000;
                    sessionStorage.setItem(cacheKey, JSON.stringify({ token: accessToken, expiresAt }));
                } catch (e) {
                    console.error("Failed to cache Google token:", e);
                }
            }

            // 2. Now that we have the access token:
            // - If this was a subsequent export (token was already cached), we can open the exportTab immediately
            //   since no Auth popup was triggered. This is 100% blocker-free!
            // - If this was the first export (just finished Auth popup), opening a new tab programmatically now
            //   might be blocked by browser popup blockers since it's inside an async promise chain.
            //   So we only attempt exportTab if the token was already cached. Otherwise, we rely on the modal!
            if (format === 'google-docs' && isPreAuthorized) {
                exportTab = openGoogleDocsExportTab();
            }

            setExportProgress(format === 'docx' ? "Generating Word document..." : "Generating Google Doc...");
            const exportFn = httpsCallable(functions, 'exportToGoogleDocs');
            const response = await exportFn({ resumeData: resume, accessToken: tokenToUse });
            const { docUrl } = response.data as any;

            if (format === 'docx') {
                const docxUrl = getGoogleDocExportUrl(docUrl);
                if (!docxUrl) throw new Error("Could not create the Word document download link.");

                triggerDownloadUrl(docxUrl, `${resume.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
                setToastMessage("Word document download started.");
            } else {
                if (isPreAuthorized && exportTab) {
                    openGeneratedGoogleDoc(docUrl, exportTab);
                    setToastMessage("Google Doc opened in new tab.");
                } else {
                    setExportedDocUrl(docUrl);
                    setIsExportSuccessModalOpen(true);
                    setToastMessage("Resume exported to Google Docs.");
                }
            }

            trackUsage(exportUser.uid, 'resume_download', { format });
        } catch (error: any) {
            console.error("Google Docs Export Failed:", error);
            if (exportTab) {
                try { exportTab.close(); } catch (e) {}
            }

            if (error.code === 'auth/popup-closed-by-user') {
                setToastMessage("Export cancelled.");
            } else if (error.code === 'auth/credential-already-in-use' || error.code === 'auth/account-exists-with-different-credential') {
                setAlertState({
                    isOpen: true,
                    title: "Google Docs Export Failed",
                    message: "That Google account could not be authorized for Drive from this session. Please choose another Google account for Docs access, or sign in to CareerVivid with that Google account and try again."
                });
            } else if (error.code === 'auth/user-mismatch') {
                setAlertState({
                    isOpen: true,
                    title: "Google Docs Export Failed",
                    message: "Please choose a Google account with Drive access and try again."
                });
            } else {
                setAlertState({ isOpen: true, title: "Export Failed", message: error.message || "Could not connect to Google Drive. Please try again." });
            }
        } finally {
            setIsExporting(false);
            setExportProgress('');
        }
    };

    const toggleFeedbackOverlay = () => {
        // Closing never needs an account — do it before any guard, or a guest who
        // somehow opened the overlay could not shut it again.
        if (showAnnotationOverlay) {
            setShowAnnotationOverlay(false);
            setActiveTab(previousTab);
            return;
        }

        // Comments and annotations are stored under the owner's uid alongside the
        // saved resume; an unsaved local draft has neither.
        if (!currentUser || !resume?.id || isGuestDraft) {
            promptSignIn(
                t('editor.guest.feedback_title'),
                t('editor.guest.feedback_msg'),
            );
            return;
        }

        setShowAnnotationOverlay(true);
        if (activeTab !== 'comments') setPreviousTab(activeTab as 'content' | 'template' | 'design');
        setSidebarMode('standard');
        setActiveTab('comments');
        setHasViewedFeedback(true);
        const storageKey = `feedback_viewed_${currentUser.uid}_${resume.id}`;
        const currentTimestamp = Date.now();
        setLastFeedbackTimestamp(currentTimestamp);
        try {
            localStorage.setItem(storageKey, JSON.stringify({ viewed: true, timestamp: currentTimestamp }));
        } catch (e) {
            // Ignore storage errors for view tracking
        }
    };

    const closeComments = () => {
        setActiveTab(previousTab);
        setShowAnnotationOverlay(false);
    }

    const handleConfirmNew = () => { setIsConfirmModalOpen(false); navigate('/newresume'); };

    // Layout Effects
    useLayoutEffect(() => {
        const simpleCalculateScale = () => {
            const sideWidth = isDesktop && sidebarMode !== 'closed' ? (sidebarMode === 'expanded' ? window.innerWidth - 32 : 520) : 0;
            const available = window.innerWidth - sideWidth;
            const originalWidth = 794;
            if (available < originalWidth + 64) {
                setScale(Math.max(0.3, (available - 48) / originalWidth));
            } else {
                setScale(1);
            }
        }
        simpleCalculateScale();
        window.addEventListener('resize', simpleCalculateScale);
        const timeout = setTimeout(simpleCalculateScale, 300);
        return () => {
            window.removeEventListener('resize', simpleCalculateScale);
            clearTimeout(timeout);
        };
    }, [sidebarMode, viewMode, isDesktop, sidebarWidth]);

    // Effects
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => { setViewMode(initialViewMode); }, [initialViewMode]);
    useEffect(() => { setActiveTab(initialActiveTab); }, [initialActiveTab]);
    useEffect(() => {
        if (activeTab !== 'content' && sidebarMode === 'expanded') setSidebarMode('standard');
    }, [activeTab, sidebarMode]);

    useEffect(() => {
        if (!isShared && sessionStorage.getItem('isFirstResume') === 'true') {
            setShowCelebration(true);
            sessionStorage.removeItem('isFirstResume');
            setTimeout(() => setShowCelebration(false), 4000);
        }
        const jobDesc = sessionStorage.getItem('jobDescriptionForOptimization');
        const jobTitle = sessionStorage.getItem('jobTitleForOptimization');
        const jobAnalysisStr = sessionStorage.getItem('jobMatchAnalysis');
        let jobAnalysis: ResumeMatchAnalysis | undefined;
        if (jobAnalysisStr) {
            try { jobAnalysis = JSON.parse(jobAnalysisStr); } catch (e) { console.error('Failed to parse match analysis', e); }
        }
        if (jobDesc && jobTitle) {
            setOptimizationJob({ title: jobTitle, description: jobDesc, analysis: jobAnalysis });
        }
    }, [isShared]);

    useEffect(() => {
        const arrowCount = localStorage.getItem('guideArrowShownCount');
        if (arrowCount) setGuideArrowShownCount(parseInt(arrowCount, 10));
    }, []);

    useEffect(() => {
        if (activeTab !== 'content' && guideArrowShownCount < 2 && !isShared) {
            setShowGuideArrow(true);
            const newCount = guideArrowShownCount + 1;
            setGuideArrowShownCount(newCount);
            try {
                localStorage.setItem('guideArrowShownCount', newCount.toString());
            } catch (e) {
                // Ignore storage errors for UI hints
            }
            const timer = setTimeout(() => setShowGuideArrow(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [activeTab, guideArrowShownCount, isShared]);

    useEffect(() => {
        if (isShared && initialData) {
            setResume(initialData);
            setActiveTemplate(TEMPLATES.find(t => t.id === initialData.templateId) || TEMPLATES[0]);
            setIsGuestMode(false);
            return;
        }
        if (isGuestRouteId(resumeId)) {
            // Until auth resolves we do not know which of the two branches below
            // applies, and guessing wrong writes a signed-in user's work into
            // localStorage.
            if (isAuthLoading) return;

            /*
             * Signed in on a guest route: give them a real document.
             *
             * /edit/new is a public URL — it is where /resume-builder and
             * /resume-templates 301 to, and it is in the sitemap — so signed-in
             * people land on it too, from a bookmark, a marketing link or the
             * back button. Left in guest mode they would type into localStorage
             * while every button told them to sign in.
             */
            if (currentUser) {
                setIsGuestMode(false);
                // A draft left over from before they signed in belongs to
                // useGuestDataMigration, which saves it and navigates to the
                // saved copy. Creating a document here as well would give them
                // two of the same resume.
                setIsPreparingResume(true);
                if (readGuestDraft()) return;
                if (isResumeLoading) return;
                if (adoptedGuestRouteRef.current === currentUser.uid) return;
                adoptedGuestRouteRef.current = currentUser.uid;

                void (async () => {
                    // Navigates to /edit/{id} on success, and alerts without
                    // navigating when the account is at its resume limit — in
                    // which case the dashboard is the only place left to go.
                    await addBlankResume();
                    if (typeof window !== 'undefined' && /\/edit\/(guest|new)(\/|$)/.test(window.location.pathname)) {
                        navigate('/dashboard');
                    }
                    setIsPreparingResume(false);
                })();
                return;
            }

            setIsGuestMode(true);

            // Load the draft once per route. This effect also re-runs when the
            // resume subscription settles, and re-reading localStorage then
            // would throw away whatever the guest has typed since.
            if (guestDraftLoadedRef.current === resumeId) return;
            guestDraftLoadedRef.current = resumeId ?? null;

            /*
             * No id, no Firestore read: the draft is whatever this browser has,
             * and a blank one if it has nothing. `/edit/new` used to be the only
             * way in and bounced empty-handed visitors to /demo; now it starts
             * them writing instead.
             *
             * The blank one is NOT written to localStorage. It used to be, and
             * an untouched blank draft is indistinguishable from real work to
             * useGuestDataMigration, so someone who opened the editor, typed
             * nothing and signed up a week later got an empty "Untitled Resume"
             * imported into their account — which on the free tier is the one
             * resume slot they had. The first real edit persists it
             * (handleResumeChange), and nothing before that is worth keeping.
             */
            let draft = readGuestDraft();
            if (!draft) {
                draft = { ...createBlankResume(), id: 'guest' };
            }

            setResume(draft);
            setActiveTemplate(TEMPLATES.find(t => t.id === draft!.templateId) || TEMPLATES[0]);

            // Park the tab on /edit/guest so a reload reopens the same draft
            // rather than asking for another new one. replaceState keeps the
            // editor mounted; navigate() would tear it down mid-edit.
            if (resumeId === 'new' && typeof window !== 'undefined') {
                // Keep any language prefix; only the /edit/new segment changes.
                const guestPath = window.location.pathname.replace(/\/edit\/new(?=\/|$)/, '/edit/guest');
                if (guestPath !== window.location.pathname) {
                    window.history.replaceState(null, '', `${guestPath}${window.location.search}${window.location.hash}`);
                }
            }
            return;
        }
        setIsGuestMode(false);
        if (!isResumeLoading && resumeId) {
            const loadedResume = getResumeById(resumeId);
            if (loadedResume) {
                setResume(loadedResume);
                setActiveTemplate(TEMPLATES.find(t => t.id === loadedResume.templateId) || TEMPLATES[0]);
            }
        }
    }, [resumeId, getResumeById, isResumeLoading, isShared, initialData, currentUser, isAuthLoading, addBlankResume]);

    useEffect(() => { setTempPhoto(null); }, [resumeId]);

    useEffect(() => {
        if (resume && activeTemplate && !activeTemplate.availableColors.includes(resume.themeColor)) {
            const defaultColor = activeTemplate.availableColors[0];
            handleResumeChange({ themeColor: defaultColor });
        }
    }, [activeTemplate, resume?.themeColor]);

    useEffect(() => {
        if (!resume || !resume.id || !currentUser || isShared || isGuestMode) {
            setHasAnnotations(false);
            setAnnotationUrl(null);
            return;
        }
        const storageKey = `feedback_viewed_${currentUser.uid}_${resume.id}`;
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
            try {
                const { viewed, timestamp } = JSON.parse(storedData);
                setHasViewedFeedback(viewed);
                setLastFeedbackTimestamp(timestamp);
            } catch (e) { console.error(e); }
        }
        const unsubscribeComments = subscribeToComments(currentUser.uid, resume.id!, (newComments) => {
            if (!isInitialLoadRef.current && newComments.length > comments.length && newComments[0].userId !== currentUser.uid && (newComments[0].createdAt?.toMillis() || Date.now()) > lastFeedbackTimestamp) {
                setToastMessage(`New feedback received from ${newComments[0].author}`);
                playNotificationSound();
                if (!showAnnotationOverlay) {
                    setHasViewedFeedback(false);
                    localStorage.removeItem(storageKey);
                }
            }
            setComments(newComments);
        });
        const unsubscribeAnnotations = subscribeToAnnotations(currentUser.uid, resume.id!, (annotation) => {
            if (annotation) {
                setHasAnnotations(true);
                setAnnotationUrl(annotation.imageUrl);
                setAnnotationObjects(annotation.objects || []);
                if (!isInitialLoadRef.current && !hasAnnotations && (annotation.createdAt?.toMillis() || Date.now()) > lastFeedbackTimestamp) {
                    setToastMessage(`New annotation received from ${annotation.author || 'Reviewer'}`);
                    playNotificationSound();
                    if (!showAnnotationOverlay) {
                        setHasViewedFeedback(false);
                        localStorage.removeItem(storageKey);
                    }
                }
            } else {
                setHasAnnotations(false);
                setAnnotationUrl(null);
                setAnnotationObjects([]);
            }
        });
        setTimeout(() => { isInitialLoadRef.current = false; }, 1000);
        return () => { unsubscribeComments(); unsubscribeAnnotations(); };
    }, [resume, currentUser, isShared, isGuestMode, hasAnnotations, comments.length]);

    return {
        currentUser,
        isPremium,
        theme,
        toggleTheme,
        t,
        resume,
        tempPhoto,
        setTempPhoto,
        activeTemplate,
        viewMode,
        setViewMode,
        activeTab,
        setActiveTab,
        sidebarMode,
        // Exposed so the preview's own view switch can set the matching layout
        // — see `handleReviewModeChange` in Editor.tsx.
        setSidebarMode,
        isDesktop,
        isConfirmModalOpen,
        setIsConfirmModalOpen,
        showCelebration,
        isGuestMode,
        isGuestDraft,
        isResumeLoading,
        isPreparingResume,
        isTemplateLoading,
        alertState,
        setAlertState,
        isFeedbackModalOpen,
        setIsFeedbackModalOpen,
        signupPrompt,
        closeSignupPrompt,
        promptSignIn,
        promptSignInFor,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        isExporting,
        isBuyingPdfCredit,
        downloadCredits,
        exportProgress,
        isTranslating,
        optimizationJob,
        setOptimizationJob,
        isPreviewBlurred,
        scale,
        hasAnnotations,
        annotationUrl,
        annotationObjects,
        showAnnotationOverlay,
        isShareModalOpen,
        setIsShareModalOpen,
        handleShare,
        comments,
        toastMessage,
        setToastMessage,
        hasViewedFeedback,
        showGuideArrow,
        setShowGuideArrow,
        sampleResumeForPreview,
        sidebarWidth,
        handleResumeChange,
        handleDesignChange,
        handleSidebarResize,
        handleFocusField,
        handleTemplateSelect,
        handleExport,
        handleBuyOneTimePdfCredit,
        handleTranslateResume,
        handleGoogleDocsExport,
        toggleFeedbackOverlay,
        closeComments,
        handleConfirmNew,
        updateResume,
        isExportSuccessModalOpen,
        setIsExportSuccessModalOpen,
        exportedDocUrl,
        translationSuccessModal,
        setTranslationSuccessModal
    };
};
