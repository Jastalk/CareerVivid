import React, { useCallback, useRef, useState } from 'react';
import { Trophy, Target, RotateCcw } from 'lucide-react';
import { LEVEL_THRESHOLDS } from '../../lib/ccafMissions';
import { totalXpAvailable, type PlacedDomain } from '../../lib/questSource';
import type { MoveVector } from './useQuestControls';
import { useQuestLocale } from './useQuestLocale';

interface QuestHudProps {
    xp: number;
    level: number;
    clearedCount: number;
    /** The district the player is currently standing in. */
    domain: PlacedDomain | null;
    domainCleared: number;
    /** Weighted share of the whole exam covered so far, 0-100. */
    readinessPct: number;
    onReset: () => void;
}

export const QuestHud: React.FC<QuestHudProps> = ({ xp, level, clearedCount, domain, domainCleared, readinessPct, onReset }) => {
    const { localize, t } = useQuestLocale();
    const total = domain?.missions.length ?? 0;
    const floor = LEVEL_THRESHOLDS[level - 1] ?? 0;
    const ceiling = LEVEL_THRESHOLDS[level] ?? totalXpAvailable;
    const pct = ceiling > floor ? Math.min(100, ((xp - floor) / (ceiling - floor)) * 100) : 100;

    return (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
            <div className="pointer-events-auto rounded-2xl bg-[#171411]/85 px-4 py-3 text-white backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#ffb066]">
                    Domain {domain?.order ?? '-'} · {domain?.weight ?? 0}%
                </p>
                <p className="text-sm font-extrabold leading-tight">{domain ? localize(domain.name) : '—'}</p>

                <div className="mt-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#4a4392] to-[#7c74e0] text-xs font-extrabold">
                        {level}
                    </span>
                    <div className="w-28">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#f5871f] to-[#ffb066] transition-[width] duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] text-white/70">{xp} / {ceiling} XP</p>
                    </div>
                </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
                <div className="rounded-2xl bg-[#171411]/85 px-3 py-2 text-white backdrop-blur-sm">
                    <p className="flex items-center gap-1.5 text-xs font-bold">
                        <Target size={13} className="text-[#1d9e75]" /> {domainCleared}/{total}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/70">
                        <Trophy size={11} className="text-[#f5871f]" /> {t('ccaf_quest.readiness')} {Math.round(readinessPct)}%
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onReset}
                    title={t('ccaf_quest.reset')}
                    aria-label={t('ccaf_quest.reset')}
                    className="rounded-full bg-[#171411]/85 p-2.5 text-white/70 backdrop-blur-sm transition-colors hover:text-white"
                >
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
    );
};

interface JoystickProps {
    onMove: (vector: MoveVector) => void;
}

/**
 * Thumb stick for touch devices. Reports a normalised vector; the render loop
 * reads it through the same ref as the keyboard, so the two can't fight.
 */
export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
    const { t } = useQuestLocale();
    const joystickLabel = t('ccaf_quest.joystick');
    const base = useRef<HTMLDivElement>(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const active = useRef(false);

    const update = useCallback((clientX: number, clientY: number) => {
        const el = base.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const radius = rect.width / 2;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) {
            dx = (dx / dist) * radius;
            dy = (dy / dist) * radius;
        }
        setKnob({ x: dx, y: dy });
        // Screen up (negative dy) means "forward".
        onMove({ x: dx / radius, z: -dy / radius });
    }, [onMove]);

    const end = useCallback(() => {
        active.current = false;
        setKnob({ x: 0, y: 0 });
        onMove({ x: 0, z: 0 });
    }, [onMove]);

    return (
        <div
            ref={base}
            className="pointer-events-auto absolute bottom-6 left-6 z-20 h-32 w-32 touch-none rounded-full border-2 border-white/25 bg-[#171411]/35 backdrop-blur-sm md:hidden"
            onPointerDown={e => {
                active.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                update(e.clientX, e.clientY);
            }}
            onPointerMove={e => { if (active.current) update(e.clientX, e.clientY); }}
            onPointerUp={end}
            onPointerCancel={end}
            aria-label={joystickLabel}
        >
            <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white/75 shadow-lg"
                style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
            />
        </div>
    );
};

export default QuestHud;
