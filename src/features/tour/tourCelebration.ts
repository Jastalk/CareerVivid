/**
 * The payoff at the end of the tour.
 *
 * Loaded on demand rather than imported at module scope: canvas-confetti is
 * dead weight in the editor bundle for the overwhelming majority of sessions,
 * which never run the tour at all.
 *
 * Anyone who has asked for less motion gets none. Reduced-motion is a real
 * accessibility need, not a preference to talk them out of with confetti.
 */

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function celebrateTourFinish(): Promise<void> {
    if (typeof window === 'undefined' || prefersReducedMotion()) return;

    try {
        const { default: confetti } = await import('canvas-confetti');

        // Two bursts from the lower corners, angled inwards. A single centre
        // burst reads as a notification; two reads as applause.
        const shared = {
            particleCount: 55,
            spread: 62,
            startVelocity: 42,
            gravity: 0.9,
            scalar: 0.9,
            ticks: 160,
            colors: ['#4a4392', '#8b7cf6', '#e2b93d', '#34d399', '#ffffff'],
            disableForReducedMotion: true,
        };

        confetti({ ...shared, origin: { x: 0.15, y: 0.85 }, angle: 62 });
        confetti({ ...shared, origin: { x: 0.85, y: 0.85 }, angle: 118 });
    } catch {
        // A missing confetti chunk must never break finishing the tour.
    }
}
