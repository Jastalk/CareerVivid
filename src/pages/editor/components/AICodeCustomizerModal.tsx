import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    X, Code2, Loader2, Check, RotateCcw, Wand2, Zap, Sparkles,
    Lightbulb, Trash2, Copy, ChevronRight
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { ResumeData } from '@/types';
import { describeCustomCssRejection, sanitizeCustomCss } from '@/utils/sanitizeCustomCss';

interface AICodeCustomizerModalProps {
    isOpen: boolean;
    onClose: () => void;
    resume: ResumeData;
    onResumeChange: (updates: Partial<ResumeData>) => void;
    theme?: string;
}

const QUICK_STYLE_PROMPTS = [
    { icon: '🎨', label: 'Gradient Heading', prompt: 'Make all section headings a purple-to-indigo gradient text' },
    { icon: '✨', label: 'Fade-in Animation', prompt: 'Add a subtle fade-in animation to each section when it appears' },
    { icon: '📐', label: 'Left Accent Border', prompt: 'Add a thin colored left border accent to each section heading' },
    { icon: '🔵', label: 'Rounded Pills', prompt: 'Make skill tags and badges use fully rounded pill shapes with a soft background' },
    { icon: '📝', label: 'Larger Name', prompt: 'Increase the candidate name font size to 40px and make it bold' },
    { icon: '🌙', label: 'Subtle Shadow', prompt: 'Add a very subtle drop shadow to the name and section headings' },
    { icon: '🔤', label: 'Tighter Spacing', prompt: 'Reduce letter-spacing on headings to -0.5px for a premium editorial look' },
    { icon: '🗑️', label: 'Remove All CSS', prompt: 'Reset — remove all custom CSS and return to default template styling' },
];

