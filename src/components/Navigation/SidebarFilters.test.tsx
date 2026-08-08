import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from './Sidebar';
import { useSidebarStore } from '../../store/useSidebarStore';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { LANGUAGE_STORAGE_KEY } from '../../utils/languagePreference';

const { mockNavigate } = vi.hoisted(() => ({
    mockNavigate: vi.fn()
}));

vi.mock('../../utils/navigation', () => ({
    navigate: mockNavigate
}));

vi.mock('lucide-react', () => ({
    Mic: () => <div data-testid="icon-mic" />,
    Globe: () => <div data-testid="icon-globe" />,
    Briefcase: () => <div data-testid="icon-briefcase" />,
    PenTool: () => <div data-testid="icon-pentool" />,
    PanelLeftClose: () => <div data-testid="icon-panelleftclose" />,
    PanelLeftOpen: () => <div data-testid="icon-panelleftopen" />,
    LogOut: () => <div data-testid="icon-logout" />,
    LogIn: () => <div data-testid="icon-login" />,
    Sun: () => <div data-testid="icon-sun" />,
    Moon: () => <div data-testid="icon-moon" />,
    Monitor: () => <div data-testid="icon-monitor" />,
    Users: () => <div data-testid="icon-users" />,
    CreditCard: () => <div data-testid="icon-creditcard" />,
    Gift: () => <div data-testid="icon-gift" />,
    FileText: () => <div data-testid="icon-filetext" />,
    GraduationCap: () => <div data-testid="icon-graduation-cap" />,
    LayoutDashboard: () => <div data-testid="icon-dashboard" />,
    MoreVertical: () => <div data-testid="icon-morevertical" />,
    Trash2: () => <div data-testid="icon-trash2" />,
    SlidersHorizontal: () => <div data-testid="icon-sliders" />,
    Check: () => <div data-testid="icon-check" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    ChevronRight: () => <div data-testid="icon-chevron" />,
    Eye: () => <div data-testid="icon-eye" />,
    EyeOff: () => <div data-testid="icon-eye-off" />,
    Folder: () => <div data-testid="icon-folder" />,
    FolderOpen: () => <div data-testid="icon-folder-open" />,
    File: () => <div data-testid="icon-file" />,
    GripVertical: () => <div data-testid="icon-grip" />
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn()
}));

vi.mock('../../contexts/ThemeContext', () => ({
    useTheme: vi.fn()
}));

vi.mock('../../contexts/NavigationContext', () => ({
    useNavigation: vi.fn()
}));

vi.mock('../../store/useSidebarStore', () => ({
    useSidebarStore: vi.fn()
}));

vi.mock('../../hooks/useResumes', () => ({
    useResumes: () => ({
        updateResume: vi.fn(),
        deleteResume: vi.fn()
    })
}));

vi.mock('../../hooks/usePortfolios', () => ({
    usePortfolios: () => ({
        updatePortfolio: vi.fn(),
        deletePortfolio: vi.fn()
    })
}));

vi.mock('../../hooks/useWhiteboards', () => ({
    useWhiteboards: () => ({
        updateWhiteboard: vi.fn(),
        deleteWhiteboard: vi.fn()
    })
}));

vi.mock('../../hooks/useJobHistory', () => ({
    usePracticeHistory: () => ({
        deletePracticeHistory: vi.fn()
    })
}));

vi.mock('../../hooks/useMyCommunityPosts', () => ({
    useMyCommunityPosts: () => ({
        deletePost: vi.fn()
    })
}));

vi.mock('../../hooks/useUserProgress', () => ({
    useUserProgress: () => ({ isLoading: true })
}));

