


import { useState, useEffect, useCallback } from 'react';
import { ResumeData, PersonalDetails } from '../types';
import { createBlankResume } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { navigate } from '../utils/navigation';

function parseFirestoreRestValue(val: any): any {
    if (!val) return null;
    const type = Object.keys(val)[0];
    const value = val[type];
    
    switch (type) {
        case 'stringValue':
            return value;
        case 'integerValue':
            return parseInt(value, 10);
        case 'doubleValue':
            return parseFloat(value);
        case 'booleanValue':
            return value;
        case 'nullValue':
            return null;
        case 'timestampValue':
            return value;
        case 'arrayValue':
            const values = value.values || [];
            return values.map(parseFirestoreRestValue);
        case 'mapValue':
            const fields = value.fields || {};
            const result: Record<string, any> = {};
            for (const key in fields) {
                result[key] = parseFirestoreRestValue(fields[key]);
            }
            return result;
        default:
            return value;
    }
}

function parseFirestoreRestDoc(doc: any): any {
    const fields = doc.fields || {};
    const result: Record<string, any> = {};
    for (const key in fields) {
        result[key] = parseFirestoreRestValue(fields[key]);
    }
    const parts = doc.name.split('/');
    result.id = parts[parts.length - 1];
    return result;
}

export const useResumes = (userIdOverride?: string | null) => {
    const { currentUser } = useAuth();
    const [resumes, setResumes] = useState<ResumeData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const activeUid = userIdOverride !== undefined ? userIdOverride : currentUser?.uid;

    useEffect(() => {
        if (!activeUid) {
            setResumes([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const isExtension = typeof chrome !== 'undefined' && chrome.storage;
        let unsubscribe: (() => void) | null = null;
        let isCancelled = false;

        if (isExtension) {
            chrome.storage.local.get(['firebaseIdToken', 'autofillProfile'], (result) => {
                if (isCancelled) return;
                const token = result.firebaseIdToken;
                if (token && token === 'mock-dev-id-token') {
                    chrome.storage.local.remove([
                        'devModeAuth',
                        'autofillProfile',
                        'selectedResumeId',
                        'firebaseIdToken',
                        'uid',
                        'isAuthenticated',
                    ]);
                    setResumes([]);
                    setIsLoading(false);
                } else if (token && !currentUser) {
                    fetchResumesRest(token);
                } else {
                    setupRealtimeSync();
                }
            });
        } else {
            setupRealtimeSync();
        }

        function setupRealtimeSync() {
            if (isCancelled) return;
            const resumesCol = collection(db, 'users', activeUid, 'resumes');
            const q = query(resumesCol, orderBy('updatedAt', 'desc'));

            unsubscribe = onSnapshot(q, (querySnapshot) => {
                const resumesFromDb: ResumeData[] = [];
                const blankResume = createBlankResume();

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const hydratedData = {
                        ...blankResume,
                        ...data,
                        id: doc.id,
                        section: data.section || 'resumes',
                        personalDetails: {
                            ...blankResume.personalDetails,
                            ...(data.personalDetails || {}),
                        },
                        websites: data.websites || [],
                        skills: data.skills || [],
                        employmentHistory: data.employmentHistory || [],
                        education: data.education || [],
                        languages: data.languages || [],
                        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString())
                    };
                    resumesFromDb.push(hydratedData as ResumeData);
                });
                setResumes(resumesFromDb);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching resumes:", error);
                setIsLoading(false);
            });
        }

        async function fetchResumesRest(idToken: string) {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ type: 'FETCH_RESUMES', userId: activeUid }, (res) => {
                    const err = chrome.runtime.lastError; // Suppress unchecked runtime.lastError
                    if (isCancelled) return;
                    if (res?.success && res.resumes) {
                        const resumesFromDb: ResumeData[] = [];
                        const blankResume = createBlankResume();
                        res.resumes.forEach((parsedData: any) => {
                            const hydratedData = {
                                ...blankResume,
                                ...parsedData,
                                id: parsedData.id,
                                section: parsedData.section || 'resumes',
                                personalDetails: {
                                    ...blankResume.personalDetails,
                                    ...(parsedData.personalDetails || {}),
                                },
                                websites: parsedData.websites || [],
                                skills: parsedData.skills || [],
                                employmentHistory: parsedData.employmentHistory || [],
                                education: parsedData.education || [],
                                languages: parsedData.languages || [],
                                updatedAt: parsedData.updatedAt || new Date().toISOString()
                            };
                            resumesFromDb.push(hydratedData as ResumeData);
                        });
                        resumesFromDb.sort((a, b) => {
                            const dateA = new Date(a.updatedAt || 0).getTime();
                            const dateB = new Date(b.updatedAt || 0).getTime();
                            return dateB - dateA;
                        });
                        setResumes(resumesFromDb);
                    } else {
                        if (res?.error === 'invalid_auth_token' || res?.error === 'Mock or invalid token') {
                            console.log("Invalid extension auth token; waiting for real CareerVivid sign-in");
                        } else {
                            console.log("Could not fetch resumes via background REST (expected in dev bypass mode):", res?.error || err?.message);
                        }
                        setResumes([]);
                    }
                    setIsLoading(false);
                });
                return;
            }

            if (!idToken || idToken === 'mock-dev-id-token') {
                console.log("Invalid extension auth token; waiting for real CareerVivid sign-in");
                setResumes([]);
                setIsLoading(false);
                return;
            }

            try {
                const url = `https://firestore.googleapis.com/v1/projects/jastalk-firebase/databases/(default)/documents/users/${activeUid}/resumes`;
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${idToken}`
                    }
                });
                if (isCancelled) return;
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const documents = data.documents || [];
                const resumesFromDb: ResumeData[] = [];
                const blankResume = createBlankResume();

                documents.forEach((doc: any) => {
                    const parsedData = parseFirestoreRestDoc(doc);
                    const hydratedData = {
                        ...blankResume,
                        ...parsedData,
                        id: parsedData.id,
                        section: parsedData.section || 'resumes',
                        personalDetails: {
                            ...blankResume.personalDetails,
                            ...(parsedData.personalDetails || {}),
                        },
                        websites: parsedData.websites || [],
                        skills: parsedData.skills || [],
                        employmentHistory: parsedData.employmentHistory || [],
                        education: parsedData.education || [],
                        languages: parsedData.languages || [],
                        updatedAt: parsedData.updatedAt || new Date().toISOString()
                    };
                    resumesFromDb.push(hydratedData as ResumeData);
                });

                resumesFromDb.sort((a, b) => {
                    const dateA = new Date(a.updatedAt || 0).getTime();
                    const dateB = new Date(b.updatedAt || 0).getTime();
                    return dateB - dateA;
                });

                setResumes(resumesFromDb);
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching resumes via REST:", error);
                setIsLoading(false);
            }
        }

        return () => {
            isCancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [activeUid, currentUser]);

    const getResumeById = useCallback((id: string): ResumeData | undefined => {
        return resumes.find(r => r.id === id);
    }, [resumes]);

    const addResume = useCallback(() => {
        navigate('/newresume');
    }, []);

    const addBlankResume = useCallback(async () => {
        if (!activeUid) return;
        try {
            // Check resume limit before creating
            const userDocRef = doc(db, 'users', activeUid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data();

            // All paid plans get unlimited (9999) resumes. Free gets 1.
            const isPaidPlan = ['pro', 'max', 'pro_max', 'enterprise', 'pro_monthly', 'pro_sprint', 'premium'].includes(userData?.plan || '');
            const hasLegacyPremium = userData?.promotions?.isPremium === true;
            const resumeLimit = (isPaidPlan || hasLegacyPremium) ? 9999 : (userData?.resumeLimit || 1);

            if (resumes.length >= resumeLimit) {
                throw new Error('RESUME_LIMIT_REACHED');
            }

            const newResumeData = createBlankResume();

            // Pre-fill with user's profile data
            if (userData?.displayName) {
                const nameParts = userData.displayName.split(' ');
                newResumeData.personalDetails.firstName = nameParts.shift() || '';
                newResumeData.personalDetails.lastName = nameParts.join(' ') || '';
            } else if (currentUser?.displayName) {
                const nameParts = currentUser.displayName.split(' ');
                newResumeData.personalDetails.firstName = nameParts.shift() || '';
                newResumeData.personalDetails.lastName = nameParts.join(' ') || '';
            }
            if (userData?.email) {
                newResumeData.personalDetails.email = userData.email;
            } else if (currentUser?.email) {
                newResumeData.personalDetails.email = currentUser.email;
            }
            if (currentUser?.photoURL) {
                newResumeData.personalDetails.photo = currentUser.photoURL;
            }

            if (newResumeData.personalDetails.firstName) {
                newResumeData.title = `${newResumeData.personalDetails.firstName}'s Resume`;
            }


            const { id, ...dataToSave } = newResumeData;
            const docRef = await addDoc(collection(db, 'users', activeUid, 'resumes'), {
                ...dataToSave,
                section: 'resumes',
                updatedAt: serverTimestamp(),
            });
            navigate(`/edit/${docRef.id}`);
        } catch (error: any) {
            if (error.message === 'RESUME_LIMIT_REACHED') {
                alert('You have reached your resume storage limit. Please upgrade your plan to create more resumes.');
            } else {
                console.error("Error adding blank resume:", error);
            }
        }
    }, [activeUid, currentUser, resumes.length]);

    const addAIGeneratedResume = useCallback(async (aiData: Partial<ResumeData>, title: string) => {
        if (!activeUid) return;
        try {
            // Check resume limit
            const userDocRef = doc(db, 'users', activeUid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data();

            // All paid plans get unlimited (9999) resumes. Free gets 1.
            const isPaidPlan = ['pro', 'max', 'pro_max', 'enterprise', 'pro_monthly', 'pro_sprint', 'premium'].includes(userData?.plan || '');
            const hasLegacyPremium = userData?.promotions?.isPremium === true;
            const resumeLimit = (isPaidPlan || hasLegacyPremium) ? 9999 : (userData?.resumeLimit || 1);

            if (resumes.length >= resumeLimit) {
                throw new Error('RESUME_LIMIT_REACHED');
            }

            const emptyPersonalDetails: PersonalDetails = {
                jobTitle: '', photo: '', firstName: '', lastName: '', email: '', phone: '',
                address: '', city: '', postalCode: '', country: '',
            };
            const newResume: Omit<ResumeData, 'id' | 'updatedAt'> = {
                title: title || 'AI Generated Resume',
                templateId: 'Modern',
                personalDetails: { ...emptyPersonalDetails, ...aiData.personalDetails },
                professionalSummary: aiData.professionalSummary || '',
                websites: aiData.websites || [],
                skills: aiData.skills || [],
                employmentHistory: aiData.employmentHistory || [],
                education: aiData.education || [],
                languages: aiData.languages || [],
                themeColor: '#000000',
                titleFont: 'Montserrat',
                bodyFont: 'Crimson Text',
                language: 'English',
                section: 'resumes',
            };
            const docRef = await addDoc(collection(db, 'users', activeUid, 'resumes'), {
                ...newResume,
                updatedAt: serverTimestamp(),
            });
            /*
             * The editor walkthrough is requested here, not inferred there.
             *
             * Every AI-generated resume asks for it, not just the first. Gating
             * on "first resume ever" meant that anyone who already had one
             * never saw the walkthrough at all — including the person who built
             * it, generating resume after resume and wondering where it went.
             * Finishing a new resume is the moment the editor is worth
             * explaining, however many they already have.
             *
             * The editor strips the flag once it has read it, so a refresh or a
             * shared link does not replay it.
             */
            navigate(`/edit/${docRef.id}?tour=1`);
        } catch (error: any) {
            if (error.message === 'RESUME_LIMIT_REACHED') {
                alert('You have reached your resume storage limit. Please upgrade your plan to create more resumes.');
            } else {
                console.error("Error adding AI resume:", error);
            }
        }
    }, [activeUid, resumes.length]);

    const saveAIGeneratedResume = useCallback(async (resumeData: ResumeData) => {
        if (!activeUid) return;
        try {
            // Check resume limit
            const userDocRef = doc(db, 'users', activeUid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data();

            // All paid plans get unlimited (9999) resumes. Free gets 1.
            const isPaidPlan = ['pro', 'max', 'pro_max', 'enterprise', 'pro_monthly', 'pro_sprint', 'premium'].includes(userData?.plan || '');
            const hasLegacyPremium = userData?.promotions?.isPremium === true;
            const resumeLimit = (isPaidPlan || hasLegacyPremium) ? 9999 : (userData?.resumeLimit || 1);

            if (resumes.length >= resumeLimit) {
                throw new Error('RESUME_LIMIT_REACHED');
            }

            const { id, ...dataToSave } = resumeData;
            await addDoc(collection(db, 'users', activeUid, 'resumes'), {
                ...dataToSave,
                updatedAt: serverTimestamp(),
            });
        } catch (error: any) {
            if (error.message === 'RESUME_LIMIT_REACHED') {
                alert('You have reached your resume storage limit. Please upgrade your plan to create more resumes.');
            } else {
                console.error("Error saving AI resume:", error);
            }
        }
    }, [activeUid, resumes.length]);

    const updateResume = useCallback(async (id: string, updatedData: Partial<ResumeData>) => {
        if (!activeUid) return;
        try {
            // Create a deep, serializable copy of the data to prevent circular reference errors from the Firestore SDK.
            // This also implicitly removes any fields that are not JSON-serializable (like functions or undefined).
            const cleanData = JSON.parse(JSON.stringify(updatedData));

            // The 'id' and 'updatedAt' fields are managed outside the document data and should not be in the update payload.
            delete cleanData.id;
            delete cleanData.updatedAt;

            const resumeRef = doc(db, 'users', activeUid, 'resumes', id);
            await updateDoc(resumeRef, {
                ...cleanData,
                updatedAt: serverTimestamp()
            });
        } catch (error: any) {
            console.error("Error updating resume:", {
                userId: activeUid,
                resumeId: id,
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            if (error.message?.includes('insufficient permissions')) {
                console.error("Firebase permissions error. Check the Firestore rules for path: users/" + activeUid + "/resumes/" + id);
            }
            if (error instanceof TypeError && error.message.includes('circular structure')) {
                console.error("A circular reference was detected in the data being saved:", updatedData);
            }
        }
    }, [activeUid]);

    const deleteResume = useCallback(async (id: string) => {
        if (!activeUid) return;
        const resumeRef = doc(db, 'users', activeUid, 'resumes', id);
        try {
            await deleteDoc(resumeRef);
        } catch (error) {
            console.error("Error deleting resume:", error);
        }
    }, [activeUid]);

    const duplicateResume = useCallback(async (id: string) => {
        if (!activeUid) return;
        const originalResume = getResumeById(id);
        if (originalResume) {
            try {
                // Check resume limit
                const userDocRef = doc(db, 'users', activeUid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.data();

                // Determine limit based on plan
                let resumeLimit = userData?.resumeLimit || 1;
                const plan = userData?.plan;
                const hasLegacyPremium = userData?.promotions?.isPremium === true;
                const isPaidPlan = ['pro', 'max', 'pro_max', 'enterprise', 'pro_monthly', 'pro_sprint', 'premium'].includes(plan || '');

                if (isPaidPlan || hasLegacyPremium) {
                    resumeLimit = 9999;
                }

                if (resumes.length >= resumeLimit) {
                    throw new Error('RESUME_LIMIT_REACHED');
                }

                const { id: originalId, ...resumeToCopy } = originalResume;
                const docRef = await addDoc(collection(db, 'users', activeUid, 'resumes'), {
                    ...resumeToCopy,
                    title: `${originalResume.title} (Copy)`,
                    updatedAt: serverTimestamp()
                });
                navigate(`/edit/${docRef.id}`);
            } catch (error: any) {
                if (error.message === 'RESUME_LIMIT_REACHED') {
                    alert('You have reached your resume storage limit. Please upgrade your plan to create more resumes.');
                } else {
                    console.error("Error duplicating resume:", error);
                }
            }
        }
    }, [activeUid, getResumeById, resumes.length]);

    const deleteAllResumes = useCallback(async () => {
        if (!activeUid) return;
        try {
            const resumesCol = collection(db, 'users', activeUid, 'resumes');
            const snapshot = await getDocs(resumesCol);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting all resumes:", error);
            throw error; // re-throw to be caught by the caller
        }
    }, [activeUid]);


    return { resumes, isLoading, getResumeById, addResume, updateResume, deleteResume, duplicateResume, addAIGeneratedResume, saveAIGeneratedResume, addBlankResume, deleteAllResumes };
};