const AICodeCustomizerModal: React.FC<AICodeCustomizerModalProps> = ({
    isOpen, onClose, resume, onResumeChange, theme
}) => {
    const [instruction, setInstruction] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processMessage, setProcessMessage] = useState('');
    const [generatedCss, setGeneratedCss] = useState('');
    const [aiSummary, setAiSummary] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isApplied, setIsApplied] = useState(false);

    const currentCss = resume.customCss || '';
    const isDark = theme === 'dark';

    /*
     * What the preview will actually do with this.
     *
     * The preview sanitizes before injecting, and the model is not told to
     * avoid `url()` — so "generated fine, applied fine, nothing changed on the
     * page" was a normal outcome with nothing on screen to explain it. Whatever
     * the sanitizer would drop is named here, before Apply, rather than
     * disappearing silently afterwards.
     */
    const cssNotice = React.useMemo(
        () => describeCustomCssRejection(sanitizeCustomCss(generatedCss)),
        [generatedCss],
    );

    useEffect(() => {
        if (!isOpen) {
            setInstruction('');
            setGeneratedCss('');
            setAiSummary('');
            setErrorMessage('');
            setIsApplied(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!instruction.trim()) return;
        setIsProcessing(true);
        setErrorMessage('');
        setIsApplied(false);
        setProcessMessage('Generating CSS…');

        try {
            const generateFn = httpsCallable(functions, 'generateResumeCSS');
            const result = await generateFn({
                instruction,
                templateId: resume.templateId,
                currentCss,
                themeColor: resume.themeColor,
            });

            const data = result.data as {
                success: boolean;
                css: string;
                summary: string;
                animationName?: string;
            };

            if (data.success) {
                setGeneratedCss(data.css);
                setAiSummary(data.summary);
            } else {
                throw new Error('Generation failed');
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'An error occurred. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApply = () => {
        onResumeChange({ customCss: generatedCss });
        setIsApplied(true);
    };

    const handleAppendToExisting = () => {
        const combined = currentCss ? `${currentCss}\n\n/* AI Generated */\n${generatedCss}` : generatedCss;
        onResumeChange({ customCss: combined });
        setIsApplied(true);
    };

    const handleReset = () => {
        onResumeChange({ customCss: '' });
        setGeneratedCss('');
        setAiSummary('');
        setIsApplied(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCss);
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className={`
                relative w-full max-w-3xl flex flex-col rounded-2xl shadow-2xl
                h-[85vh] overflow-hidden
                ${isDark ? 'bg-[#0f1117] text-gray-200 border border-white/10' : 'bg-white text-gray-900'}
            `}>
                {/* ── Header ── */}
                <header className={`flex-shrink-0 flex items-center justify-between px-6 py-4 border-b
                    ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="bg-violet-100 dark:bg-violet-900/40 p-2 rounded-xl">
                            <Code2 className="text-violet-600 dark:text-violet-400" size={22} />
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                AI Code Customizer
                            </h2>
                            <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Powered by Gemini 2.5 Flash <Zap size={10} className="text-yellow-400 fill-yellow-400" />
                                <span className="ml-1 px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] font-semibold">Code Model</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Quick Style Chips */}
                    <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Quick Styles
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_STYLE_PROMPTS.map((q) => (
                                <button
                                    key={q.label}
                                    onClick={() => setInstruction(q.prompt)}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                                        border transition-all hover:scale-105
                                        ${isDark
                                            ? 'bg-white/5 border-white/10 text-gray-300 hover:border-violet-500 hover:text-violet-400'
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50'
                                        }
                                    `}
                                >
                                    <span>{q.icon}</span> {q.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Instruction Input */}
                    <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Describe your styling change
                        </p>
                        <div className="relative">
                            <textarea
                                className={`
                                    w-full p-4 pr-12 text-sm rounded-xl border-2 border-dashed resize-none
                                    focus:outline-none focus:border-violet-500 transition-all
                                    ${isDark ? 'bg-white/5 border-white/10 text-gray-100' : 'bg-gray-50 border-gray-300 text-gray-800'}
                                `}
                                rows={3}
                                placeholder={'e.g. "Add a fade-in animation to each section"\ne.g. "Make section headings purple gradient text"\ne.g. "Increase button size and add rounded corners"'}
                                value={instruction}
                                onChange={(e) => setInstruction(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
                                }}
                            />
                            <span className={`absolute bottom-3 right-3 text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                ⌘↵
                            </span>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={!instruction.trim() || isProcessing}
                        className={`
                            w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                            transition-all shadow-lg
                            ${(!instruction.trim() || isProcessing)
                                ? 'bg-violet-300 cursor-not-allowed text-white'
                                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/30 hover:-translate-y-0.5'
                            }
                        `}
                    >
                        {isProcessing
                            ? <><Loader2 size={16} className="animate-spin" /> {processMessage}</>
                            : <><Wand2 size={16} /> Generate CSS <ChevronRight size={14} /></>
                        }
                    </button>

                    {/* Error */}
                    {errorMessage && (
                        <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                            {errorMessage}
                        </div>
                    )}

                    {/* What the preview will drop, and why */}
                    {cssNotice && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                            {cssNotice}
                        </div>
                    )}

                    {/* Generated CSS Output */}
                    {generatedCss !== undefined && (aiSummary || generatedCss) && (
                        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            {/* Result header */}
                            <div className={`flex items-center justify-between px-4 py-2.5 ${isDark ? 'bg-white/5' : 'bg-gray-50'} border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <div className="flex items-center gap-2">
                                    {isApplied
                                        ? <Check size={14} className="text-green-500" />
                                        : <Sparkles size={14} className="text-violet-500" />
                                    }
                                    <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {isApplied ? '✅ Applied!' : aiSummary || 'Generated CSS'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                                    title="Copy CSS"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>

                            {/* CSS Code Block */}
                            <pre className={`
                                text-xs p-4 overflow-x-auto font-mono leading-relaxed max-h-48 overflow-y-auto
                                ${isDark ? 'bg-[#0a0c12] text-emerald-400' : 'bg-gray-900 text-emerald-400'}
                            `}>
                                {generatedCss || '/* No CSS generated — custom CSS was removed. */'}
                            </pre>

                            {/* Action buttons */}
                            {!isApplied && (
                                <div className={`flex gap-2 p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                    <button
                                        onClick={handleApply}
                                        className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Check size={14} /> Replace & Apply
                                    </button>
                                    {currentCss && (
                                        <button
                                            onClick={handleAppendToExisting}
                                            className={`flex-1 h-9 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border transition-colors
                                                ${isDark ? 'border-white/20 text-gray-300 hover:bg-white/10' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            <Code2 size={14} /> Append to Existing
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Current CSS Status */}
                    {currentCss && (
                        <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-amber-50 border-amber-100'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-amber-700'}`}>
                                    ⚡ Active Custom CSS ({currentCss.length} chars)
                                </span>
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 size={12} /> Remove All
                                </button>
                            </div>
                            <pre className={`text-[10px] font-mono opacity-60 truncate ${isDark ? 'text-gray-400' : 'text-amber-800'}`}>
                                {currentCss.slice(0, 120)}{currentCss.length > 120 ? '…' : ''}
                            </pre>
                        </div>
                    )}

                    {/* Tip */}
                    <div className={`flex items-start gap-2 text-xs rounded-xl px-4 py-3 ${isDark ? 'bg-white/5 text-gray-400' : 'bg-violet-50 text-violet-700'}`}>
                        <Lightbulb size={13} className="mt-0.5 shrink-0" />
                        <span>
                            CSS is scoped to your resume canvas only — it won't affect the rest of the app. Animations are CSS-only and print-safe.
                        </span>
                    </div>
                </div>

                {/* ── Footer ── */}
                <footer className={`flex-shrink-0 flex items-center justify-between px-6 py-4 border-t
                    ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                    <p className={`text-xs italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        Changes auto-save with your resume.
                    </p>
                    <div className="flex gap-2">
                        {currentCss && (
                            <button
                                onClick={handleReset}
                                className={`px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-1.5 transition-colors`}
                            >
                                <RotateCcw size={13} /> Reset CSS
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`px-5 py-2 rounded-xl font-medium text-sm transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Done
                        </button>
                    </div>
                </footer>
            </div>
        </div>,
        document.body
    );
};

export default AICodeCustomizerModal;
