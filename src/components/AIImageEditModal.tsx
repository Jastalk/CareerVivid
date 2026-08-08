import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { httpsCallable } from 'firebase/functions';
import {
    AlertCircle,
    Check,
    Download,
    GraduationCap,
    Image as ImageIcon,
    Loader2,
    Palette,
    Rocket,
    ShieldCheck,
    Sparkles,
    Upload,
    Wand2,
    X,
    Zap,
} from 'lucide-react';
import { editProfilePhoto, generateImage } from '../services/geminiService';
import { dataURLtoBlob, uploadImage } from '../services/storageService';
import { functions } from '../firebase';

interface AIImageEditModalProps {
    userId: string;
    currentPhoto: string;
    onSave: (newPhotoUrl: string) => void;
    onUseTemp: (newPhotoDataUrl: string) => void;
    onClose: () => void;
    onError: (title: string, message: string) => void;
    promptOptions?: string[];
    savePath?: string;
}

type StylePreset = {
    id: string;
    label: string;
    description: string;
    prompt: string;
    visiblePrompt: string;
    Icon: React.ElementType;
    tone: string;
};

const STYLE_PRESETS: StylePreset[] = [
    {
        id: 'tech_vector',
        label: 'Tech vector',
        description: 'Clean product illustration',
        prompt: 'A flat vector illustration in the style of corporate tech art. A professional headshot with realistic proportions, distinct black outlines, and flat cel-shaded coloring. Friendly expression, modern casual business attire, solid muted background.',
        visiblePrompt: 'Clean professional vector headshot with a muted background.',
        Icon: Palette,
        tone: 'bg-[#eef4ff] text-[#2563eb]',
    },
    {
        id: 'modern_maker',
        label: 'Modern maker',
        description: 'Warm avatar portrait',
        prompt: 'Digital avatar in a modern corporate illustration style. Character features natural skin tones, expressive facial features, and thick energetic linework. Minimalist shading, vibrant but flat colors, wearing smart-casual office wear.',
        visiblePrompt: 'Warm modern avatar with smart-casual styling.',
        Icon: Rocket,
        tone: 'bg-[#f3f2ff] text-[#625bd5]',
    },
    {
        id: 'campus',
        label: 'Campus style',
        description: 'Friendly clean comic',
        prompt: 'A semi-realistic vector portrait. Clean comic-book style inking with bold outlines. The character is looking directly at the viewer with a confident smile. Palette includes primary colors and soft pastels, avoiding gradients in favor of solid color blocks.',
        visiblePrompt: 'Friendly clean-comic portrait with soft pastels.',
        Icon: GraduationCap,
        tone: 'bg-emerald-50 text-emerald-700',
    },
    {
        id: 'minimalist',
        label: 'Minimal line',
        description: 'Simple high-readability',
        prompt: 'High-fidelity vector art headshot. Focus on simple geometry and clear readability at small sizes. Black contour lines, cel-shaded skin tones, and a single solid background color. Resembles high-end tech brand illustrations from 2020.',
        visiblePrompt: 'Minimal high-readability line portrait.',
        Icon: Zap,
        tone: 'bg-amber-50 text-amber-700',
    },
];

const QUICK_PROMPTS = [
    { label: 'Professional polish', prompt: 'make the photo look more polished and professional' },
    { label: 'Softer lighting', prompt: 'improve the lighting so it is brighter and more even' },
    { label: 'Office background', prompt: 'replace the background with a soft blurred office setting' },
    { label: 'Neutral backdrop', prompt: 'replace the background with a clean light neutral color' },
    { label: 'Sharper color', prompt: 'slightly enhance sharpness, skin tone, and color balance' },
    { label: 'Clean avatar', prompt: 'turn this into a clean professional avatar while keeping the person recognizable' },
];

