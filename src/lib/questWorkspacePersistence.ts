import type { QuestCodingDraft, QuestSystemDesignDraft } from '../types';

const STORAGE_PREFIX = 'careervivid:quest-workspace:v1';

export interface LastQuestWorkspace {
    version: 1;
    stageId: string;
    challengeId?: string;
    updatedAt: number;
}

const storageKey = (ownerId: string, questSlug: string, kind: string, challengeId?: string) =>
    [STORAGE_PREFIX, encodeURIComponent(ownerId || 'guest'), encodeURIComponent(questSlug), kind, challengeId ? encodeURIComponent(challengeId) : ''].join(':');

const readJson = <T,>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : null;
    } catch {
        return null;
    }
};

const writeJson = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Local persistence is a crash-safe companion to Firestore. A full or
        // disabled localStorage must never break the interview workspace.
    }
};

export const saveLastQuestWorkspace = (
    ownerId: string,
    questSlug: string,
    value: Omit<LastQuestWorkspace, 'version' | 'updatedAt'>,
) => writeJson(storageKey(ownerId, questSlug, 'active'), {
    version: 1,
    ...value,
    updatedAt: Date.now(),
} satisfies LastQuestWorkspace);

export const readLastQuestWorkspace = (ownerId: string, questSlug: string): LastQuestWorkspace | null => {
    const value = readJson<LastQuestWorkspace>(storageKey(ownerId, questSlug, 'active'));
    return value?.version === 1 && typeof value.stageId === 'string' && Number.isFinite(value.updatedAt)
        ? value
        : null;
};

export const saveQuestCodingDraftLocal = (ownerId: string, questSlug: string, draft: QuestCodingDraft) =>
    writeJson(storageKey(ownerId, questSlug, 'coding', draft.challengeId), draft);

export const readQuestCodingDraftLocal = (
    ownerId: string,
    questSlug: string,
    challengeId: string,
): QuestCodingDraft | null => {
    const value = readJson<QuestCodingDraft>(storageKey(ownerId, questSlug, 'coding', challengeId));
    return value?.challengeId === challengeId && Number.isFinite(value.updatedAt) ? value : null;
};

export const saveQuestSystemDesignDraftLocal = (
    ownerId: string,
    questSlug: string,
    draft: QuestSystemDesignDraft,
) => writeJson(storageKey(ownerId, questSlug, 'system-design', draft.challengeId), draft);

export const readQuestSystemDesignDraftLocal = (
    ownerId: string,
    questSlug: string,
    challengeId: string,
): QuestSystemDesignDraft | null => {
    const value = readJson<QuestSystemDesignDraft>(storageKey(ownerId, questSlug, 'system-design', challengeId));
    return value?.type === 'system_design'
        && value.challengeId === challengeId
        && Number.isFinite(value.updatedAt)
        ? value
        : null;
};
