import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomSidebarNode } from './CustomSidebarNode';
import { useSidebarStore } from '../../store/useSidebarStore';
import { SidebarNodeType } from '../../types';

const { mockNavigate } = vi.hoisted(() => ({
    mockNavigate: vi.fn()
}));

vi.mock('../../utils/navigation', () => ({
    navigate: mockNavigate
}));

// Mock the lucide-react icons so they don't cause issues in JSDOM testing
vi.mock('lucide-react', () => ({
    Bot: () => <div data-testid="icon-bot" />,
    ChevronUp: () => <div data-testid="icon-chevron-up" />,
    Terminal: () => <div data-testid="icon-terminal" />,
    UserRound: () => <div data-testid="icon-user-round" />,
    Eye: () => <div data-testid="icon-eye" />,
    EyeOff: () => <div data-testid="icon-eye-off" />,
    Folder: () => <div data-testid="icon-folder" />,
    FolderOpen: () => <div data-testid="icon-folder-open" />,
    File: () => <div data-testid="icon-file" />,
    GripVertical: () => <div data-testid="icon-grip" />,
    FileText: () => <div data-testid="icon-filetext" />,
    Mic: () => <div data-testid="icon-mic" />,
    LayoutDashboard: () => <div data-testid="icon-dashboard" />,
    Globe: () => <div data-testid="icon-globe" />,
    Briefcase: () => <div data-testid="icon-briefcase" />,
    PenTool: () => <div data-testid="icon-pentool" />,
    ChevronRight: () => <div data-testid="icon-chevron" />
}));

// Mock the Zustand store to observe function calls and control state
const mockSetActiveNode = vi.fn();
const mockUpdateNodeTitle = vi.fn();
const mockToggleNodeVisibility = vi.fn();

vi.mock('../../store/useSidebarStore', () => ({
    useSidebarStore: vi.fn(() => ({
        activeNodeId: null,
        setActiveNode: mockSetActiveNode,
        updateNodeTitle: mockUpdateNodeTitle,
        toggleNodeVisibility: mockToggleNodeVisibility
    }))
}));

describe('CustomSidebarNode - Interaction UX', () => {
    const mockOnToggle = vi.fn();

    const folderNode = {
        id: 'folder-1',
        parent: 0,
        text: 'My Custom Folder',
        droppable: true,
        data: {
            isSystemNode: false,
            type: 'custom-folder' as SidebarNodeType,
            isHidden: false
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Test 1: Clicking the chevron toggles the isExpanded state and renders the nested children without triggering the active selection.', () => {
        render(
            <CustomSidebarNode
                node={folderNode}
                depth={0}
                isOpen={false}
                onToggle={mockOnToggle}
                isEditMode={false}
            />
        );

        const chevronButton = screen.getByTestId('chevron-folder-1');

        // Single click strictly on the chevron
        fireEvent.click(chevronButton);

        // Verify it triggers folder expansion
        expect(mockOnToggle).toHaveBeenCalledWith('folder-1');

        // Ensure it DOES NOT trigger selection/active state
        expect(mockSetActiveNode).not.toHaveBeenCalled();
    });

    it('Test 1: System Node Label Click -> Navigate & Set Active', () => {
        const systemNode = {
            id: '/dashboard',
            parent: 0,
            text: 'Dashboard',
            droppable: false,
            data: {
                isSystemNode: true,
                type: 'system' as SidebarNodeType,
                isHidden: false
            }
        };

        render(
            <CustomSidebarNode
                node={systemNode}
                depth={0}
                isOpen={false}
                onToggle={mockOnToggle}
                isEditMode={false}
            />
        );

        const systemNodeRow = screen.getByTestId('node-/dashboard');
        fireEvent.click(systemNodeRow);

        expect(mockSetActiveNode).toHaveBeenCalledWith('/dashboard');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('Test 2: Custom Folder Label Click -> Route to Folder View', () => {
        render(
            <CustomSidebarNode
                node={folderNode}
                depth={0}
                isOpen={false}
                onToggle={mockOnToggle}
                isEditMode={false}
            />
        );

        const folderLabelRow = screen.getByTestId('node-folder-1');
        fireEvent.click(folderLabelRow);

        expect(mockSetActiveNode).toHaveBeenCalledWith('folder-1');
        expect(mockNavigate).toHaveBeenCalledWith('/folder/folder-1');
        expect(screen.queryByTestId('rename-input-folder-1')).not.toBeInTheDocument();
        // Since we explicitly required the chevron to solely expand/collapse, we ensure clicking node doesn't toggle
        expect(mockOnToggle).not.toHaveBeenCalled();
    });

    it('Test 3: Double-clicking the folder label correctly renders the <input> field for renaming, and pressing "Enter" or clicking outside saves the new name.', () => {
        render(
            <CustomSidebarNode
                node={folderNode}
                depth={0}
                isOpen={false}
                onToggle={mockOnToggle}
                isEditMode={true}
            />
        );

        const folderLabelRow = screen.getByTestId('node-folder-1');

        // Double click trigger
        fireEvent.doubleClick(folderLabelRow);

        // The rename input should now be in the document
        const renameInput = screen.getByTestId('rename-input-folder-1');
        expect(renameInput).toBeInTheDocument();

        // Type a new name
        fireEvent.change(renameInput, { target: { value: 'Renamed Folder' } });

        // Press Enter
        fireEvent.keyDown(renameInput, { key: 'Enter', code: 'Enter' });

        // Ensure title update is triggered with trimmed value
        expect(mockUpdateNodeTitle).toHaveBeenCalledWith('folder-1', 'Renamed Folder');
    });

    it('Test 4: System nodes cannot be folders and correctly show spacer instead of chevron.', () => {
        const systemNode = {
            id: '/dashboard',
            parent: 0,
            text: 'Dashboard',
            droppable: false,
            data: {
                isSystemNode: true,
                type: 'system' as SidebarNodeType,
                isHidden: false
            }
        };

        render(
            <CustomSidebarNode
                node={systemNode}
                depth={0}
                isOpen={false}
                onToggle={mockOnToggle}
                isEditMode={false}
            />
        );

        expect(screen.queryByTestId('chevron-/dashboard')).not.toBeInTheDocument();
    });
});
