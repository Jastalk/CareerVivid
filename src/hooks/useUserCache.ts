import { useEffect } from 'react';
import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface UserProfile {
    uid: string;
    displayName: string;
    photoURL?: string;
    headline?: string;
    avatarUrl?: string; // fallback field names seen in codebase
}

interface UserCacheState {
    cache: Record<string, UserProfile | null>; // null means fetched but not found
    loading: Record<string, boolean>;
    fetchUser: (userId: string) => Promise<UserProfile | null>;
}

export const useUserCacheStore = create<UserCacheState>((set, get) => ({
    cache: {},
    loading: {},
    fetchUser: async (userId: string) => {
        // If already in cache (including null), return it
        const currentCache = get().cache;
        if (userId in currentCache) {
            return currentCache[userId];
        }

        // Check if already loading
        if (get().loading[userId]) {
            // Wait for it? Or just return null for now. 
            // In a real hook we'd subscribe to the store.
            return null;
        }

        set((state) => ({
            loading: { ...state.loading, [userId]: true }
        }));

        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            let userData: UserProfile | null = null;

            if (userDoc.exists()) {
                const data = userDoc.data();
                userData = {
                    uid: userId,
                    displayName: data.displayName || data.firstName || 'Anonymous User',
                    photoURL: data.photoURL || data.avatarUrl || '',
                    headline: data.headline || data.professionalRole || '',
                };
            }

            set((state) => ({
                cache: { ...state.cache, [userId]: userData },
                loading: { ...state.loading, [userId]: false }
            }));

            return userData;
        } catch (error) {
            /*
             * Record the failure in the cache, not just in `loading`.
             *
             * Clearing `loading` alone left the id absent from `cache`, which is
             * the exact condition the hook below uses to decide it should fetch.
             * Every failure therefore scheduled another attempt on the next
             * render: a profile the rules deny produced an unbounded stream of
             * identical `permission-denied` reads rather than one.
             *
             * `null` already means "fetched, nothing to show" for the success
             * path, so a denied read settles into the same state.
             */
            console.error(`Error fetching user ${userId}:`, error);
            set((state) => ({
                cache: { ...state.cache, [userId]: null },
                loading: { ...state.loading, [userId]: false }
            }));
            return null;
        }
    },
}));

/**
 * A hook-friendly wrapper around the user cache store.
 * Returns the cached user data and a loading state.
 */
export const useUserCache = (userId: string | null | undefined) => {
    const { cache, loading, fetchUser } = useUserCacheStore();

    const user = userId ? cache[userId] : null;
    const isLoading = userId ? loading[userId] : false;
    const isCached = userId ? userId in cache : false;

    // In an effect, not during render: a fetch is a side effect, and firing it
    // from the render body runs it twice per mount under StrictMode.
    useEffect(() => {
        if (userId && !isCached && !loading[userId]) {
            void fetchUser(userId);
        }
    }, [userId, isCached, loading, fetchUser]);

    return { user, isLoading };
};
