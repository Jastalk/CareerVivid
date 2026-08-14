import React, { useMemo, useState, useEffect } from 'react';
import { Smartphone, Monitor, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import IntroOverlay from '../intro/IntroOverlay';
import { PortfolioData } from '../../types/portfolio';
import { TEMPLATES } from '../../templates';
import { sanitizeCustomCss } from '../../../../utils/sanitizeCustomCss';

interface PortfolioPreviewProps {
    portfolioData: PortfolioData | null;
    activeDevice: 'desktop' | 'mobile';
    viewMode: 'edit' | 'preview';
    isMobile: boolean;
    onFocusField: (fieldId: string) => void;
    onUpdate: (updates: Partial<PortfolioData> | any) => void;
    onClosePreview?: () => void;
}

const PortfolioPreview: React.FC<PortfolioPreviewProps> = ({
    portfolioData,
    activeDevice: initialActiveDevice,
    viewMode,
    isMobile,
    onFocusField,
    onUpdate,
    onClosePreview
}) => {
    // Local state for device preview (defaults to prop, but can be toggled in toolbar)
    const [currentDevice, setCurrentDevice] = useState<'desktop' | 'mobile'>(initialActiveDevice);
    const [showIntro, setShowIntro] = useState(false);
    const [zoom, setZoom] = useState(1);

    // Sync with prop if it changes (optional, but good practice if parent controls it too)
    useEffect(() => {
        setCurrentDevice(initialActiveDevice);
    }, [initialActiveDevice]);

    // Memoize template to avoid unnecessary lookups
    const CurrentTemplate = useMemo(() => {
        if (!portfolioData) return TEMPLATES.minimalist;

        if (portfolioData.mode === 'linkinbio') {
            const id = portfolioData.templateId as string;
            if (['linktree_minimal', 'linktree_visual', 'linktree_corporate', 'linktree_bento'].includes(id)) {
                return TEMPLATES[id as keyof typeof TEMPLATES];
            }
            return TEMPLATES.linktree_visual;
        }

        return TEMPLATES[portfolioData.templateId as keyof typeof TEMPLATES] || TEMPLATES.minimalist;
    }, [portfolioData?.templateId, portfolioData?.mode]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

    if (!portfolioData) return null;

    return (
        <div className={`
            flex-1 relative flex items-center justify-center p-8 overflow-hidden 
            bg-[#f9fafb] dark:bg-[#0b0c10] bg-dot-pattern
            ${isMobile && viewMode === 'edit' ? 'hidden' : 'flex'}
        `}>
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
                {/* Zoom Controls */}
                <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1 mr-2">
                    <button
                        onClick={handleZoomOut}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut size={18} />
                    </button>
                    <div className="flex items-center px-1 text-xs font-mono text-gray-400">
                        {Math.round(zoom * 100)}%
                    </div>
                    <button
                        onClick={handleZoomIn}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn size={18} />
                    </button>
                </div>

                {portfolioData.linkInBio?.introPage?.enabled && (
                    <button
                        onClick={() => setShowIntro(true)}
                        className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 text-gray-600 tooltip-trigger"
                        title="Replay Intro"
                    >
                        <RotateCcw size={18} />
                    </button>
                )}

                <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                    <button
                        onClick={() => setCurrentDevice('mobile')}
                        className={`p-2 rounded-md transition-colors ${currentDevice === 'mobile' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Mobile View"
                    >
                        <Smartphone size={18} />
                    </button>
                    <button
                        onClick={() => setCurrentDevice('desktop')}
                        className={`p-2 rounded-md transition-colors ${currentDevice === 'desktop' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Desktop View"
                    >
                        <Monitor size={18} />
                    </button>
                </div>

                {onClosePreview && (
                    <button
                        onClick={onClosePreview}
                        className="w-8 h-8 rounded-full bg-red-400 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-sm ml-2"
                        title="Close Preview"
                    >
                        <span className="font-bold text-lg leading-none">&times;</span>
                    </button>
                )}
            </div>

            {/* Browser Frame with Zoom */}
            <div
                className={`
                    transition-all duration-300 shadow-2xl overflow-hidden relative
                    ${currentDevice === 'mobile' ? 'w-[375px] h-[750px] rounded-[40px] border-[12px] border-gray-900' : 'w-full h-full rounded-xl border border-gray-200'}
                `}
                style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center'
                }}
            >
                {/* Intro Overlay Preview */}
                {portfolioData.linkInBio?.introPage?.enabled && showIntro && (
                    <div className="absolute inset-0 z-[100] rounded-[inherit] overflow-hidden">
                        <IntroOverlay
                            config={portfolioData.linkInBio.introPage}
                            onEnter={() => setShowIntro(false)}
                            position="absolute"
                            portfolioId={portfolioData.id}
                            isPreview={true}
                        />
                    </div>
                )}

                {/* Content Iframe / Component */}
                <div className="w-full h-full overflow-y-auto bg-white custom-scrollbar relative">
                    {/* Component Rendering */}
                    {(() => {
                        const theme = portfolioData.theme || { darkMode: false, primaryColor: '#000000' } as any;
                        const isDark = theme.darkMode;
                        const isExplicitlyLight = theme.backgroundColor?.toLowerCase() === '#ffffff' || theme.backgroundColor?.toLowerCase() === '#fff';
                        const wrapperBg = (isDark && isExplicitlyLight) ? '#0f1117' : (theme.backgroundColor || (isDark ? '#0f1117' : '#ffffff'));
                        const safeCustomCss = sanitizeCustomCss(theme.customCss).css;

                        return (
                            <div
                                id={`portfolio-preview-${portfolioData.id || 'draft'}`}
                                className="min-h-full transition-colors duration-500"
                                style={{ backgroundColor: wrapperBg }}
                            >
                                {/*
                                  * Scoped custom CSS injection — the AI Style tab writes here
                                  * (portfolio-ai.ts tells the model it may emit theme.customCss),
                                  * and a published portfolio is rendered to the public, so this
                                  * goes through the same sanitizer as the resume preview: a
                                  * stray `}` here would restyle the page around the portfolio,
                                  * and a `url(https://…)` would beacon every visitor.
                                  */}
                                {safeCustomCss && (
                                    <style>{`#portfolio-preview-${portfolioData.id || 'draft'} { ${safeCustomCss} }`}</style>
                                )}
                                <CurrentTemplate
                                    data={portfolioData}
                                    onEdit={onFocusField}
                                    onUpdate={onUpdate}
                                    isMobileView={currentDevice === 'mobile'}
                                />
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default PortfolioPreview;
