

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, arrayUnion, serverTimestamp, orderBy, getDoc, deleteDoc, deleteField, getDocs, writeBatch } from 'firebase/firestore';
import { Job, PracticeHistoryEntry, InterviewAnalysis, InterviewSessionDraft, QuestCodingDraft, QuestSystemDesignDraft } from '../types';
import { awardInterviewCompletion } from '../services/progressService';

// Creates a stable, URL-safe ID from the job title and company.
const createJobId = (job: Omit<Job, 'id' | 'location' | 'description' | 'url'>): string => {
    const sanitizedTitle = job.title.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '');
    const sanitizedCompany = job.company.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '');
    return `${sanitizedTitle}-${sanitizedCompany}`.replace(/[\s/]/g, '-').slice(0, 100);
}

export const usePracticeHistory = () => {
    const { currentUser } = useAuth();
    const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            setPracticeHistory([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const historyCol = collection(db, 'users', currentUser.uid, 'practiceHistory');
        const q = query(historyCol, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const historyFromDb = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    job: data.job,
                    questions: data.questions,
                    interviewHistory: data.interviewHistory || [],
                    timestamp: data.timestamp?.toMillis() || Date.now(),
                    section: data.section || 'interviews', // Default to 'interviews'
                    activeInterviewDraft: data.activeInterviewDraft || null,
                    activeCodingDrafts: data.activeCodingDrafts || {},
                    activeSystemDesignDrafts: data.activeSystemDesignDrafts || {},
                } as PracticeHistoryEntry
            });
            setPracticeHistory(historyFromDb);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching practice history:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const addJob = useCallback(async (jobData: Omit<Job, 'id'>, questions: string[]): Promise<string> => {
        if (!currentUser) throw new Error("User not logged in");
        
        const id = createJobId(jobData);
        const jobWithId = { ...jobData, id };
        const historyRef = doc(db, 'users', currentUser.uid, 'practiceHistory', id);

        const docSnap = await getDoc(historyRef);

        if (docSnap.exists()) {
             // If it exists, just update the timestamp and questions to not overwrite interview history
            await updateDoc(historyRef, {
                job: jobWithId,
                questions,
                timestamp: serverTimestamp(),
                activeInterviewDraft: null,
            });
        } else {
            // If it's new, create it with an empty interview history
            await setDoc(historyRef, {
                job: jobWithId,
                questions,
                timestamp: serverTimestamp(),
                interviewHistory: [],
                section: 'interviews',
                activeInterviewDraft: null,
            });
        }
        
        return id;
    }, [currentUser]);

    const addAnalysisToJob = useCallback(async (jobId: string, analysisData: Omit<InterviewAnalysis, 'id' | 'timestamp'>): Promise<InterviewAnalysis> => {
        if (!currentUser) throw new Error("User not logged in");
        const historyRef = doc(db, 'users', currentUser.uid, 'practiceHistory', jobId);

        const newAnalysis: InterviewAnalysis = {
            ...analysisData,
            id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
        };

        const codingDraftCleanup = analysisData.questArtifact?.type === 'coding'
            ? { [`activeCodingDrafts.${analysisData.questArtifact.challengeId}`]: deleteField() }
            : {};
        const designDraftCleanup = analysisData.questArtifact?.type === 'system_design'
            ? { [`activeSystemDesignDrafts.${analysisData.questArtifact.challengeId}`]: deleteField() }
            : {};

        await updateDoc(historyRef, {
            interviewHistory: arrayUnion(newAnalysis),
            activeInterviewDraft: null,
            timestamp: serverTimestamp(), // Also update the main timestamp for recency sorting
            ...codingDraftCleanup,
            ...designDraftCleanup,
        });

        // Gamification: award XP for the completed interview. Idempotent per
        // analysis id and never allowed to break the interview save itself.
        void awardInterviewCompletion(currentUser.uid, newAnalysis).catch((error) => {
            console.error('Failed to award interview XP:', error);
        });

        return newAnalysis;
    }, [currentUser]);

    const saveInterviewDraft = useCallback(async (jobId: string, draft: InterviewSessionDraft | null) => {
        if (!currentUser) return;
        try {
            const historyRef = doc(db, 'users', currentUser.uid, 'practiceHistory', jobId);
            await updateDoc(historyRef, {
                activeInterviewDraft: draft,
                timestamp: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error saving interview draft:", error);
        }
    }, [currentUser]);

    const saveCodingDraft = useCallback(async (jobId: string, draft: QuestCodingDraft) => {
        if (!currentUser) return;
        try {
            const historyRef = doc(db, 'users', currentUser.uid, 'practiceHistory', jobId);
            await updateDoc(historyRef, {
                [`activeCodingDrafts.${draft.challengeId}`]: draft,
                timestamp: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error saving coding draft:', error);
        }
    }, [currentUser]);

    const saveSystemDesignDraft = useCallback(async (jobId: string, draft: QuestSystemDesignDraft) => {
        if (!currentUser) return;
        try {
            const historyRef = doc(db, 'users', currentUser.uid, 'practiceHistory', jobId);
            await updateDoc(historyRef, {
                [`activeSystemDesignDrafts.${draft.challengeId}`]: draft,
                timestamp: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error saving system design draft:', error);
        }
    }, [currentUser]);

    const addCompletedPractice = useCallback(async (practiceData: PracticeHistoryEntry) => {
        if (!currentUser) throw new Error("User not logged in");
        
        const { id, ...dataToSave } = practiceData;
        const newId = createJobId(dataToSave.job);
        const historyRef = doc(db, 'users', currentUser.uid, 'practiceHistory', newId);

        await setDoc(historyRef, {
            ...dataToSave,
            timestamp: serverTimestamp(),
            section: 'interviews',
        }, { merge: true }); // Merge to avoid overwriting existing data if practicing again for the same role
        
        return newId;
    }, [currentUser]);
    
    const updatePracticeHistory = useCallback(async (jobId: string, updatedData: Partial<PracticeHistoryEntry>) => {
        if (!currentUser) return;
        try {
            const cleanData = JSON.parse(JSON.stringify(updatedData));
            delete cleanData.id;
            delete cleanData.timestamp;

            const historyRef = doc(db, 'users', currentUser.uid, 'practiceHistory', jobId);
            await updateDoc(historyRef, {
                ...cleanData,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating practice history:", error);
        }
    }, [currentUser]);

    const deletePracticeHistory = useCallback(async (jobId: string) => {
        if (!currentUser) throw new Error("User not logged in");
        try {
            const historyRef = doc(db, 'users', currentUser.uid, 'practiceHistory', jobId);
            await deleteDoc(historyRef);
        } catch (error) {
            console.error("Error deleting practice history:", error);
        }
    }, [currentUser]);

    const deleteAllPracticeHistory = useCallback(async () => {
        if (!currentUser) return;
        try {
            const historyCol = collection(db, 'users', currentUser.uid, 'practiceHistory');
            const snapshot = await getDocs(historyCol);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting all practice history:", error);
            throw error;
        }
    }, [currentUser]);


    return { practiceHistory, isLoading, addJob, addAnalysisToJob, addCompletedPractice, deletePracticeHistory, deleteAllPracticeHistory, updatePracticeHistory, saveInterviewDraft, saveCodingDraft, saveSystemDesignDraft };
};
