import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from './Sidebar';
import { useSidebarStore } from '../../store/useSidebarStore';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '../../contexts/NavigationContext';

/*
 * The rail is the one surface every signed-in page renders inside, so these
 * tests pin the parts of it that a page-level restyle elsewhere could quietly
 * undo: the token ground, the single accent on the active row, the row order,
 * and the absence of the dashboard's window chrome.
 */

vi.mock('../../utils/navigation', () => ({
    navigate: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../contexts/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('../../contexts/NavigationContext', () => ({ useNavigation: vi.fn() }));
vi.mock('../../store/useSidebarStore', () => ({ useSidebarStore: vi.fn() }));

vi.mock('../../hooks/useResumes', () => ({ useResumes: () => ({ updateResume: vi.fn(), deleteResume: vi.fn() }) }));
vi.mock('../../hooks/usePortfolios', () => ({ usePortfolios: () => ({ updatePortfolio: vi.fn(), deletePortfolio: vi.fn() }) }));
vi.mock('../../hooks/useWhiteboards', () => ({ useWhiteboards: () => ({ updateWhiteboard: vi.fn(), deleteWhiteboard: vi.fn() }) }));
vi.mock('../../hooks/useJobHistory', () => ({ usePracticeHistory: () => ({ deletePracticeHistory: vi.fn() }) }));
vi.mock('../../hooks/useMyCommunityPosts', () => ({ useMyCommunityPosts: () => ({ deletePost: vi.fn() }) }));
/*
 * Loaded, not loading. XpStatusCard is `if (isLoading) return null`, so a
 * loading mock renders the rail with a hole where its busiest child should be —
 * and the colour assertion below would then be querying a DOM that cannot
 * contain the markup it is looking for.
 */
vi.mock('../../hooks/useUserProgress', () => ({
    useUserProgress: () => ({
        isLoading: false,
        progress: { xp: 340, streak: { current: 3, lastActiveDay: '2026-08-14' } },
        levelInfo: { level: 4, currentLevelXp: 40, nextLevelXp: 100, progress: 0.4 },
        isStreakActiveToday: true,
    }),
}));

const styleOf = (element: Element | null) => element?.getAttribute('style') || '';

/**
 * Tailwind colour utilities the contract bans, in both the named-palette form
 * (`bg-white`, `text-gray-500`) and the arbitrary-value forms the rail was
 * actually converted away from (`bg-[#fff]`, `text-[var(--cv-text-muted)]`),
 * plus any `dark:` variant — every cvl token carries its own dark value, so a
 * `dark:` on top double-applies.
 */
const BANNED_COLOUR = new RegExp(
    [
        '^(bg|text|border|ring|fill|stroke|from|via|to)-(white|black)$',
        '^(bg|text|border|ring|fill|stroke|from|via|to)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}(/\\d+)?$',
        '^(bg|text|border|ring|fill|stroke|from|via|to)-\\[#[0-9a-fA-F]{3,8}\\]$',
        '^(bg|text|border|ring|fill|stroke|from|via|to)-\\[var\\(--cv-',
        '^dark:',
    ].join('|'),
);

/**
 * Every class on every element in the tree, minus the XpStatusCard subtree.
 *
 * The exclusion is named rather than silent: that component is rendered by the
 * rail but owned elsewhere, and it still ships `bg-white`, raw hex and `dark:`
 * variants (XpStatusCard.tsx:37-38, :44). Sidebar.tsx remaps the `--cv-*` names
 * it reads, which is as far as this file can reach. Scoping the check to the
 * rail's own markup is what makes it capable of failing.
 */
const railOwnClasses = (container: HTMLElement): string[] => {
    const xpCards = Array.from(container.querySelectorAll('[aria-label^="Level "]'));
    return Array.from(container.querySelectorAll<HTMLElement>('[class]'))
        .filter(el => !xpCards.some(card => card === el || card.contains(el)))
        .flatMap(el => Array.from(el.classList));
};

describe('Sidebar — the signed-in chrome', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        window.history.pushState({}, '', '/dashboard');

        (useAuth as any).mockReturnValue({
            currentUser: { email: 'test@careervivid.com', displayName: 'Jiawen' },
            userProfile: { sidebarNodes: [] },
            updateUserProfile: vi.fn(),
            logOut: vi.fn(),
            aiUsage: { count: 2, limit: 10 },
            isPremium: false,
        });

        (useTheme as any).mockReturnValue({ theme: 'dark', setTheme: vi.fn() });

        (useNavigation as any).mockReturnValue({
            toggleNavPosition: vi.fn(),
            toggleSidebarMode: vi.fn(),
            navPosition: 'side',
            sidebarMode: 'expanded',
            sidebarWidth: 256,
            setSidebarWidth: vi.fn(),
        });

        (useSidebarStore as any).mockReturnValue({
            nodes: [],
            setNodes: vi.fn(),
            isInitialized: true,
            setIsInitialized: vi.fn(),
            updateNodeTitle: vi.fn(),
            deleteNode: vi.fn(),
            activeNodeId: null,
            setActiveNode: vi.fn(),
        });
    });

    it('grounds the rail on the desk token, with a line border and no window chrome', () => {
        const { container } = render(<Sidebar />);

        const rail = container.querySelector('aside');
        expect(rail).toHaveClass('cvl');
        expect(styleOf(rail)).toContain('var(--cvl-desk)');
        expect(styleOf(rail)).toContain('var(--cvl-line)');

        // Traffic lights and filenames belong to the landing page, not to a
        // surface someone opens forty times a week.
        expect(container.querySelector('.cvl-win')).toBeNull();
        expect(container.querySelector('.cvl-bar')).toBeNull();
        expect(container.querySelector('.cvl-dot')).toBeNull();
    });

    it('keeps the workspace rows in their decided order', () => {
        render(<Sidebar />);

        const labels = ['Dashboard', 'Career Agent', 'Job tracker', 'Interview practice', 'Resume editor', 'Learning'];
        const rows = labels.map(label => screen.getByRole('button', { name: label }));

        rows.forEach((row, index) => {
            if (index === 0) return;
            // Node.compareDocumentPosition: 4 === the argument follows this node.
            expect(rows[index - 1].compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        });
    });

    it('gives only the active row the accent, and leaves the rest quiet', () => {
        window.history.pushState({}, '', '/job-tracker');
        render(<Sidebar />);

        const active = screen.getByRole('button', { name: 'Job tracker' });
        expect(styleOf(active)).toContain('var(--cvl-purple-soft)');
        expect(styleOf(active)).toContain('var(--cvl-purple)');

        const resting = screen.getByRole('button', { name: 'Learning' });
        expect(styleOf(resting)).not.toContain('var(--cvl-purple');
        // The resting label and its hover ground come from the shared primitive.
        expect(resting).toHaveClass('cvl-btn-ghost');
    });

    it('paints the credit meter as purple on a paper-2 track', () => {
        const { container } = render(<Sidebar />);

        const credits = screen.getByRole('button', { name: 'View credits and subscription' });
        expect(credits).toHaveTextContent('2/10');

        const track = credits.querySelector('span.rounded-full');
        expect(styleOf(track)).toContain('var(--cvl-paper-2)');
        expect(styleOf(track?.firstElementChild ?? null)).toContain('var(--cvl-purple)');

        // The rail's own markup may not reach past the tokens for colour.
        expect(railOwnClasses(container).filter(c => BANNED_COLOUR.test(c))).toEqual([]);
    });

    it('shows the upgrade nudge and the exhausted state the old meter owned', () => {
        (useAuth as any).mockReturnValue({
            currentUser: { email: 'test@careervivid.com', displayName: 'Jiawen' },
            userProfile: { sidebarNodes: [] },
            updateUserProfile: vi.fn(),
            logOut: vi.fn(),
            // 2 of 10 left is inside `remaining <= min(limit * 0.3, 20)`.
            aiUsage: { count: 8, limit: 10 },
            isPremium: false,
        });
        const low = render(<Sidebar />);
        expect(low.getByRole('button', { name: 'View credits and subscription' })).toHaveTextContent('Upgrade');
        low.unmount();

        (useAuth as any).mockReturnValue({
            currentUser: { email: 'test@careervivid.com', displayName: 'Jiawen' },
            userProfile: { sidebarNodes: [] },
            updateUserProfile: vi.fn(),
            logOut: vi.fn(),
            aiUsage: { count: 10, limit: 10 },
            isPremium: false,
        });
        const spent = render(<Sidebar />);
        const meter = spent.getByRole('button', { name: 'View credits and subscription' });
        expect(meter).toHaveTextContent('Limit reached');
        // Running out has to look different, not just read differently.
        expect(styleOf(spent.getByText('Limit reached'))).toContain('var(--cvl-danger)');
    });

    it('keeps a visible focus state on the language picker, whose select is invisible', () => {
        const { container } = render(<Sidebar />);
        fireEvent.click(screen.getByRole('button', { name: /Jiawen/ }));

        // The <select> is `opacity-0`, so an outline on it paints nothing — the
        // visible span beside it has to carry the focus state instead.
        const select = container.querySelector('#sidebar-language-select');
        expect(select).toHaveClass('opacity-0');
        expect(select?.parentElement).toHaveClass('group');
        expect(select?.parentElement?.querySelector('.cvl-field')?.className)
            .toContain('group-focus-within:ring-2');
    });

    it('keeps the collapsed rail at 44px tap targets, with its labels intact', () => {
        (useNavigation as any).mockReturnValue({
            toggleNavPosition: vi.fn(),
            toggleSidebarMode: vi.fn(),
            navPosition: 'side',
            sidebarMode: 'collapsed',
            sidebarWidth: 256,
            setSidebarWidth: vi.fn(),
        });

        render(<Sidebar />);

        ['Dashboard', 'Career Agent', 'Job tracker', 'Interview practice', 'Resume editor', 'Learning', 'Open Files', 'Sign out', 'Profile']
            .forEach(label => {
                const button = screen.getByRole('button', { name: label });
                expect(button).toHaveClass('h-11');
                expect(button).toHaveClass('w-11');
            });
    });
});
