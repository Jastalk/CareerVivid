/// <reference types="chrome" />
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ExtensionLogin from '../pages/ExtensionLogin';
import ExtensionHome from '../pages/ExtensionHome';

const ExtensionLayout: React.FC = () => {
    const { currentUser, loading: authLoading } = useAuth();
    const { theme, resolvedTheme } = useTheme();
    const [cookieAuth, setCookieAuth] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Ask the background service worker to hydrate auth. The popup is
    // transient, so cookies/IndexedDB/tabs must be checked outside React.
    useEffect(() => {
        const hydrateAuth = () => {
            if (typeof chrome === 'undefined' || !chrome.runtime) {
                setCookieAuth(false);
                setIsLoading(false);
                return;
            }

            chrome.runtime.sendMessage({ type: 'HYDRATE_AUTH' }, (response) => {
                const err = chrome.runtime.lastError;
                if (err) {
                    setCookieAuth(false);
                    setIsLoading(false);
                    return;
                }

                setCookieAuth(response?.isAuthenticated === true);
                setIsLoading(false);
            });
        };

        hydrateAuth();

        // Listen for auth state changes from background script
        const handleMessage = (message: any) => {
            if (message.type === 'AUTH_STATE_CHANGED') {
                setCookieAuth(message.isAuthenticated);
                setIsLoading(false);
            }
        };

        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener(handleMessage);
            const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
                if (areaName !== 'local') return;
                
                const authKeys = ['isAuthenticated', 'firebaseIdToken', 'authToken', 'uid', 'devModeAuth'];
                const anyKeyChanged = authKeys.some(key => changes[key] !== undefined);
                
                if (anyKeyChanged) {
                    const isAnyKeyCleared = authKeys.some(key => {
                        const change = changes[key];
                        return change && (change.newValue === null || change.newValue === undefined);
                    });
                    
                    if (isAnyKeyCleared) {
                        // Synchronously drop context and loading state on sign-out!
                        setCookieAuth(false);
                        setIsLoading(false);
                    } else {
                        // Async fetch: Retrieve fresh state
                        chrome.storage.local.get(authKeys, (stored) => {
                            const isAuth = (stored.isAuthenticated === true || stored.devModeAuth === true) && 
                                           !!stored.uid && 
                                           !!(stored.firebaseIdToken || stored.authToken || stored.devModeAuth);
                            setCookieAuth(isAuth);
                            setIsLoading(false);
                        });
                    }
                }
            };
            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => {
                chrome.runtime.onMessage.removeListener(handleMessage);
                chrome.storage.onChanged.removeListener(handleStorageChange);
            };
        }
    }, []);

    // Determine if user is authenticated (Firebase Auth OR cookie-based)
    const isAuthenticated = currentUser || cookieAuth === true;
    const stillLoading = (authLoading && cookieAuth === null) || isLoading;
    const rootThemeClasses = new Set(['cv-extension-root', `cv-theme-${theme}`]);
    if (resolvedTheme === 'dark') {
        rootThemeClasses.add('dark');
        rootThemeClasses.add('cv-theme-dark');
    }
    const rootThemeClass = Array.from(rootThemeClasses).join(' ');

    // Loading state
    if (stillLoading) {
        return (
            <div className={`${rootThemeClass} min-h-[520px] h-screen w-full bg-[#f8f8fb] flex items-center justify-center dark:bg-[#1f1f1d]`}>
                <div className="mx-4 w-full max-w-[320px] rounded-[24px] border border-[#ececf4] bg-white p-5 text-center shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:border-[#3a3834] dark:bg-[#262522] dark:shadow-none">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f2ff] text-[#4a4392] dark:bg-[#302f49] dark:text-[#b8b3ff]">
                        <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-950 dark:text-[#f4f1e9]">Preparing your CareerVivid workspace...</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-[#aaa39a]">Checking your extension session.</p>
                </div>
            </div>
        );
    }

    // If not authenticated, show Login screen
    if (!isAuthenticated) {
        return (
            <div className={`${rootThemeClass} min-h-[520px] h-screen w-full`}>
                <div className="bg-white min-h-[520px] h-full text-gray-900 dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
                    <ExtensionLogin />
                </div>
            </div>
        );
    }

    // Authenticated View: Show Home Dashboard
    return (
        <div className={`${rootThemeClass} min-h-[520px] h-screen w-full`}>
            <div className="bg-[#f8f8fb] min-h-[520px] h-full text-gray-900 dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
                <ExtensionHome />
            </div>
        </div>
    );
};

export default ExtensionLayout;
