import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState, useEffect, useRef } from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FolderView from './FolderView';
import { useSidebarStore } from '../store/useSidebarStore';
import { useNavigation, NavigationProvider } from '../contexts/NavigationContext';

const { mockNavigate } = vi.hoisted(() => ({
    mockNavigate: vi.fn()
}));

vi.mock('../utils/navigation', () => ({
    navigate: mockNavigate
}));

vi.mock('react-dnd', () => ({
    useDrop: () => [{ isOver: false, canDrop: false }, vi.fn()]
}));

vi.mock('lucide-react', () => ({
    Bot: () => <div data-testid="icon-bot" />,
    ChevronUp: () => <div data-testid="icon-chevron-up" />,
    Terminal: () => <div data-testid="icon-terminal" />,
    UserRound: () => <div data-testid="icon-user-round" />,
    Folder: () => <div data-testid="icon-folder" />,
    ChevronRight: () => <div data-testid="icon-chevron" />,
    Plus: () => <div data-testid="icon-plus" />,
    SlidersHorizontal: () => <div data-testid="icon-sliders" />,
    Check: () => <div data-testid="icon-check" />
}));

vi.mock('../components/Layout/AppLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-app-layout">{children}</div>
}));

vi.mock('../components/Navigation/WorkspaceCard', () => ({
    default: ({ node }: { node: any }) => <div data-testid={`workspace-card-${node.id}`}>{node.text}</div>
}));

vi.mock('../store/useSidebarStore', () => ({
    useSidebarStore: vi.fn()
}));

let customNavigationMock: any = null;

vi.mock('../contexts/NavigationContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../contexts/NavigationContext')>();
    return {
        ...actual,
        useNavigation: () => {
            if (customNavigationMock) {
                return customNavigationMock;
            }
            return actual.useNavigation();
        }
    };
});

describe('FolderView Component - Filtering and Sorting UX', () => {
    const mockNodes = [
        {
            id: 'subfolder-1',
            parent: 'folder-root',
            text: 'Subfolder One',
            droppable: true,
            data: {
                type: 'custom-folder',
                createdAt: 1000,
                updatedAt: 4000
            }
        },
        {
            id: 'resume-1',
            parent: 'folder-root',
            text: 'Resume One',
            droppable: false,
            data: {
                type: 'resume',
                createdAt: 2000,
                updatedAt: 3000
            }
        },
        {
            id: 'portfolio-1',
            parent: 'folder-root',
            text: 'Portfolio One',
            droppable: false,
            data: {
                type: 'portfolio',
                createdAt: 3000,
                updatedAt: 2000
            }
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock window location pathname to match the active folder ID
        delete (window as any).location;
        window.location = { pathname: '/folder/folder-root' } as any;

        customNavigationMock = {
            toggleNavPosition: vi.fn(),
            navPosition: 'side',
            sidebarWidth: 256,
            setSidebarWidth: vi.fn()
        };

        (useSidebarStore as any).mockReturnValue({
            nodes: mockNodes,
            moveNode: vi.fn(),
            addNode: vi.fn()
        });
    });

    it('Test 1: Renders items inside FolderView in chronological order by default', () => {
        render(<FolderView />);

        const cards = screen.getAllByTestId(/workspace-card-/);
        expect(cards).toHaveLength(3);

        // Sorting check (oldest first by default):
        // subfolder-1 (1000) -> resume-1 (2000) -> portfolio-1 (3000)
        expect(cards[0]).toHaveTextContent('Subfolder One');
        expect(cards[1]).toHaveTextContent('Resume One');
        expect(cards[2]).toHaveTextContent('Portfolio One');
    });

    it('Test 2: Filters items dynamically by folder type', () => {
        render(<FolderView />);

        // Click dropdown button
        const filterBtn = screen.getByText('Filter & Sort');
        fireEvent.click(filterBtn);

        // Select 'Folders' filter options
        const foldersOpt = screen.getByText('Folders');
        fireEvent.click(foldersOpt);

        // Assert only folders are shown
        const cards = screen.getAllByTestId(/workspace-card-/);
        expect(cards).toHaveLength(1);
        expect(cards[0]).toHaveTextContent('Subfolder One');
        expect(screen.queryByText('Resume One')).not.toBeInTheDocument();
    });

    it('Test 3: Sorts items dynamically by Recently Modified (updatedAt) descending order', () => {
        render(<FolderView />);

        // Open dropdown
        fireEvent.click(screen.getByText('Filter & Sort'));

        // Select 'Recently Modified' sort option
        const modifiedOpt = screen.getByText('Recently Modified');
        fireEvent.click(modifiedOpt);

        // Assert items are sorted descending by updatedAt:
        // subfolder-1 (4000) -> resume-1 (3000) -> portfolio-1 (2000)
        const cards = screen.getAllByTestId(/workspace-card-/);
        expect(cards[0]).toHaveTextContent('Subfolder One');
        expect(cards[1]).toHaveTextContent('Resume One');
        expect(cards[2]).toHaveTextContent('Portfolio One');
    });

    it('Test 4: Displays empty matching filter state correctly', () => {
        render(<FolderView />);

        // Open dropdown
        fireEvent.click(screen.getByText('Filter & Sort'));

        // Select 'Interviews' filter option (since mock data has no interview)
        const interviewOpt = screen.getByText('Interviews');
        fireEvent.click(interviewOpt);

        // Assert empty matching message is rendered
        expect(screen.getByText('No matching items')).toBeInTheDocument();
        expect(screen.getByText('No items in this folder match the filter type "interview".')).toBeInTheDocument();
        expect(screen.queryByTestId(/workspace-card-/)).not.toBeInTheDocument();
    });
});

describe('NavigationProvider Sidebar Resize Constraints', () => {
    // Helper component to test NavigationProvider state constraints
    const DummyComponent = () => {
        const { sidebarWidth, setSidebarWidth } = useNavigation();
        return (
            <div>
                <span data-testid="width-val">{sidebarWidth}</span>
                <button data-testid="set-200" onClick={() => setSidebarWidth(200)}>Set 200</button>
                <button data-testid="set-300" onClick={() => setSidebarWidth(300)}>Set 300</button>
                <button data-testid="set-500" onClick={() => setSidebarWidth(500)}>Set 500</button>
            </div>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        customNavigationMock = null; // Let it invoke actual actual NavigationProvider context values
    });

    it('Test 5: NavigationProvider respects lower bound (240px) and upper bound (450px) constraints', () => {
        // Render dummy component wrapped with the actual NavigationProvider
        render(
            <NavigationProvider>
                <DummyComponent />
            </NavigationProvider>
        );

        // Default width is 256
        const widthText = screen.getByTestId('width-val');
        expect(widthText).toHaveTextContent('256');

        // Set to 300 (should be allowed)
        fireEvent.click(screen.getByTestId('set-300'));
        expect(widthText).toHaveTextContent('300');
        expect(localStorage.getItem('careervivid_sidebar_width')).toBe('300');

        // Set to 200 (should be clamped to 240)
        fireEvent.click(screen.getByTestId('set-200'));
        expect(widthText).toHaveTextContent('240');
        expect(localStorage.getItem('careervivid_sidebar_width')).toBe('240');

        // Set to 500 (should be clamped to 450)
        fireEvent.click(screen.getByTestId('set-500'));
        expect(widthText).toHaveTextContent('450');
        expect(localStorage.getItem('careervivid_sidebar_width')).toBe('450');
    });
});
