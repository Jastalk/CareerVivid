import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Play, Volume2, VolumeX, X } from 'lucide-react';

export interface DeskWindowProps {
    /** The caption under the window, written like a file on a desk. */
    filename: string;
    /** Optional tint on the title bar, so a window reads as its own thing. */
    accent?: 'purple' | 'amber' | 'green' | 'plain';
    /**
     * A recorded demo. When this is missing the window falls back to `children`
     * — the live in-browser demo — so the desk is never a row of dead posters
     * waiting on footage.
     */
    videoSrc?: string;
    /** Frame shown before the video decodes. */
    poster?: string;
    className?: string;
    /** Sets the tilt/drift used by the floating desk layout. */
    style?: React.CSSProperties;
    floating?: boolean;
    children?: React.ReactNode;
}

const ACCENT_BG: Record<NonNullable<DeskWindowProps['accent']>, string> = {
    purple: 'linear-gradient(90deg, rgba(98,91,213,0.16), transparent 65%)',
    amber: 'linear-gradient(90deg, rgba(180,121,27,0.16), transparent 65%)',
    green: 'linear-gradient(90deg, rgba(21,128,61,0.14), transparent 65%)',
    plain: 'none',
};

/**
 * A window on the desk. Chrome, a filename, and either a looping clip or a live
 * demo inside. Clicking one with a clip opens it full screen with sound.
 */
const DeskWindow: React.FC<DeskWindowProps> = ({
    filename,
    accent = 'plain',
    videoSrc,
    poster,
    className = '',
    style,
    floating = false,
    children,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [muted, setMuted] = useState(true);
    const inlineVideo = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!expanded) return undefined;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setExpanded(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [expanded]);

    const body = videoSrc ? (
        <video
            ref={inlineVideo}
            className="block h-full w-full object-cover"
            src={videoSrc}
            poster={poster}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
        />
    ) : children;

    return (
        <>
            <figure
                className={`cvl-win ${videoSrc ? 'cvl-win-lift' : ''} ${floating ? 'cvl-float' : ''} ${className}`}
                style={style}
            >
                <div className="cvl-bar" style={{ backgroundImage: ACCENT_BG[accent] }}>
                    <span className="cvl-dot cvl-dot-r" />
                    <span className="cvl-dot cvl-dot-y" />
                    <span className="cvl-dot cvl-dot-g" />
                    <span
                        className="cvl-mono truncate text-[11px] font-medium"
                        style={{ color: 'var(--cvl-muted)' }}
                    >
                        {filename}
                    </span>
                    {videoSrc && (
                        <button
                            type="button"
                            onClick={() => setExpanded(true)}
                            className="ml-auto rounded p-1 transition hover:opacity-70"
                            style={{ color: 'var(--cvl-faint)' }}
                            aria-label={`Play ${filename} full screen`}
                        >
                            <Maximize2 size={13} />
                        </button>
                    )}
                </div>
                <div className="relative">{body}</div>
            </figure>

            {expanded && videoSrc && (
                <div
                    className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label={filename}
                    onClick={() => setExpanded(false)}
                >
                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                    <video
                        className="max-h-[86vh] w-auto max-w-[94vw] rounded-xl shadow-2xl"
                        src={videoSrc}
                        poster={poster}
                        autoPlay
                        loop
                        muted={muted}
                        playsInline
                        controls
                        onClick={(event) => event.stopPropagation()}
                    />
                    <div className="absolute right-5 top-5 flex gap-2">
                        <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); setMuted((value) => !value); }}
                            className="rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25"
                            aria-label={muted ? 'Unmute' : 'Mute'}
                        >
                            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setExpanded(false)}
                            className="rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25"
                            aria-label="Close"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

/**
 * The placeholder that stands in until a recording exists. It says what the
 * clip will be rather than pretending to be one.
 */
export const ClipSlot: React.FC<{ label: string; hint: string }> = ({ label, hint }) => (
    <div
        className="flex aspect-video flex-col items-center justify-center gap-2 px-4 text-center"
        style={{ background: 'var(--cvl-paper-2)' }}
    >
        <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
        >
            <Play size={15} />
        </span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--cvl-ink)' }}>{label}</span>
        <span className="cvl-mono text-[10px]" style={{ color: 'var(--cvl-faint)' }}>{hint}</span>
    </div>
);

export default DeskWindow;
