import { useEffect, useState } from 'react';

export interface BrowserNavigationRequest {
    search: string;
    revision: number;
}

/**
 * Observe every in-app History API navigation, including repeated requests for
 * the exact same URL. A URL string alone cannot represent "open this again".
 */
export function useBrowserNavigationRequest(): BrowserNavigationRequest {
    const [request, setRequest] = useState<BrowserNavigationRequest>(() => ({
        search: typeof window === 'undefined' ? '' : window.location.search,
        revision: 0,
    }));

    useEffect(() => {
        const handleNavigation = () => {
            setRequest((current) => ({
                search: window.location.search,
                revision: current.revision + 1,
            }));
        };

        window.addEventListener('popstate', handleNavigation);
        return () => window.removeEventListener('popstate', handleNavigation);
    }, []);

    return request;
}
