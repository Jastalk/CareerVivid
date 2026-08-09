import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBrowserNavigationRequest } from './useBrowserNavigationRequest';

describe('useBrowserNavigationRequest', () => {
    afterEach(() => {
        window.history.replaceState({}, '', '/');
    });

    it('reports query changes made through in-app navigation', () => {
        const { result } = renderHook(() => useBrowserNavigationRequest());

        act(() => {
            window.history.pushState({}, '', '/quest/openai?stage=system_design&systemDesignChallenge=chatgpt-scale');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        expect(result.current.search).toBe('?stage=system_design&systemDesignChallenge=chatgpt-scale');
        expect(result.current.revision).toBe(1);
    });

    it('treats the same URL as a new request so a closed workspace can reopen', () => {
        window.history.replaceState({}, '', '/quest/openai?stage=system_design&systemDesignChallenge=chatgpt-scale');
        const { result } = renderHook(() => useBrowserNavigationRequest());

        act(() => window.dispatchEvent(new PopStateEvent('popstate')));
        act(() => window.dispatchEvent(new PopStateEvent('popstate')));

        expect(result.current.search).toBe('?stage=system_design&systemDesignChallenge=chatgpt-scale');
        expect(result.current.revision).toBe(2);
    });
});
