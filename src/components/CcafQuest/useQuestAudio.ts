import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Sound for the quest: a music bed and short interaction cues, each switched
 * independently — plenty of people want the blips but not the music, or the
 * reverse.
 *
 * The bed is an audio file per group of domains; the cues are synthesised with
 * the Web Audio API, so a dozen distinct blips cost nothing to ship.
 *
 * Browsers refuse to start an AudioContext without a user gesture, so nothing
 * is created until the first play call — by then the player has clicked into
 * the city, which is the gesture.
 */

const MUSIC_KEY = 'cv_ccaf_quest_music_v1';
const SFX_KEY = 'cv_ccaf_quest_sfx_v1';

/**
 * Reads a remembered on/off switch. Defaults to on, and survives private mode
 * or a blocked storage quota — audio settings must never break the mount.
 */
function readFlag(key: string): boolean {
    if (typeof window === 'undefined') return true;
    try {
        return window.localStorage.getItem(key) !== 'off';
    } catch {
        return true;
    }
}

export type Sfx =
    | 'select'     // picking an option A/B/C/D
    | 'interact'   // accepting a mission (E)
    | 'panel'      // a panel opens (L, rewatch)
    | 'correct'
    | 'wrong'
    | 'complete'   // mission cleared
    | 'levelUp'
    | 'travel';    // auto-walk starts

const BGM_LEVEL = 0.25;

/**
 * Which bed plays for a domain. Several domains deliberately share a track —
 * so crossing from 1 to 2 must not be heard as a restart. See `startMusic`.
 */
function bgmForDomain(domainOrder?: number): string {
    if (domainOrder === 5) return '/assets/bgm-d5.mp3';
    if (domainOrder === 3 || domainOrder === 4) return '/assets/bgm-d34.mp3';
    return '/assets/bgm-d12.mp3';
}

class QuestAudioEngine {
    private ctx: AudioContext | null = null;
    private sfxGain: GainNode | null = null;
    private bgmAudio: HTMLAudioElement | null = null;
    /** The file currently loaded — compared by path, not by domain number. */
    private currentSrc: string | null = null;

    /** The cues get their own bus, independent of the music element. */
    private ensure(): AudioContext | null {
        if (this.ctx) {
            // Autoplay policy can leave a fresh context suspended.
            if (this.ctx.state === 'suspended') void this.ctx.resume();
            return this.ctx;
        }
        const Ctor = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;

        this.ctx = new Ctor();

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.18;
        this.sfxGain.connect(this.ctx.destination);

        return this.ctx;
    }

    startMusic(domainOrder?: number) {
        if (typeof window === 'undefined') return;
        const src = bgmForDomain(domainOrder);

        if (!this.bgmAudio) {
            this.bgmAudio = new Audio(src);
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = BGM_LEVEL;
            this.currentSrc = src;
        } else if (this.currentSrc !== src) {
            // Only reload when the track genuinely differs. Domains 1 and 2
            // share a bed, so keying this off the domain number would cut the
            // music dead and restart it at a boundary the player should not
            // hear at all.
            this.bgmAudio.pause();
            this.bgmAudio.src = src;
            this.bgmAudio.currentTime = 0;
            this.currentSrc = src;
        }
        if (this.bgmAudio.paused) {
            // Rejected until the player has interacted with the page; the next
            // call after any click succeeds.
            void this.bgmAudio.play().catch(() => {});
        }
    }

    stopMusic() {
        this.bgmAudio?.pause();
    }

    /** Short envelope on a single oscillator — the building block for all cues. */
    private blip(frequency: number, startAt: number, seconds: number, type: OscillatorType, peak = 1) {
        const ctx = this.ctx;
        if (!ctx || !this.sfxGain) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(peak, startAt + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + seconds);
        osc.connect(gain).connect(this.sfxGain);
        osc.start(startAt);
        osc.stop(startAt + seconds + 0.02);
    }

    sfx(name: Sfx) {
        const ctx = this.ensure();
        if (!ctx) return;
        const t = ctx.currentTime;

        switch (name) {
            case 'interact':
                this.blip(660, t, 0.11, 'triangle');
                this.blip(990, t + 0.05, 0.1, 'triangle', 0.6);
                break;
            case 'panel':
                this.blip(520, t, 0.07, 'sine', 0.7);
                break;
            case 'select':
                // Fires the instant an option is pressed, before the verdict —
                // the tap should feel answered even while the answer lands.
                this.blip(440, t, 0.05, 'square', 0.28);
                break;
            case 'correct':
                this.blip(587.33, t, 0.14, 'triangle');
                this.blip(880, t + 0.09, 0.2, 'triangle', 0.8);
                break;
            case 'wrong':
                // Deliberately soft and low. Getting it wrong is how the course
                // teaches, so the cue should read as "not that one", not a buzzer.
                this.blip(196, t, 0.18, 'sine', 0.5);
                this.blip(164.81, t + 0.07, 0.22, 'sine', 0.4);
                break;
            case 'complete':
                [523.25, 659.25, 783.99].forEach((f, i) =>
                    this.blip(f, t + i * 0.09, 0.24, 'triangle', 0.9));
                break;
            case 'levelUp':
                [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
                    this.blip(f, t + i * 0.08, 0.32, 'triangle'));
                break;
            case 'travel':
                this.blip(330, t, 0.16, 'sine', 0.45);
                this.blip(440, t + 0.06, 0.14, 'sine', 0.35);
                break;
        }
    }

    dispose() {
        this.stopMusic();
        if (this.bgmAudio) {
            this.bgmAudio.src = '';
            this.bgmAudio = null;
        }
        void this.ctx?.close();
        this.ctx = null;
    }
}

/**
 * Two independent switches, each remembered between runs.
 *
 * The engine is driven from state through an effect rather than from inside
 * the toggle. React invokes state updaters twice under StrictMode, so any side
 * effect placed there fires twice and can leave the audio graph disagreeing
 * with what the buttons show.
 */
export const useQuestAudio = (active: boolean, domainOrder?: number) => {
    const engine = useRef<QuestAudioEngine | null>(null);
    const [musicOn, setMusicOn] = useState(() => readFlag(MUSIC_KEY));
    const [sfxOn, setSfxOn] = useState(() => readFlag(SFX_KEY));

    if (!engine.current && typeof window !== 'undefined') {
        engine.current = new QuestAudioEngine();
    }

    useEffect(() => {
        const instance = engine.current;
        if (!instance) return;
        if (active && musicOn) instance.startMusic(domainOrder);
        else instance.stopMusic();
    }, [active, musicOn, domainOrder]);

    useEffect(() => {
        try {
            window.localStorage.setItem(MUSIC_KEY, musicOn ? 'on' : 'off');
            window.localStorage.setItem(SFX_KEY, sfxOn ? 'on' : 'off');
        } catch {
            // Private mode — the run still honours the choice in memory.
        }
    }, [musicOn, sfxOn]);

    useEffect(() => () => { engine.current?.dispose(); }, []);

    const sfx = useCallback((name: Sfx) => {
        if (!sfxOn) return;
        engine.current?.sfx(name);
    }, [sfxOn]);

    return {
        musicOn,
        sfxOn,
        toggleMusic: useCallback(() => setMusicOn(on => !on), []),
        toggleSfx: useCallback(() => setSfxOn(on => !on), []),
        // The opening prompt needs to set a definite answer rather than flip
        // whatever happened to be stored — "yes, play music" must mean on even
        // when the remembered value already was on.
        setMusic: useCallback((on: boolean) => setMusicOn(on), []),
        sfx,
    };
};
