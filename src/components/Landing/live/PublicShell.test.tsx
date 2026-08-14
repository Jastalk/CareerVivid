import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MenuBar, PublicFooter, resumeHref } from './PublicShell';

const mockUser = vi.fn();
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: mockUser() }) }));

describe('the resume link in public chrome', () => {
    it('sends a guest to the door that opens without an account', () => {
        // /newresume is behind ProtectedRoute — a guest sent there hits a
        // sign-in wall, which is the opposite of what the guest editor is for.
        expect(resumeHref(false)).toBe('/edit/new');
    });

    it('sends a signed-in user to their saved resumes, not a throwaway draft', () => {
        expect(resumeHref(true)).toBe('/newresume');
    });

    it.each([
        ['guest', null, '/edit/new'],
        ['signed in', { uid: 'u1' }, '/newresume'],
    ])('menu bar and footer agree for a %s visitor', (_label, user, expected) => {
        mockUser.mockReturnValue(user);
        const { container } = render(<><MenuBar /><PublicFooter /></>);
        const hrefs = [...container.querySelectorAll('a')]
            .filter((a) => /resume/i.test(a.textContent ?? ''))
            .map((a) => a.getAttribute('href'));

        expect(hrefs.length).toBe(2);
        expect(new Set(hrefs)).toEqual(new Set([expected]));
    });

    it('offers the dashboard instead of "sign in" once you are signed in', () => {
        mockUser.mockReturnValue({ uid: 'u1' });
        render(<MenuBar />);
        expect(screen.getByText('dashboard')).toBeInTheDocument();
        expect(screen.queryByText('sign in')).toBeNull();
    });
});
