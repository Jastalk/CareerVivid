import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    followUserToRoute,
    getDrawerMode,
    setDrawerMode,
    subscribeDrawerMode,
} from './drawerMode';
import { getCorner, moveCorner } from './useDrawerCorner';

/*
 * What broke: the agent said "I've added System Design to your skills" and
 * navigated to the editor, and the user arrived to find a pill in the corner.
 * The change was on screen; the sentence explaining it was not.
 *
 * The mode lives outside React because the writer (a tool effect, above the
 * router) and the reader (the drawer, which remounts per route) are on opposite
 * sides of the tree.
 */

beforeEach(() => {
    setDrawerMode('closed');
    moveCorner('bottom-right', false);
    localStorage.clear();
});

describe('drawer mode', () => {
    it('notifies every subscriber when it changes', () => {
        const a = vi.fn();
        const b = vi.fn();
        const stopA = subscribeDrawerMode(a);
        const stopB = subscribeDrawerMode(b);

        setDrawerMode('open');

        expect(getDrawerMode()).toBe('open');
        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(1);

        stopA();
        stopB();
    });

    it('does not wake subscribers for a no-op set', () => {
        setDrawerMode('open');
        const listener = vi.fn();
        const stop = subscribeDrawerMode(listener);

        setDrawerMode('open');

        expect(listener).not.toHaveBeenCalled();
        stop();
    });

    it('stops notifying once unsubscribed', () => {
        const listener = vi.fn();
        subscribeDrawerMode(listener)();

        setDrawerMode('mini');

        expect(listener).not.toHaveBeenCalled();
    });

    it('persists so a route remount does not reset it', () => {
        setDrawerMode('mini');
        expect(localStorage.getItem('cv_agent_drawer_mode')).toBe('mini');
    });
});

describe('followUserToRoute', () => {
    it('reopens a closed agent so the conversation arrives with the user', () => {
        setDrawerMode('closed');
        followUserToRoute();
        expect(getDrawerMode()).toBe('open');
    });

    /*
     * Someone who shrank the panel has already said how much room they want it
     * to take. Jumping to full width because a tool fired would be overruling
     * them for no reason — mini still shows the last thing the agent said.
     */
    it('leaves a deliberately minimised agent minimised', () => {
        setDrawerMode('mini');
        followUserToRoute();
        expect(getDrawerMode()).toBe('mini');
    });

    it('leaves an already open agent alone', () => {
        setDrawerMode('open');
        followUserToRoute();
        expect(getDrawerMode()).toBe('open');
    });
});

describe('parking out of the way', () => {
    /*
     * The agent navigates you somewhere to look at something. Sitting
     * bottom-right it covered the resume preview and the score rail — the exact
     * change it had just told you about.
     */
    it('steps left when the agent drops the user on a new page', () => {
        followUserToRoute();
        expect(getCorner()).toBe('bottom-left');
    });

    it('never overrides a corner the user dragged it to', () => {
        moveCorner('top-right', true);

        followUserToRoute();

        expect(getCorner()).toBe('top-right');
        // The conversation still comes with them; only the position is theirs.
        expect(getDrawerMode()).toBe('open');
    });
});
