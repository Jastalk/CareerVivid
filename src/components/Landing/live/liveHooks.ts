import { useEffect, useRef, useState } from 'react';

/**
 * The page is built out of animation, so it needs an honest answer to "should
 * anything move?" — not just the CSS media query, which cannot gate the
 * JavaScript timers that drive the typing and stepping demos.
 */
export const usePrefersReducedMotion = (): boolean => {
    const [reduced, setReduced] = useState(() => (
        typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ));

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setReduced(query.matches);
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, []);

    return reduced;
};

/**
 * Demos below the fold should not be typing to an empty room. This reports the
 * first time an element is on screen and then stops observing — a demo that has
 * played once keeps its finished state rather than restarting on every scroll.
 */
export const useHasBeenSeen = <T extends Element>(): [React.RefObject<T>, boolean] => {
    const ref = useRef<T>(null);
    const [seen, setSeen] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node || seen) return undefined;
        if (typeof IntersectionObserver === 'undefined') {
            setSeen(true);
            return undefined;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setSeen(true);
                observer.disconnect();
            }
        }, { threshold: 0.25 });
        observer.observe(node);
        return () => observer.disconnect();
    }, [seen]);

    return [ref, seen];
};

/** Types `text` out one character at a time once `active` turns on. */
export const useTypedText = (text: string, active: boolean, msPerChar = 26): string => {
    const reduced = usePrefersReducedMotion();
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!active) { setCount(0); return undefined; }
        if (reduced) { setCount(text.length); return undefined; }
        setCount(0);
        const timer = window.setInterval(() => {
            setCount((current) => {
                if (current >= text.length) {
                    window.clearInterval(timer);
                    return current;
                }
                return current + 1;
            });
        }, msPerChar);
        return () => window.clearInterval(timer);
    }, [text, active, msPerChar, reduced]);

    return text.slice(0, count);
};

/** Counts from `from` to `to` — used for the scores that climb. */
export const useCountUp = (from: number, to: number, active: boolean, durationMs = 1400): number => {
    const reduced = usePrefersReducedMotion();
    const [value, setValue] = useState(from);

    useEffect(() => {
        if (!active) { setValue(from); return undefined; }
        if (reduced) { setValue(to); return undefined; }
        let frame = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / durationMs);
            // Ease-out, so the number lands rather than stopping dead.
            const eased = 1 - (1 - progress) ** 3;
            setValue(Math.round(from + (to - from) * eased));
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [from, to, active, durationMs, reduced]);

    return value;
};

/** Advances 0,1,2,…,length-1 and wraps — drives the quest tape and transcript. */
export const useCycle = (length: number, active: boolean, everyMs: number): [number, (index: number) => void] => {
    const reduced = usePrefersReducedMotion();
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!active || reduced || length < 2) return undefined;
        const timer = window.setInterval(() => setIndex((current) => (current + 1) % length), everyMs);
        return () => window.clearInterval(timer);
    }, [length, active, everyMs, reduced]);

    return [index, setIndex];
};

/** A clock that actually tells the time, in the menu bar. */
export const useClock = (): string => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 15_000);
        return () => window.clearInterval(timer);
    }, []);

    return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};
