import React, { useCallback, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

/** Matches the easing the iOS landing page uses, so the two feel like one product. */
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** Degrees of tilt at the very corner. 5 is the iOS hero's value. */
const DEFAULT_TILT = 5;

interface FloatingCardProps {
    children: React.ReactNode;
    /** Classes for the card surface itself. */
    className?: string;
    /** Classes for the perspective wrapper — use for layout (margins, grid). */
    wrapperClassName?: string;
    /** Stagger within a group, in seconds. */
    delay?: number;
    /** Set 0 to disable tilt on cards that are mostly text. */
    tilt?: number;
}

/**
 * A card that floats up as it scrolls into view and tilts toward the pointer.
 *
 * Two motions, deliberately separate:
 *
 *  - **Scroll reveal** — `whileInView` with `once`, so each card rises as you
 *    reach it rather than all of them animating on load while off-screen.
 *  - **Pointer tilt** — spring-damped rotateX/rotateY driven by motion values,
 *    which framer writes straight to the compositor without re-rendering.
 *
 * The surface treatment (layered shadow, pointer sheen, top hairline) lives in
 * index.css under `.quest-card`; that stylesheet deliberately does not set
 * `transform`, because framer owns it here.
 */
export const FloatingCard: React.FC<FloatingCardProps> = ({
    children,
    className = '',
    wrapperClassName = '',
    delay = 0,
    tilt = DEFAULT_TILT,
}) => {
    const reduceMotion = useReducedMotion();
    const surface = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [tilt, -tilt]), { stiffness: 150, damping: 18 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-tilt, tilt]), { stiffness: 150, damping: 18 });

    const handleMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (reduceMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / rect.width - 0.5;
        const ny = (event.clientY - rect.top) / rect.height - 0.5;
        x.set(nx);
        y.set(ny);
        // The sheen is a plain CSS gradient, so it is cheaper to poke the custom
        // properties directly than to route another motion value through style.
        const el = surface.current;
        if (el) {
            el.style.setProperty('--sheen-x', `${((nx + 0.5) * 100).toFixed(1)}%`);
            el.style.setProperty('--sheen-y', `${((ny + 0.5) * 100).toFixed(1)}%`);
            el.style.setProperty('--sheen', '1');
        }
    }, [reduceMotion, x, y]);

    const handleLeave = useCallback(() => {
        x.set(0);
        y.set(0);
        surface.current?.style.setProperty('--sheen', '0');
    }, [x, y]);

    return (
        <div
            style={{ perspective: 1200 }}
            className={wrapperClassName}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
        >
            <motion.div
                ref={surface}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={reduceMotion ? undefined : { y: -5 }}
                viewport={{ once: true, margin: '-70px' }}
                transition={{ duration: 0.55, delay, ease: EASE_OUT_EXPO }}
                style={reduceMotion ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
                className={`quest-card ${className}`}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default FloatingCard;
