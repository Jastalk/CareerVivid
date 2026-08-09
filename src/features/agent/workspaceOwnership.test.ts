import { describe, expect, it, beforeEach } from 'vitest';
import { publishWorkspace, clearWorkspace, readWorkspace } from './workspaceSnapshot';

const sd = { kind: 'system_design' as const, company: 'OpenAI', stageTitle: 'System design', problem: 'Serve ChatGPT' };
const coding = { kind: 'coding' as const, company: 'OpenAI', stageTitle: 'Coding', problem: 'LRU Cache' };

/**
 * Regression: opening a coding round while the whiteboard was still mounted
 * left the agent coaching system design. Both battles rendered independently
 * and the whiteboard republished every 3s, so it overwrote the round the user
 * had just opened.
 */
describe('workspace ownership', () => {
    beforeEach(() => clearWorkspace());

    it('the arriving round wins the slot', () => {
        publishWorkspace(sd, 'sd:1');
        publishWorkspace(coding, 'coding:lru');
        expect(readWorkspace()?.kind).toBe('coding');
    });

    it('a departing round cannot clear its replacement', () => {
        publishWorkspace(sd, 'sd:1');
        publishWorkspace(coding, 'coding:lru');
        clearWorkspace('sd:1');                       // late unmount of the old round
        expect(readWorkspace()?.kind).toBe('coding'); // still the open one
    });

    it("a stale interval cannot overwrite the round that replaced it", () => {
        publishWorkspace(coding, 'coding:lru');
        publishWorkspace(sd, 'sd:1');                 // whiteboard's 3s tick after switching
        expect(readWorkspace()?.kind).toBe('system_design');
        clearWorkspace('sd:1');
        expect(readWorkspace()).toBeNull();
    });

    it('the owner can release its own slot', () => {
        publishWorkspace(coding, 'coding:lru');
        clearWorkspace('coding:lru');
        expect(readWorkspace()).toBeNull();
    });
});