const readBlobAsBase64 = (blob: Blob): Promise<{ base64data: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const [header, base64data] = result.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || blob.type || 'image/png';
            if (!base64data) {
                reject(new Error('Invalid image data.'));
                return;
            }
            resolve({ base64data, mimeType });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

const readDataUrlAsBase64 = (dataUrl: string) => {
    const [header, base64data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1];
    if (!mimeType || !base64data) throw new Error('Invalid data URL.');
    return { base64data, mimeType };
};

const resolveRemoteImageForAI = async (imageUrl: string): Promise<{ base64data: string; mimeType: string }> => {
    try {
        const response = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) throw new Error(`Failed to load image (${response.status}).`);
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('The selected file is not an image.');
        return await readBlobAsBase64(blob);
    } catch (browserError) {
        console.warn('[AIImageEditModal] Browser image read failed; trying server fallback.', browserError);
        const resolveImageForAIEdit = httpsCallable(functions, 'resolveImageForAIEdit');
        const result = await resolveImageForAIEdit({ imageUrl });
        const data = result.data as { base64?: string; mimeType?: string };
        if (!data?.base64 || !data?.mimeType) {
            throw new Error('Could not prepare the current image for AI editing.');
        }
        return { base64data: data.base64, mimeType: data.mimeType };
    }
};

