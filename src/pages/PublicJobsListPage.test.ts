import { describe, expect, it } from 'vitest';
import { pageFromPath, pageWindow, pathForPage } from './PublicJobsListPage';

/*
 * Pagination lives in the URL rather than in state, so a page of results can be
 * linked, shared, opened in a new tab and crawled. That only works if the two
 * directions agree exactly.
 */

describe('pageFromPath', () => {
    it('treats the bare list as page one', () => {
        expect(pageFromPath('/jobs/list')).toBe(1);
        expect(pageFromPath('/jobs/list/')).toBe(1);
    });

    it('reads the page number out of the path', () => {
        expect(pageFromPath('/jobs/list/2')).toBe(2);
        expect(pageFromPath('/jobs/list/17')).toBe(17);
        expect(pageFromPath('/jobs/list/3/')).toBe(3);
    });

    /*
     * /jobs/{slug} is the employer job board, which reads the last segment as a
     * company slug. Anything that is not a number must not be mistaken for a
     * page here.
     */
    it('never reads a company slug as a page number', () => {
        expect(pageFromPath('/jobs/list/acme')).toBe(1);
        expect(pageFromPath('/jobs/stripe')).toBe(1);
        expect(pageFromPath('/jobs/recommend')).toBe(1);
    });

    it('refuses a page number that is not a page', () => {
        expect(pageFromPath('/jobs/list/0')).toBe(1);
        expect(pageFromPath('/jobs/list/-2')).toBe(1);
    });
});

describe('pathForPage', () => {
    /*
     * Page one is /jobs/list, never /jobs/list/1 — two URLs serving identical
     * results is a duplicate Google has to pick between, and it may not pick
     * the one being linked to.
     */
    it('keeps one canonical URL for page one', () => {
        expect(pathForPage(1)).toBe('/jobs/list');
        expect(pathForPage(0)).toBe('/jobs/list');
    });

    it('numbers every page after the first', () => {
        expect(pathForPage(2)).toBe('/jobs/list/2');
        expect(pathForPage(12)).toBe('/jobs/list/12');
    });

    it('round-trips with pageFromPath', () => {
        for (const page of [1, 2, 5, 25]) {
            expect(pageFromPath(pathForPage(page))).toBe(page);
        }
    });
});

describe('pageWindow', () => {
    it('shows every page when there are few', () => {
        expect(pageWindow(1, 1)).toEqual([1]);
        expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
        expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('collapses the middle rather than rendering forty buttons', () => {
        expect(pageWindow(10, 25)).toEqual([1, 'gap', 9, 10, 11, 'gap', 25]);
    });

    it('keeps the first and last page reachable from anywhere', () => {
        for (const current of [1, 2, 13, 24, 25]) {
            const window = pageWindow(current, 25);
            expect(window[0]).toBe(1);
            expect(window[window.length - 1]).toBe(25);
            expect(window).toContain(current);
        }
    });

    it('never repeats a page or leaves a gap of one', () => {
        for (const current of [1, 2, 3, 12, 23, 24, 25]) {
            const numbers = pageWindow(current, 25).filter((p): p is number => p !== 'gap');
            expect(new Set(numbers).size).toBe(numbers.length);
            expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
        }
    });
});
