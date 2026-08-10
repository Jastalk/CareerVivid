import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CustomSidebarNode } from './CustomSidebarNode';
import { useSidebarStore } from '../../store/useSidebarStore';
import { SidebarNodeType } from '../../types';

// Mock the Custom Router Utility
const { mockNavigate } = vi.hoisted(() => ({
    mockNavigate: vi.fn()
}));

vi.mock('../../utils/navigation', () => ({
    navigate: mockNavigate
}));

// Mock the lucide-react icons
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

describe('Sidebar Integration - Routing Behavior', () => {
    const mockOnToggle = vi.fn();

    const folderNode = {
        id: 'folder-12345',
        parent: 0,
        text: 'My Custom Folder',
        droppable: true,
        data: {
            isSystemNode: false,
            type: 'custom-folder' as SidebarNodeType,
            isHidden: false
        }
    };

    const systemHubNode = {
        id: '/hub',
        parent: 0,
        text: 'Create & Build Hub',
        droppable: true,
        data: {
            isSystemNode: true,
            type: 'system-hub' as SidebarNodeType,
            isHidden: false
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Test 1: Render the Sidebar and click a "New Folder" node -> Verify it hits the dynamic route', () => {
        render(
            <MemoryRouter>
                <CustomSidebarNode
                    node={folderNode}
                    depth={0}
                    isOpen={false}
                    onToggle={mockOnToggle}
                    isEditMode={false}
                />
            </MemoryRouter>
        );

        const folderRow = screen.getByTestId('node-folder-12345');
        fireEvent.click(folderRow);

        expect(mockNavigate).toHaveBeenCalledWith('/folder/folder-12345');
        expect(mockSetActiveNode).toHaveBeenCalledWith('folder-12345');
    });

    it('Test 2: Click the "Create & Build Hub" node -> Verify it hits the static `/hub` route', () => {
        render(
            <MemoryRouter>
                <CustomSidebarNode
                    node={systemHubNode}
                    depth={0}
                    isOpen={false}
                    onToggle={mockOnToggle}
                    isEditMode={false}
                />
            </MemoryRouter>
        );

        const hubRow = screen.getByTestId('node-/hub');
        fireEvent.click(hubRow);

        expect(mockNavigate).toHaveBeenCalledWith('/hub');
        expect(mockSetActiveNode).toHaveBeenCalledWith('/hub');
    });
});