const AIImageEditModal: React.FC<AIImageEditModalProps> = ({
    userId,
    currentPhoto,
    onSave,
    onClose,
    onError,
    promptOptions = [],
    savePath,
}) => {
    const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [newPhoto, setNewPhoto] = useState<string | null>(null);
    const [activeSelection, setActiveSelection] = useState<'current' | 'new'>('current');
    const [previewPhoto, setPreviewPhoto] = useState<string>(currentPhoto);
    const [inlineError, setInlineError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setPreviewPhoto(currentPhoto);
        setActiveSelection('current');
    }, [currentPhoto]);

    const handleStyleSelect = (styleId: string) => {
        const style = STYLE_PRESETS.find((item) => item.id === styleId);
        if (!style) return;
        setInlineError(null);
        setSelectedStyleId(styleId);
        setCustomPrompt(style.visiblePrompt);
    };

    const appendPrompt = (prompt: string) => {
        setInlineError(null);
        setCustomPrompt((previous) => previous ? `${previous}, ${prompt}` : prompt);
    };

    const buildGenerationPrompt = () => {
        const visiblePrompt = customPrompt.trim();
        const selectedStyle = STYLE_PRESETS.find((item) => item.id === selectedStyleId);
        if (!selectedStyle) return visiblePrompt;

        const hasCustomNotes = visiblePrompt && visiblePrompt !== selectedStyle.visiblePrompt;
        return hasCustomNotes
            ? `${selectedStyle.prompt}\n\nAdditional user notes: ${visiblePrompt}`
            : selectedStyle.prompt;
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setInlineError(null);
            setPreviewPhoto(dataUrl);
            setNewPhoto(null);
            setActiveSelection('current');
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        const generationPrompt = buildGenerationPrompt();

        if (!generationPrompt.trim()) {
            setInlineError('Choose a style or describe the edit you want.');
            return;
        }

        setIsLoading(true);
        setNewPhoto(null);
        setActiveSelection('current');
        setInlineError(null);

        try {
            if (!previewPhoto) {
                const generated = await generateImage(userId, generationPrompt, 'standard');
                setNewPhoto(generated);
                setActiveSelection('new');
                return;
            }

            const { base64data, mimeType } = previewPhoto.startsWith('data:')
                ? readDataUrlAsBase64(previewPhoto)
                : await resolveRemoteImageForAI(previewPhoto);

            const result = await editProfilePhoto(userId, base64data, mimeType, generationPrompt);
            setNewPhoto(result);
            setActiveSelection('new');
        } catch (error) {
            console.error(error);
            setInlineError(error instanceof Error
                ? error.message
                : 'Image edit failed. Try a smaller JPG/PNG or a simpler prompt.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAndUse = async () => {
        const targetPhoto = activeSelection === 'new' ? newPhoto : previewPhoto;
        if (!targetPhoto) return;

        if (activeSelection === 'current' && targetPhoto.startsWith('http')) {
            onSave(targetPhoto);
            onClose();
            return;
        }

        setIsLoading(true);
        try {
            const blob = dataURLtoBlob(targetPhoto);
            if (!blob) throw new Error('Failed to process image.');

            const path = savePath || `users/${userId}/resume_photos/${Date.now()}_edited.png`;
            const downloadURL = await uploadImage(blob, path);

            onSave(downloadURL);
            onClose();
        } catch (error: any) {
            onError('Save failed', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        const targetPhoto = activeSelection === 'new' ? newPhoto : previewPhoto;
        if (!targetPhoto) return;

        const link = document.createElement('a');
        link.href = targetPhoto;
        link.download = `avatar_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const extraPrompts = promptOptions.filter(Boolean).slice(0, 4);
    const canSave = Boolean(activeSelection === 'new' ? newPhoto : previewPhoto) && !isLoading;
    const canGenerate = Boolean(buildGenerationPrompt().trim()) && !isLoading;

    const PreviewPane = ({
        title,
        image,
        selected,
        emptyLabel,
        onClick,
        accent,
    }: {
        title: string;
        image: string | null;
        selected: boolean;
        emptyLabel: string;
        onClick: () => void;
        accent: 'source' | 'result';
    }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={!image && accent === 'result'}
            className={`group min-w-0 rounded-2xl border bg-white p-3 text-left shadow-sm transition dark:bg-[#262522] ${
                selected
                    ? 'border-[#625bd5] ring-2 ring-[#625bd5]/15'
                    : 'border-[#e6dac8] hover:border-[#d9c7ad] dark:border-[#37332d]'
            } ${!image && accent === 'result' ? 'cursor-default' : 'cursor-pointer'}`}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#211b16] dark:text-[#f4f1e9]">{title}</span>
                {selected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f2ff] px-2 py-0.5 text-[10px] font-bold text-[#625bd5] dark:bg-[#302e2a] dark:text-[#8d88e6]">
                        <Check size={11} /> Active
                    </span>
                )}
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#ececf4] bg-[#f8f8fb] dark:border-[#37332d] dark:bg-[#1f1f1d]">
                {image ? (
                    <img src={image} alt={title} className="h-full w-full object-contain" />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center text-[#8c8174]">
                        {accent === 'source' ? <Upload size={24} /> : <Wand2 size={24} />}
                        <p className="mt-2 text-xs font-semibold">{emptyLabel}</p>
                    </div>
                )}
                {isLoading && accent === 'result' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 text-center backdrop-blur-sm dark:bg-[#262522]/85">
                        <Loader2 className="mb-2 h-7 w-7 animate-spin text-[#625bd5]" />
                        <p className="text-xs font-bold text-[#625bd5]">Generating...</p>
                    </div>
                )}
            </div>
        </button>
    );

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#211b16]/55 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[24px] border border-[#e6dac8] bg-[#fffaf1] shadow-2xl dark:border-[#37332d] dark:bg-[#1f1f1d]">
                <div className="flex items-start justify-between gap-4 border-b border-[#e6dac8] bg-white px-5 py-4 dark:border-[#37332d] dark:bg-[#262522]">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f2ff] text-[#625bd5] dark:bg-[#302e2a] dark:text-[#8d88e6]">
                            <Sparkles size={19} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold leading-tight text-[#211b16] dark:text-[#f4f1e9]">
                                AI profile image
                            </h3>
                            <p className="mt-1 text-sm font-medium leading-5 text-[#665a4a] dark:text-[#aaa39a]">
                                Edit your current photo, preview the result, then apply it to your profile.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-[#8c8174] transition hover:bg-[#f7f1e7] hover:text-[#211b16] dark:hover:bg-[#302e2a] dark:hover:text-[#f4f1e9]"
                        aria-label="Close image editor"
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px]">
                    <section className="space-y-4 border-b border-[#e6dac8] p-5 dark:border-[#37332d] lg:border-b-0 lg:border-r">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">Preview</h4>
                                <p className="text-xs font-medium text-[#665a4a] dark:text-[#aaa39a]">Choose which image to save.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-2 rounded-xl border border-[#e4d3bc] bg-white px-3 py-2 text-xs font-bold text-[#665a4a] shadow-sm transition hover:border-[#d9c7ad] hover:text-[#211b16] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]"
                            >
                                <Upload size={14} />
                                Upload photo
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <PreviewPane
                                title="Source"
                                image={previewPhoto || null}
                                selected={activeSelection === 'current'}
                                emptyLabel="Upload a source photo"
                                onClick={() => setActiveSelection('current')}
                                accent="source"
                            />
                            <PreviewPane
                                title="AI result"
                                image={newPhoto}
                                selected={activeSelection === 'new'}
                                emptyLabel="Result appears here"
                                onClick={() => newPhoto && setActiveSelection('new')}
                                accent="result"
                            />
                        </div>

                        <div className="flex items-start gap-2 rounded-2xl border border-[#e6dac8] bg-white px-3 py-2 text-xs font-medium text-[#665a4a] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#aaa39a]">
                            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                            <span>Current profile photos can be edited directly. Upload only when you want a different source.</span>
                        </div>

                        {inlineError && (
                            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-bold">Image edit did not complete</p>
                                    <p className="mt-0.5 text-xs font-medium leading-5">{inlineError}</p>
                                </div>
                            </div>
                        )}
                    </section>

                    <aside className="space-y-5 bg-[#fffaf1] p-5 dark:bg-[#1f1f1d]">
                        <div>
                            <h4 className="text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">Style</h4>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {STYLE_PRESETS.map((style) => {
                                    const Icon = style.Icon;
                                    const selected = selectedStyleId === style.id;
                                    return (
                                        <button
                                            key={style.id}
                                            type="button"
                                            onClick={() => handleStyleSelect(style.id)}
                                            disabled={isLoading}
                                            className={`rounded-2xl border p-3 text-left shadow-sm transition ${
                                                selected
                                                    ? 'border-[#625bd5] bg-[#f3f2ff] ring-1 ring-[#625bd5]/20 dark:border-[#8d88e6] dark:bg-[#302e2a]'
                                                    : 'border-[#e6dac8] bg-white hover:border-[#d9c7ad] dark:border-[#37332d] dark:bg-[#262522]'
                                            }`}
                                        >
                                            <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl ${style.tone}`}>
                                                <Icon size={16} />
                                            </div>
                                            <p className="text-xs font-bold text-[#211b16] dark:text-[#f4f1e9]">{style.label}</p>
                                            <p className="mt-1 text-[11px] font-medium leading-4 text-[#665a4a] dark:text-[#aaa39a]">{style.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">Refine</h4>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {QUICK_PROMPTS.map((item) => (
                                    <button
                                        key={item.label}
                                        type="button"
                                        onClick={() => appendPrompt(item.prompt)}
                                        disabled={isLoading}
                                        className="rounded-xl border border-[#e6dac8] bg-white px-3 py-2 text-left text-[11px] font-bold text-[#665a4a] shadow-sm transition hover:border-[#d9c7ad] hover:text-[#211b16] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                                {extraPrompts.map((prompt) => (
                                    <button
                                        key={prompt}
                                        type="button"
                                        onClick={() => appendPrompt(prompt)}
                                        disabled={isLoading}
                                        className="rounded-xl border border-[#e6dac8] bg-white px-3 py-2 text-left text-[11px] font-bold text-[#665a4a] shadow-sm transition hover:border-[#d9c7ad] hover:text-[#211b16] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]" htmlFor="ai-image-prompt">
                                Notes
                            </label>
                            <textarea
                                id="ai-image-prompt"
                                value={customPrompt}
                                onChange={(event) => {
                                    setInlineError(null);
                                    setCustomPrompt(event.target.value);
                                }}
                                placeholder="Add optional details for the profile image..."
                                disabled={isLoading}
                                rows={4}
                                className="mt-3 w-full resize-none rounded-2xl border border-[#e6dac8] bg-white px-3 py-3 text-sm font-medium leading-5 text-[#211b16] outline-none transition placeholder:text-[#9b9186] focus:border-[#625bd5] focus:ring-2 focus:ring-[#625bd5]/15 dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f4f1e9]"
                            />
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={!canGenerate}
                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#211b16] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#362a21] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                Generate image
                            </button>
                        </div>
                    </aside>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-[#e6dac8] bg-white px-5 py-4 dark:border-[#37332d] dark:bg-[#262522] sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-3 py-2 text-sm font-bold text-[#665a4a] transition hover:bg-[#f7f1e7] hover:text-[#211b16] dark:text-[#aaa39a] dark:hover:bg-[#302e2a] dark:hover:text-[#f4f1e9]"
                    >
                        Cancel
                    </button>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        {newPhoto && (
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e6dac8] bg-white px-4 py-2.5 text-sm font-bold text-[#665a4a] shadow-sm transition hover:border-[#d9c7ad] hover:text-[#211b16] dark:border-[#37332d] dark:bg-[#1f1f1d] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]"
                            >
                                <Download size={15} />
                                Download
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSaveAndUse}
                            disabled={!canSave}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#625bd5] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#514bc4] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ImageIcon size={15} />
                            Save & apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default AIImageEditModal;
