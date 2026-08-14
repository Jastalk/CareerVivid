import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Loader2, Play, Square, Wand2 } from 'lucide-react';

// Reusable components for the top section
export const EditableField: React.FC<{ label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }> = ({ label, value, onChange, type = 'text', placeholder }) => {
    const isUrl = value && (value.startsWith('http://') || value.startsWith('https://'));
    return (
        <div className="min-w-0">
            <div className="flex justify-between items-center">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</label>
                {isUrl && (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-[#4a4392] hover:text-[#4f46b5] dark:text-[#aaa6ff] dark:hover:text-[#c8c5ff] flex items-center gap-1 transition-colors"
                    >
                        <span>Open URL</span>
                        <ExternalLink size={12} />
                    </a>
                )}
            </div>
            <input
                type={type}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="mt-1.5 block h-10 w-full min-w-0 rounded-lg border border-[#e4d8c8] bg-[#fffaf4] px-3 text-sm font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#8d88e6] focus:bg-white focus:ring-2 focus:ring-[#f3f2ff] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-[#8d88e6] dark:focus:ring-[#302e5f]/40"
            />
        </div>
    );
};

export const EditableSelect: React.FC<{ label: string; value: string; onChange: (value: string) => void; options: readonly string[] }> = ({ label, value, onChange, options }) => (
    <div className="min-w-0">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</label>
        <select value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1.5 block h-10 w-full min-w-0 rounded-lg border border-[#e4d8c8] bg-[#fffaf4] px-3 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-[#8d88e6] focus:bg-white focus:ring-2 focus:ring-[#f3f2ff] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-[#8d88e6] dark:focus:ring-[#302e5f]/40">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

// --- NEW Enhanced Markdown Renderer ---
export const MarkdownRenderer: React.FC<{ text: string }> = ({ text = '' }) => {
    const renderContent = (content: string) => {
        // Split content by links [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            // Text before link
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
            }
            // The link
            parts.push({ type: 'link', text: match[1], url: match[2] });
            lastIndex = linkRegex.lastIndex;
        }
        // Remaining text
        if (lastIndex < content.length) {
            parts.push({ type: 'text', content: content.slice(lastIndex) });
        }

        // If no links found, return single text part to process bold
        if (parts.length === 0) parts.push({ type: 'text', content });

        return parts.map((part, i) => {
            if (part.type === 'link') {
                return (
                    <a
                        key={i}
                        href={part.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 hover:underline break-words"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part.text}
                    </a>
                );
            } else {
                // Process bold (**text**) inside text parts
                const boldParts = part.content.split(/(\*\*.*?\*\*)/g);
                return boldParts.map((bp, j) => {
                    if (bp.startsWith('**') && bp.endsWith('**')) {
                        return <strong key={`${i}-${j}`}>{bp.slice(2, -2)}</strong>;
                    }
                    return <span key={`${i}-${j}`}>{bp}</span>;
                });
            }
        });
    };

    const lines = text.split('\n');
    const elements = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.trim().startsWith('### ')) {
            elements.push(<h3 key={i} className="text-lg font-semibold mt-4 mb-2 text-primary-600 dark:text-primary-400">{renderContent(line.substring(4))}</h3>);
        } else if (line.trim().startsWith('## ')) {
            elements.push(<h2 key={i} className="text-xl font-bold mt-6 mb-3">{renderContent(line.substring(3))}</h2>);
        } else if (line.trim().startsWith('# ')) {
            elements.push(<h1 key={i} className="text-2xl font-extrabold mt-8 mb-4">{renderContent(line.substring(2))}</h1>);
        } else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            elements.push(
                <div key={i} className="flex items-start pl-4">
                    <span className="mr-2 mt-1 text-primary-500">•</span>
                    <span>{renderContent(line.substring(line.indexOf(' ') + 1))}</span>
                </div>
            );
        } else if (/^\d+\.\s/.test(line.trim())) {
            elements.push(
                <div key={i} className="flex items-start pl-2 my-2">
                    <span className="mr-2 font-semibold text-gray-600 dark:text-gray-400">{line.match(/^\d+\./)?.[0]}</span>
                    <span>{renderContent(line.substring(line.indexOf('.') + 2))}</span>
                </div>
            );
        } else if (line.trim() === '') {
            if (elements.length > 0 && elements[elements.length - 1].props.className !== 'h-2') {
                elements.push(<div key={i} className="h-2"></div>);
            }
        } else {
            if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                elements.push(<p key={i} className="font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1">{renderContent(line)}</p>);
            } else {
                elements.push(<p key={i}>{renderContent(line)}</p>);
            }
        }
    }

    return (
        <div className="text-gray-800 dark:text-gray-200 leading-relaxed space-y-1">
            {elements}
        </div>
    );
};