describe('Sidebar Component - Sorting and Filtering UX', () => {
    const mockNodes = [
        {
            id: 'resume-1',
            parent: 0,
            text: 'First Resume',
            droppable: false,
            data: {
                type: 'resume',
                createdAt: 1000,
                updatedAt: 4000
            }
        },
        {
            id: 'portfolio-1',
            parent: 0,
            text: 'Second Portfolio',
            droppable: false,
            data: {
                type: 'portfolio',
                createdAt: 2000,
                updatedAt: 3000
            }
        },
        {
            id: 'whiteboard-1',
            parent: 0,
            text: 'Third Whiteboard',
            droppable: false,
            data: {
                type: 'whiteboard',
                createdAt: 3000,
                updatedAt: 2000
            }
        },
        {
            id: 'interview-1',
            parent: 0,
            text: 'Fourth Interview',
            droppable: false,
            data: {
                type: 'interview',
                createdAt: 4000,
                updatedAt: 1000
            }
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        (useAuth as any).mockReturnValue({
            currentUser: { email: 'test@careervivid.com', displayName: 'Jiawen' },
            userProfile: { sidebarNodes: mockNodes },
            updateUserProfile: vi.fn(),
            logOut: vi.fn(),
            aiUsage: { count: 2, limit: 10 },
            isPremium: false
        });

        (useTheme as any).mockReturnValue({
            theme: 'dark',
            setTheme: vi.fn()
        });

        (useNavigation as any).mockReturnValue({
            toggleNavPosition: vi.fn(),
            toggleSidebarMode: vi.fn(),
            navPosition: 'side',
            sidebarMode: 'expanded',
            sidebarWidth: 256,
            setSidebarWidth: vi.fn()
        });

        (useSidebarStore as any).mockReturnValue({
            nodes: mockNodes,
            setNodes: vi.fn(),
            isInitialized: true,
            setIsInitialized: vi.fn(),
            updateNodeTitle: vi.fn(),
            deleteNode: vi.fn(),
            activeNodeId: null,
            setActiveNode: vi.fn()
        });
    });

    const renderFiles = () => {
        render(<Sidebar />);
        fireEvent.click(screen.getByRole('button', { name: 'Open Files' }));
    };

    it('Test 1: Render sidebar and verify all document files are visible by default in chronological order', () => {
        renderFiles();

        const items = screen.getAllByText(/(First Resume|Second Portfolio|Third Whiteboard|Fourth Interview)/);
        expect(items).toHaveLength(4);
        
        // Assert sorting: oldest createdAt first:
        // resume-1 (1000) -> portfolio-1 (2000) -> whiteboard-1 (3000) -> interview-1 (4000)
        expect(items[0]).toHaveTextContent('First Resume');
        expect(items[1]).toHaveTextContent('Second Portfolio');
        expect(items[2]).toHaveTextContent('Third Whiteboard');
        expect(items[3]).toHaveTextContent('Fourth Interview');
    });

    it('Test 2: Clicking the Sort/Filter menu button displays the options dropdown', () => {
        renderFiles();
        
        // Find dropdown button
        const dropdownButton = screen.getByTitle('Filter & Sort');
        expect(screen.queryByText('Filter By Type')).not.toBeInTheDocument();
        
        fireEvent.click(dropdownButton);
        expect(screen.getByText('Filter By Type')).toBeInTheDocument();
        expect(screen.getByText('Sort By')).toBeInTheDocument();
    });

    it('Test 3: Select type filter and verify only selected file type is displayed', () => {
        renderFiles();
        
        const dropdownButton = screen.getByTitle('Filter & Sort');
        fireEvent.click(dropdownButton);
        
        // Click on Resumes option in dropdown
        const resumesFilterOpt = screen.getByText('Resumes');
        fireEvent.click(resumesFilterOpt);
        
        // Only First Resume should be displayed
        expect(screen.getByText('First Resume')).toBeInTheDocument();
        expect(screen.queryByText('Second Portfolio')).not.toBeInTheDocument();
        expect(screen.queryByText('Third Whiteboard')).not.toBeInTheDocument();
        expect(screen.queryByText('Fourth Interview')).not.toBeInTheDocument();
    });

    it('Test 4: Sort by Recently Modified (updatedAt) and verify chronological descending sorting order', () => {
        renderFiles();
        
        const dropdownButton = screen.getByTitle('Filter & Sort');
        fireEvent.click(dropdownButton);
        
        // Click on "Recently Modified" option
        const recentlyModifiedOpt = screen.getByText('Recently Modified');
        fireEvent.click(recentlyModifiedOpt);
        
        // Sort order by updatedAt descending:
        // resume-1 (4000) -> portfolio-1 (3000) -> whiteboard-1 (2000) -> interview-1 (1000)
        const items = screen.getAllByText(/(First Resume|Second Portfolio|Third Whiteboard|Fourth Interview)/);
        expect(items[0]).toHaveTextContent('First Resume');
        expect(items[1]).toHaveTextContent('Second Portfolio');
        expect(items[2]).toHaveTextContent('Third Whiteboard');
        expect(items[3]).toHaveTextContent('Fourth Interview');
    });

    it('Test 5: Empty state renders correctly when no elements match type filter', () => {
        // Mock a state with only portfolios
        (useSidebarStore as any).mockReturnValue({
            nodes: [
                {
                    id: 'portfolio-1',
                    parent: 0,
                    text: 'Second Portfolio',
                    droppable: false,
                    data: {
                        type: 'portfolio',
                        createdAt: 2000,
                        updatedAt: 3000
                    }
                }
            ],
            setNodes: vi.fn(),
            isInitialized: true,
            setIsInitialized: vi.fn(),
            updateNodeTitle: vi.fn(),
            deleteNode: vi.fn(),
            activeNodeId: null,
            setActiveNode: vi.fn()
        });

        renderFiles();
        
        const dropdownButton = screen.getByTitle('Filter & Sort');
        fireEvent.click(dropdownButton);
        
        // Select Resumes filter
        const resumesFilterOpt = screen.getByText('Resumes');
        fireEvent.click(resumesFilterOpt);
        
        // Empty state is rendered
        expect(screen.getByText('No Files Found')).toBeInTheDocument();
        expect(screen.getByText('No items match the "resume" filter.')).toBeInTheDocument();
    });

    it('Test 6: Selecting filter and sorting options writes the selections to localStorage', () => {
        renderFiles();

        const dropdownButton = screen.getByTitle('Filter & Sort');
        fireEvent.click(dropdownButton);

        // Select 'Resumes' filter
        const resumesFilterOpt = screen.getByText('Resumes');
        fireEvent.click(resumesFilterOpt);

        const currentPreferences = JSON.parse(localStorage.getItem('cv_sidebar_preferences') || '{}');
        expect(currentPreferences.filterType).toBe('resume');

        // Select 'Recently Modified' sort option
        const recentlyModifiedOpt = screen.getByText('Recently Modified');
        fireEvent.click(recentlyModifiedOpt);

        const updatedPreferences = JSON.parse(localStorage.getItem('cv_sidebar_preferences') || '{}');
        expect(updatedPreferences.filterType).toBe('resume');
        expect(updatedPreferences.sortBy).toBe('updatedAt');
    });

    it('Test 7: Renders sidebar using saved preferences from localStorage on mount', () => {
        // Set initial preferences in localStorage
        localStorage.setItem('cv_sidebar_preferences', JSON.stringify({
            filterType: 'interview',
            sortBy: 'updatedAt'
        }));

        renderFiles();

        // Should only render the interview item: 'Fourth Interview'
        expect(screen.getByText('Fourth Interview')).toBeInTheDocument();
        expect(screen.queryByText('First Resume')).not.toBeInTheDocument();
        expect(screen.queryByText('Second Portfolio')).not.toBeInTheDocument();
        expect(screen.queryByText('Third Whiteboard')).not.toBeInTheDocument();
    });

    it('Test 8: Language selector persists the workspace language and navigates to the localized dashboard path', () => {
        window.history.pushState({}, '', '/dashboard');

        render(<Sidebar />);

        const languageSelect = screen.getByLabelText('Language');
        fireEvent.change(languageSelect, { target: { value: 'zh' } });

        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh');
        expect(mockNavigate).toHaveBeenCalledWith('/zh/dashboard');
    });
});
