/**
 * Where the Career Agent is showing, held outside React.
 *
 * The mode used to be `useState` inside AgentDrawer, which meant only the
 * drawer could change it. That broke the moment the agent moved the user:
 * expanding to the /agent workspace collapsed the drawer to a pill, so when a
 * tool navigated them to `/edit/{id}` they landed on the editor with the
 * conversation gone — the agent had just said what it was doing and then
 * vanished, leaving a change on screen with no explanation attached to it.
 *
 * Kept in a module rather than context because the writer (a tool effect in
 * AgentSessionContext) sits ABOVE the reader (AgentDrawer, which remounts per
 * route), and because it has to survive that remount. localStorage carries it
 * across reloads; the listener set carries it across components in the same
 * tick, which localStorage alone cannot do.
 */

import { parkOutOfTheWay } from './useDrawerCorner';

export type DrawerMode = 'closed' | 'open' | 'mini';

const KEY = 'cv_agent_drawer_mode';

const read = (): DrawerMode => {
    try {
        const stored = localStorage.getItem(KEY);
        return stored === 'open' || stored === 'mini' ? stored : 'closed';
    } catch {
        // Private browsing, or storage disabled. The agent still works; it just
        // starts closed each time.
        return 'closed';
    }
};

let current: DrawerMode = read();
const listeners = new Set<() => void>();

export const getDrawerMode = (): DrawerMode => current;

export function setDrawerMode(mode: DrawerMode): void {
    if (mode === current) return;
    current = mode;
    try {
        localStorage.setItem(KEY, mode);
    } catch {
        /* Non-persistent for this session. */
    }
    listeners.forEach((fn) => fn());
}

export function subscribeDrawerMode(onChange: () => void): () => void {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
}

/**
 * Bring the conversation along when the agent moves the user.
 *
 * Two things at once, because they are the same moment: the panel becomes
 * visible, and it steps aside so the page it just opened is readable.
 *
 * `mini` is left alone on purpose: someone who deliberately shrank the panel
 * to watch it from the corner of their eye has already said how much room they
 * want it to take, and jumping to full width would be overruling them. Only a
 * closed agent is reopened, and a closed agent at this moment means the user
 * was talking to it on the /agent workspace it is about to leave.
 */
export function followUserToRoute(): void {
    parkOutOfTheWay();
    if (getDrawerMode() === 'closed') setDrawerMode('open');
}