// --- NEW Interactive Editable Section ---
export const EditablePrepSection: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onRegenerate: () => void;
    selectedVoice: SpeechSynthesisVoice | null;
}> = ({ label, value, onChange, placeholder, onRegenerate, selectedVoice }) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const [isPlaying, setIsPlaying] = useState(false);
    const [highlightRange, setHighlightRange] = useState<{ start: number, end: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            textareaRef.current.focus();
        }
    }, [isEditing, currentValue]);

    const handleSave = () => {
        setIsEditing(false);
        if (currentValue !== value) {
            onChange(currentValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape') {
            setCurrentValue(value);
            setIsEditing(false);
        }
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const getCleanText = (text: string) => text.replace(/\*\*/g, '');

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.speechSynthesis.speaking && isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            setHighlightRange(null);
        } else {
            window.speechSynthesis.cancel();
            const textToRead = value || placeholder || "No text available.";
            const cleanText = getCleanText(textToRead);
            const utterance = new SpeechSynthesisUtterance(cleanText);

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.onboundary = (event) => {
                if (event.name === 'word') {
                    setHighlightRange({
                        start: event.charIndex,
                        end: event.charIndex + event.charLength
                    });
                }
            };

            utterance.onend = () => {
                setIsPlaying(false);
                setHighlightRange(null);
            };

            utterance.onerror = () => {
                setIsPlaying(false);
                setHighlightRange(null);
            };

            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
        }
    };

    const renderHighlightedText = () => {
        if (!value) return <span className="text-gray-400 italic">{placeholder}</span>;

        // If not playing or no highlight, fallback to standard markdown render
        if (!isPlaying || !highlightRange) {
            const parts = value.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            });
        }

        // Logic to render text with highlighting while preserving bold
        const parts = value.split(/(\*\*.*?\*\*)/g);
        let currentCleanIdx = 0;

        return parts.map((part, i) => {
            const isBold = part.startsWith('**') && part.endsWith('**');
            const content = isBold ? part.slice(2, -2) : part;

            // Map this part's range in the CLEAN text
            const partStart = currentCleanIdx;
            const partEnd = currentCleanIdx + content.length;
            currentCleanIdx += content.length;

            // Check overlap with highlightRange
            // Range: [partStart, partEnd] vs [highlightRange.start, highlightRange.end]
            if (highlightRange.end > partStart && highlightRange.start < partEnd) {
                // Determine intersection relative to this part's content
                const startInPart = Math.max(0, highlightRange.start - partStart);
                const endInPart = Math.min(content.length, highlightRange.end - partStart);

                const before = content.substring(0, startInPart);
                const highlight = content.substring(startInPart, endInPart);
                const after = content.substring(endInPart);

                const Wrapper = isBold ? 'strong' : 'span';

                return (
                    <Wrapper key={i}>
                        {before}
                        <span className="bg-yellow-200 dark:bg-yellow-900/50 rounded-sm px-0.5 transition-colors duration-75">{highlight}</span>
                        {after}
                    </Wrapper>
                );
            }

            return isBold ? <strong key={i}>{content}</strong> : <span key={i}>{content}</span>;
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{label}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePlay}
                        title={isPlaying ? "Stop Reading" : "Read Aloud"}
                        className={`p-1 transition-colors rounded-full ${isPlaying ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20'}`}
                    >
                        {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>
                    <button onClick={onRegenerate} title="Regenerate with AI" className="text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 p-1">
                        <Wand2 size={18} />
                    </button>
                </div>
            </div>

            <div
                className="cursor-pointer group min-h-[60px] p-2 -ml-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => !isEditing && setIsEditing(true)}
            >
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={currentValue || ''}
                        onChange={handleTextareaInput}
                        onBlur={handleSave}
                        onKeyDown={(e) => { if (e.key === 'Escape') handleSave(); }}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 resize-none overflow-hidden"
                        placeholder={placeholder}
                        autoFocus
                    />
                ) : (
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {renderHighlightedText()}
                    </div>
                )}
            </div>
        </div>
    );
};


// --- AI Regeneration Modal ---
export const RegenerateModal: React.FC<{
    sectionName: string;
    onClose: () => void;
    onRegenerate: (instruction: string) => Promise<void>;
}> = ({ sectionName, onClose, onRegenerate }) => {
    const { t } = useTranslation();
    const [instruction, setInstruction] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        await onRegenerate(instruction);
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-xl">
                <h3 className="text-lg font-bold mb-4">{t('job_tracker.modal.regenerate_modal_title', { section: sectionName })}</h3>
                <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder={t('job_tracker.modal.regenerate_placeholder')}
                    className="w-full p-2 border rounded-md mb-4 bg-white dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">{t('common.cancel')}</button>
                    <button onClick={handleGenerate} disabled={isLoading} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-primary-300 flex items-center gap-2">
                        {isLoading && <Loader2 size={16} className="animate-spin" />}
                        {isLoading ? t('job_tracker.modal.regenerating') : t('job_tracker.modal.regenerate')}
                    </button>
                </div>
            </div>
        </div>
    );
};
