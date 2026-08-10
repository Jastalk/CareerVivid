import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    readLastQuestWorkspace,
    readQuestCodingDraftLocal,
    readQuestSystemDesignDraftLocal,
    saveLastQuestWorkspace,
    saveQuestCodingDraftLocal,
    saveQuestSystemDesignDraftLocal,
} from './questWorkspacePersistence';

describe('questWorkspacePersistence', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('keeps the last stage and challenge separately for each user and quest', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1234);
        saveLastQuestWorkspace('user-1', 'google', { stageId: 'coding', challengeId: 'course-schedule' });

        expect(readLastQuestWorkspace('user-1', 'google')).toEqual({
            version: 1,
            stageId: 'coding',
            challengeId: 'course-schedule',
            updatedAt: 1234,
        });
        expect(readLastQuestWorkspace('user-2', 'google')).toBeNull();
        expect(readLastQuestWorkspace('user-1', 'openai')).toBeNull();
    });

    it('restores code and whiteboard drafts by challenge', () => {
        const coding = {
            challengeId: 'course-schedule',
            language: 'python' as const,
            code: 'return True',
            updatedAt: 2000,
        };
        const design = {
            type: 'system_design' as const,
            challengeId: 'url-shortener',
            elementsJson: '[{"id":"node-1"}]',
            updatedAt: 3000,
        };

        saveQuestCodingDraftLocal('user-1', 'google', coding);
        saveQuestSystemDesignDraftLocal('user-1', 'google', design);

        expect(readQuestCodingDraftLocal('user-1', 'google', 'course-schedule')).toEqual(coding);
        expect(readQuestSystemDesignDraftLocal('user-1', 'google', 'url-shortener')).toEqual(design);
    });

    it('ignores malformed stored values instead of breaking the workspace', () => {
        localStorage.setItem('careervivid:quest-workspace:v1:user-1:google:active:', '{bad json');
        expect(readLastQuestWorkspace('user-1', 'google')).toBeNull();
    });
});
