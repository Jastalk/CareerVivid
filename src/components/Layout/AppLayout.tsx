import React, { ReactNode, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../Navigation/Sidebar';
import { MenuBar, PublicFooter } from '../Landing/live/PublicShell';
// LICENSE REQUIREMENT: This attribution badge must remain intact and visible per the repository license.
import OpenSourceAttribution from '../OpenSourceAttribution';

interface AppLayoutProps {
    children: ReactNode;
    /**
     * Opt in to the public chrome for signed-out visitors.
     *
     * /learning and /interview-studio are reachable without an account, and a
     * visitor landing there had no way back to the rest of the site: the
     * sidebar is the product's navigation, not the site's. With this set, a
     * signed-out visitor gets the same MenuBar and PublicFooter as every other
     * public page INSTEAD OF the sidebar — never both, because two navigations
     * stacked is worse than either alone. Signed-in users are unaffected.
     */
    publicWhenSignedOut?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, publicWhenSignedOut = false }) => {
    const { sidebarMode, sidebarWidth } = useNavigation();
    const { currentUser, loading: authLoading } = useAuth();
    const activeSidebarWidth = sidebarMode === 'collapsed' ? 72 : sidebarWidth;
    /*
     * While auth is still resolving we assume signed in, so a returning user
     * refreshing the page never sees the public header flash in and out before
     * their sidebar arrives.
     */
    const showPublicChrome = publicWhenSignedOut && !authLoading && !currentUser;

    useEffect(() => {
        document.documentElement.classList.add('cv-product-density-root');
        document.body.classList.add('cv-product-density-body');

        if (window.scrollX !== 0) {
            window.scrollTo({ left: 0, top: window.scrollY });
        }

        return () => {
            document.documentElement.classList.remove('cv-product-density-root');
            document.body.classList.remove('cv-product-density-body');
        };
    }, []);

    if (showPublicChrome) {
        return (
            /*
             * No cv-design-page/-grid and no cv-product-density-viewport here:
             * the first two paint the product's surface under a page that is
             * now public, and the third sizes itself off --sidebar-width, which
             * this branch never sets.
             */
            <div className="cvl cv-product-density flex min-h-screen flex-col">
                <MenuBar />
                <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">{children}</main>
                <PublicFooter />
                {/* LICENSE REQUIREMENT: keep the attribution badge on this path too. */}
                <OpenSourceAttribution />
            </div>
        );
    }

    return (
        <div
            className="cv-product-density cv-design-page cv-design-grid flex min-h-screen"
            style={{ '--sidebar-width': `${activeSidebarWidth}px` } as React.CSSProperties}
        >
            <Sidebar />
            <main className="cv-product-density-main cv-design-page cv-design-grid flex min-w-0 flex-1 flex-col overflow-x-hidden transition-[padding-left] duration-200 ease-in-out md:pl-[var(--sidebar-width)]">
                <div className="cv-product-density-viewport flex min-h-0 flex-1 flex-col">{children}</div>
                <div className="cv-product-density-footer mt-auto">
                    <OpenSourceAttribution />
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
