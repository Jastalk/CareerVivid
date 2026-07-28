import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Award, X, Download } from 'lucide-react';
import { downloadShareCard } from './questShareCard';
import { useQuestLocale } from './useQuestLocale';

/**
 * Reward moments, in escalating order of ceremony:
 *  - `mission` — a quick XP pop after each correct answer.
 *  - `levelup` — a fuller banner when the XP bar fills.
 *  - `domain`  — the end-of-domain payoff with run stats.
 *  - `finale`  — every question in every domain, once per player. This one
 *    does not auto-dismiss: it is the end of the course, and the player should
 *    get to sit in it rather than have it swept away on a timer.
 * The game queues these so a single answer can fire several in sequence.
 */
export type Celebration =
    | { kind: 'mission'; id: string; xp: number; title: string }
    | { kind: 'levelup'; id: string; level: number }
    | {
        kind: 'domain'; id: string; domain: string; missions: number; xp: number; perfect: number;
        /** False on the last district — nothing further opens up after it. */
        hasNext: boolean;
    }
    | {
        kind: 'finale';
        id: string;
        missions: number;
        xp: number;
        perfect: number;
        domains: { order: number; name: string; weight: number }[];
    };

interface QuestCelebrationProps {
    celebration: Celebration | null;
    onDone: () => void;
}

/** Deterministic spray so the burst looks scattered without Math.random per frame. */
const SPARKS = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const spread = 90 + (i % 4) * 28;
    return { x: Math.cos(angle) * spread, y: Math.sin(angle) * spread, delay: (i % 5) * 0.02 };
});

const DURATION: Record<Celebration['kind'], number> = {
    mission: 1500,
    levelup: 2200,
    domain: 5200,
    // 0 = stays until dismissed.
    finale: 0,
};

/**
 * Firework bursts: four origins, twelve shards each, all precomputed.
 *
 * They relaunch on a rolling cadence rather than firing one volley. Playing
 * once meant the display was over about three seconds in, leaving only looping
 * confetti — so the finale read as having restarted rather than as still going.
 */
const BURST_PERIOD = 3.2;
const BURST_DURATION = 1.5;
const BURSTS = [
    { x: -30, y: -18, delay: 0.5, hue: '#ffd166' },
    { x: 28, y: -26, delay: 0.9, hue: '#7c74e0' },
    { x: -14, y: 10, delay: 1.3, hue: '#1d9e75' },
    { x: 34, y: 6, delay: 1.7, hue: '#f5871f' },
].map(b => ({
    ...b,
    shards: Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const reach = 120 + (i % 3) * 45;
        return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach, i };
    }),
}));

/** Confetti, deterministic so it never re-randomises between frames. */
const CONFETTI = Array.from({ length: 70 }, (_, i) => ({
    left: ((i * 37) % 100),
    delay: ((i * 13) % 30) / 10,
    duration: 3.4 + ((i * 7) % 20) / 10,
    drift: ((i % 7) - 3) * 26,
    spin: ((i % 5) - 2) * 340,
    colour: ['#ffd166', '#7c74e0', '#1d9e75', '#f5871f', '#e5645f'][i % 5],
    wide: i % 3 === 0,
}));

