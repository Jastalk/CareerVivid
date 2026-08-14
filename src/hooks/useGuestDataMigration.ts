
import { useEffect, useRef } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { usePortfolios } from './usePortfolios';
import { db } from '../firebase';
import { navigate } from '../utils/navigation';
import { ResumeData } from '../types';
import { createBlankResume } from '../constants';

// Hooks for other data types if needed, e.g. useResumes
// For now we focus on Portfolios as per user request
// But we should also handle Resumes/Interviews if they were part of guest data

const GUEST_RESUME_KEY = 'guestResume';

/** Key order does not survive a JSON round trip reliably; sort it out first. */
const stableStringify = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([key]) => key !== 'id' && key !== 'updatedAt')
            .sort(([a], [b]) => a.localeCompare(b));
        return `{${entries.map(([key, inner]) => `${JSON.stringify(key)}:${stableStringify(inner)}`).join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
};

/**
 * True when the draft is the blank one the editor starts with, untouched.
 *
 * `personalDetails` being present says nothing — createBlankResume always
 * supplies it — so a visitor who opened the editor, typed nothing and signed up
 * a week later used to get an empty "Untitled Resume" imported into their
 * account. On the free tier that is the one resume slot they have, and their
 * first real save then fails with RESUME_LIMIT_REACHED.
 */
const isUntouchedBlankDraft = (draft: ResumeData): boolean =>
    stableStringify(draft) === stableStringify(createBlankResume());

const PAID_PLANS = ['pro', 'max', 'pro_max', 'enterprise', 'pro_monthly', 'pro_sprint', 'premium'];

/**
 * How many resumes this account may hold.
 *
 * Mirrors the check in useResumes.saveAIGeneratedResume so the migration cannot
 * quietly push a free account past its own limit.
 */
const getResumeLimit = async (uid: string) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const userData = userDoc.data();
    const isPaidPlan = PAID_PLANS.includes(userData?.plan || '');
    const hasLegacyPremium = userData?.promotions?.isPremium === true;
    return (isPaidPlan || hasLegacyPremium) ? 9999 : (userData?.resumeLimit || 1);
};

/**
 * Move the signed-out draft into the new account.
 *
 * This used to read `guestResume` and then delete it without writing it
 * anywhere, so signing up — the one moment the guest editor exists to reach —
 * was also the moment the work disappeared. Now the draft is claimed out of
 * localStorage first (so the dashboard's own importer cannot save a second
 * copy), written to Firestore, and put back on the shelf untouched if the
 * write fails or the account is already full.
 */
export const useGuestDataMigration = () => {
    const { currentUser } = useAuth();
    const { createPortfolio } = usePortfolios();
    const hasMigratedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!currentUser) return;
        // StrictMode runs effects twice in development; a double run here would
        // mean two copies of the same resume.
        if (hasMigratedRef.current === currentUser.uid) return;
        hasMigratedRef.current = currentUser.uid;

        const migrateGuestData = async () => {
            // 1. Migrate Portfolios
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('portfolio_')) {
                    try {
                        const portfolioJSON = localStorage.getItem(key);
                        if (portfolioJSON) {
                            const portfolioData = JSON.parse(portfolioJSON);
                            // Only migrate if valid portfolio data
                            if (portfolioData.title && portfolioData.hero) {
                                // Ensure we create it for the current user (override guest ID/User)
                                const { id, userId, ...dataToSave } = portfolioData;
                                // createPortfolio handles adding userId and timestamps
                                await createPortfolio({ ...portfolioData, userId: currentUser.uid });

                                localStorage.removeItem(key);
                                console.log(`[Migration] Successfully migrated portfolio: ${key}`);
                            }
                        }
                    } catch (e) {
                        console.error(`[Migration] Failed to migrate portfolio ${key}:`, e);
                    }
                }
            }

            // 2. Migrate the guest resume draft into the account.
            const guestResumeJSON = localStorage.getItem(GUEST_RESUME_KEY);
            if (guestResumeJSON) {
                let draft: ResumeData | null = null;
                try {
                    draft = JSON.parse(guestResumeJSON) as ResumeData;
                } catch (e) {
                    console.error('[Migration] guestResume was corrupt; discarding it.', e);
                    localStorage.removeItem(GUEST_RESUME_KEY);
                }

                if (draft && typeof draft === 'object' && isUntouchedBlankDraft(draft)) {
                    // Nothing was ever typed into it. Drop it rather than
                    // spending a resume slot on a blank document.
                    localStorage.removeItem(GUEST_RESUME_KEY);
                } else if (draft && typeof draft === 'object' && draft.personalDetails) {
                    // Claim the draft before writing. The dashboard runs its
                    // own importer half a second after sign-in, and whichever of
                    // us reads it second would save a duplicate — claiming only
                    // works because useDashboard now claims it the same way
                    // (read, remove, then write, and put it back on failure).
                    // If either side went back to removing the key AFTER its
                    // await, a slow write on this side would let both through.
                    localStorage.removeItem(GUEST_RESUME_KEY);

                    try {
                        const resumesCol = collection(db, 'users', currentUser.uid, 'resumes');
                        const resumeLimit = await getResumeLimit(currentUser.uid);
                        // Only free-tier limits are small enough to be worth
                        // counting; paid plans are effectively unlimited and
                        // reading 9999 documents to prove it would be absurd.
                        if (resumeLimit <= 20) {
                            const existing = await getDocs(query(resumesCol, limit(resumeLimit)));
                            if (existing.size >= resumeLimit) {
                                throw new Error('RESUME_LIMIT_REACHED');
                            }
                        }

                        const { id, updatedAt, ...dataToSave } = draft as ResumeData & { updatedAt?: unknown };
                        const saved = await addDoc(resumesCol, {
                            ...dataToSave,
                            updatedAt: serverTimestamp(),
                        });
                        console.log('[Migration] Guest resume saved to the account:', saved.id);

                        // If they are still looking at the local draft, move them
                        // onto the saved copy so the next edit is the one that
                        // persists. The path check allows a language prefix.
                        if (typeof window !== 'undefined' && /\/edit\/(guest|new)(\/|$)/.test(window.location.pathname)) {
                            navigate(`/edit/${saved.id}`);
                        }
                    } catch (e) {
                        // Put it back. A failed migration must not be the same
                        // thing as a deleted resume.
                        try {
                            localStorage.setItem(GUEST_RESUME_KEY, guestResumeJSON);
                        } catch (storageError) {
                            console.error('[Migration] Could not restore the guest draft:', storageError);
                        }
                        /*
                         * Say something. The person signing up at this exact
                         * moment is doing it to keep this resume; dropping them
                         * on a dashboard that does not contain it, with the
                         * draft silently back in localStorage and nothing on
                         * screen, is the worst version of this failing.
                         * useResumes.saveAIGeneratedResume alerts on the same
                         * condition, and this mirrors it.
                         */
                        if (e instanceof Error && e.message === 'RESUME_LIMIT_REACHED') {
                            console.warn('[Migration] Account is at its resume limit; guest draft left in this browser.');
                            alert('You have reached your resume storage limit, so the draft you started could not be added to your account. It is still saved in this browser — upgrade your plan or delete a resume, then reload to save it.');
                        } else {
                            console.error('[Migration] Failed to save the guest resume:', e);
                            alert('We could not add the draft you started to your account. It is still saved in this browser — reload the page to try again.');
                        }
                    }
                }
            }

            // 3. Cleanup other legacy items
            localStorage.removeItem('guestPortfolios'); // Legacy key check
        };

        // Run migration logic
        migrateGuestData();

    }, [currentUser, createPortfolio]);
};