export const QuestCelebration: React.FC<QuestCelebrationProps> = ({ celebration, onDone }) => {
    const { t } = useQuestLocale();

    // Each celebration auto-dismisses; the game advances its own queue on done.
    useEffect(() => {
        if (!celebration) return;
        const ms = DURATION[celebration.kind];
        if (!ms) return;   // the finale waits for the player
        const timer = window.setTimeout(onDone, ms);
        return () => window.clearTimeout(timer);
    }, [celebration, onDone]);

    return (
        <AnimatePresence mode="wait">
            {celebration?.kind === 'mission' && (
                <motion.div
                    key={celebration.id}
                    className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {SPARKS.map((spark, i) => (
                        <motion.span
                            key={i}
                            className="absolute h-2 w-2 rounded-full bg-[#f5871f]"
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{ x: spark.x, y: spark.y, opacity: 0, scale: 0.3 }}
                            transition={{ duration: 0.75, delay: spark.delay, ease: 'easeOut' }}
                        />
                    ))}
                    <motion.div
                        className="flex flex-col items-center gap-1"
                        initial={{ scale: 0.5, opacity: 0, y: 10 }}
                        animate={{ scale: [0.5, 1.15, 1], opacity: [0, 1, 1], y: [10, -6, -34] }}
                        transition={{ duration: 1.1, times: [0, 0.28, 1], ease: 'easeOut' }}
                    >
                        <span className="rounded-full bg-[#1d9e75] px-4 py-1.5 text-sm font-extrabold text-white shadow-xl">
                            +{celebration.xp} XP
                        </span>
                        <span className="rounded-full bg-[#171411]/85 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                            {celebration.title}
                        </span>
                    </motion.div>
                </motion.div>
            )}

            {celebration?.kind === 'levelup' && (
                <motion.div
                    key={celebration.id}
                    className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Screen flash */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-[#625bd5]/45 to-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.9, 0] }}
                        transition={{ duration: 1.1, times: [0, 0.2, 1] }}
                    />
                    <motion.div
                        className="flex flex-col items-center gap-2"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: [0.6, 1.1, 1], opacity: 1 }}
                        transition={{ duration: 0.6, ease: 'backOut' }}
                    >
                        <motion.span
                            className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#625bd5] to-[#7c74e0] shadow-2xl"
                            animate={{ rotate: [0, -8, 8, 0] }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                        >
                            <Sparkles size={34} className="text-white" />
                        </motion.span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                            {t('ccaf_quest.level_up')}
                        </span>
                        <span className="text-4xl font-black text-white drop-shadow-lg">
                            {t('ccaf_quest.level')} {celebration.level}
                        </span>
                    </motion.div>
                </motion.div>
            )}

            {celebration?.kind === 'domain' && (
                <motion.div
                    key={celebration.id}
                    className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#171411]/55 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <motion.div
                        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-[#171411]/85 px-8 py-8 text-center shadow-2xl"
                        initial={{ scale: 0.8, y: 24, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.5, ease: 'backOut' }}
                    >
                        <motion.span
                            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#f5871f] to-[#ffb066] shadow-xl"
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Award size={44} className="text-white" />
                        </motion.span>

                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#ffb066]">
                            {t('ccaf_quest.domain_clear')}
                        </p>
                        <h3 className="text-xl font-black leading-tight text-white">{celebration.domain}</h3>

                        <div className="mt-2 grid w-full grid-cols-3 gap-2">
                            {[
                                { label: t('ccaf_quest.missions'), value: celebration.missions },
                                { label: 'XP', value: celebration.xp },
                                { label: t('ccaf_quest.first_try'), value: `${celebration.perfect}%` },
                            ].map(stat => (
                                <div key={stat.label} className="rounded-xl bg-white/10 px-2 py-2.5">
                                    <p className="text-lg font-extrabold text-white">{stat.value}</p>
                                    <p className="text-[9px] font-semibold uppercase tracking-wide text-white/55">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {celebration.hasNext && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/70">
                                <Trophy size={13} className="text-[#f5871f]" /> {t('ccaf_quest.domain_next')}
                            </p>
                        )}
                    </motion.div>
                </motion.div>
            )}

            {celebration?.kind === 'finale' && (
                <motion.div
                    key={celebration.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="pointer-events-auto fixed inset-0 z-[70] overflow-hidden bg-[#0b0a08]/60 backdrop-blur-[2px]"
                >
                    {/* Darkest behind the card, clearing toward the edges, so the
                        text stays legible while the orbiting city and the
                        fireworks over it remain visible. A flat 95% scrim hid
                        the whole scene the finale is celebrating. */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(ellipse at center, rgba(11,10,8,0.90) 0%, rgba(11,10,8,0.72) 45%, rgba(11,10,8,0.30) 100%)',
                        }}
                    />
                    {/* Shockwaves — three rings leaving from the centre. */}
                    {[0, 0.35, 0.7].map(delay => (
                        <motion.span
                            key={delay}
                            initial={{ scale: 0, opacity: 0.6 }}
                            animate={{ scale: 7, opacity: 0 }}
                            transition={{ duration: 2.4, delay, ease: 'easeOut' }}
                            className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#ffd166]"
                        />
                    ))}

                    {/* Fireworks */}
                    {BURSTS.map(burst => (
                        <span
                            key={`${burst.x}-${burst.y}`}
                            className="absolute"
                            style={{ left: `calc(50% + ${burst.x}vw)`, top: `calc(50% + ${burst.y}vh)` }}
                        >
                            {burst.shards.map(shard => (
                                <motion.span
                                    key={shard.i}
                                    initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
                                    animate={{ x: shard.dx, y: shard.dy + 60, opacity: [0, 1, 0], scale: 0.3 }}
                                    transition={{
                                        duration: BURST_DURATION,
                                        delay: burst.delay,
                                        repeat: Infinity,
                                        repeatDelay: BURST_PERIOD - BURST_DURATION,
                                        ease: 'easeOut',
                                    }}
                                    className="absolute h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: burst.hue, boxShadow: `0 0 10px ${burst.hue}` }}
                                />
                            ))}
                        </span>
                    ))}

                    {/* Confetti, falling for the whole sequence. */}
                    {CONFETTI.map((c, i) => (
                        <motion.span
                            key={i}
                            initial={{ y: '-12vh', x: 0, rotate: 0, opacity: 0 }}
                            animate={{ y: '112vh', x: c.drift, rotate: c.spin, opacity: [0, 1, 1, 0] }}
                            transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: 'linear' }}
                            className={`absolute top-0 ${c.wide ? 'h-1.5 w-3' : 'h-2.5 w-1'} rounded-sm`}
                            style={{ left: `${c.left}%`, backgroundColor: c.colour }}
                        />
                    ))}

                    <div className="relative flex h-full w-full flex-col items-center justify-center px-6 text-center">
                        <motion.div
                            initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{ delay: 0.9, type: 'spring', stiffness: 140, damping: 12 }}
                            className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#ffd166] to-[#f5871f] shadow-[0_0_60px_rgba(255,209,102,0.55)]"
                        >
                            <Trophy size={38} className="text-[#4a2c00]" />
                        </motion.div>

                        <motion.h2
                            initial={{ y: 26, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 1.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="text-4xl font-black tracking-tight text-white sm:text-5xl"
                        >
                            {t('ccaf_quest.finale_title')}
                        </motion.h2>
                        <motion.p
                            initial={{ y: 18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 1.4, duration: 0.6 }}
                            className="mt-2 max-w-md text-sm leading-relaxed text-white/60"
                        >
                            {t('ccaf_quest.finale_subtitle')}
                        </motion.p>

                        {/* The five districts, arriving one at a time. */}
                        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                            {celebration.domains.map((domain, i) => (
                                <motion.span
                                    key={domain.order}
                                    initial={{ y: 30, opacity: 0, scale: 0.85 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    transition={{ delay: 1.7 + i * 0.16, type: 'spring', stiffness: 200, damping: 16 }}
                                    className="flex items-center gap-2 rounded-full border border-[#ffd166]/30 bg-white/[0.06] px-3.5 py-2"
                                >
                                    <span className="text-[11px] font-black text-[#ffd166]">D{domain.order}</span>
                                    <span className="max-w-[10rem] truncate text-[12px] font-semibold text-white/85">{domain.name}</span>
                                    <span className="text-[10px] font-bold text-white/35">{domain.weight}%</span>
                                </motion.span>
                            ))}
                        </div>

                        <motion.div
                            initial={{ y: 24, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 2.7, duration: 0.6 }}
                            className="mt-8 grid grid-cols-3 gap-3 sm:gap-6"
                        >
                            {[
                                { value: celebration.missions, label: t('ccaf_quest.missions') },
                                { value: celebration.xp.toLocaleString(), label: t('ccaf_quest.total_xp') },
                                { value: `${celebration.perfect}%`, label: t('ccaf_quest.first_try') },
                            ].map(stat => (
                                <div key={stat.label} className="min-w-[5.5rem]">
                                    <p className="text-2xl font-black text-[#ffd166] sm:text-3xl">{stat.value}</p>
                                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">{stat.label}</p>
                                </div>
                            ))}
                        </motion.div>

                        {/* Seal — stamps down hard at the end of the sequence. */}
                        <motion.div
                            initial={{ scale: 2.6, opacity: 0, rotate: 18 }}
                            animate={{ scale: 1, opacity: 1, rotate: -7 }}
                            transition={{ delay: 3.4, type: 'spring', stiffness: 220, damping: 14 }}
                            className="mt-8 flex items-center gap-2 rounded-xl border-2 border-[#1d9e75] px-4 py-2"
                        >
                            <Award size={17} className="text-[#1d9e75]" />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#1d9e75]">
                                {t('ccaf_quest.finale_seal')}
                            </span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 4.2, duration: 0.5 }}
                            className="mt-10 flex items-center gap-3"
                        >
                            <button
                                type="button"
                                onClick={() => downloadShareCard({
                                    title: t('ccaf_quest.finale_title'),
                                    seal: t('ccaf_quest.finale_seal'),
                                    missions: celebration.missions,
                                    xp: celebration.xp,
                                    perfect: celebration.perfect,
                                    labels: {
                                        missions: t('ccaf_quest.missions'),
                                        xp: t('ccaf_quest.total_xp'),
                                        perfect: t('ccaf_quest.first_try'),
                                    },
                                    domains: celebration.domains,
                                })}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd166] to-[#f5871f] px-5 py-2.5 text-xs font-black text-[#4a2c00] transition-transform hover:scale-[1.03]"
                            >
                                <Download size={14} /> {t('ccaf_quest.finale_save')}
                            </button>
                            <button
                                type="button"
                                onClick={onDone}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2.5 text-xs font-bold text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                            >
                                <X size={13} /> {t('ccaf_quest.close')}
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default QuestCelebration;
