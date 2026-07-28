import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getCourseCatalogTotals, getInteractiveCourse, getCourseExerciseCount } from './interactiveCourses';

/**
 * index.html is static: crawlers and social scrapers that don't run JavaScript
 * only ever see those tags, so the catalog numbers are written out by hand
 * there. These tests fail the build when a new course makes those numbers a
 * lie — publish a course, and you get told exactly which strings to update.
 */
const readIndexHtml = () => readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');

const homepageJsonLd = (): Array<Record<string, any>> => {
    const match = readIndexHtml().match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) throw new Error('index.html has no application/ld+json block');
    return JSON.parse(match[1]);
};

describe('homepage SEO catalog claims', () => {
    it('emits valid, parseable JSON-LD', () => {
        expect(() => homepageJsonLd()).not.toThrow();
        expect(homepageJsonLd().length).toBeGreaterThan(0);
    });

    it('quotes the real published course and lesson totals', () => {
        const { courses, lessons } = getCourseCatalogTotals();
        const html = readIndexHtml();

        expect(html).toContain(`${courses} interactive courses with ${lessons} hands-on lessons`);
        expect(html).toContain(
            `${courses} interactive courses with ${lessons} hands-on lessons covering AI agents, coding interview patterns, and system design`,
        );
    });

    it('quotes per-course lesson counts that match the course JSON', () => {
        const html = readIndexHtml();
        const expected: Array<[string, string, number]> = [
            ['coding-interview-patterns', 'Coding Interview Patterns', 20],
            ['system-design-interview', 'System Design Interview', 13],
        ];

        for (const [id, label, chapters] of expected) {
            const course = getInteractiveCourse(id);
            expect(course, `${id} should be a published course`).toBeDefined();
            expect(course!.chapters.length, `${label} chapter count`).toBe(chapters);
            expect(html, `${label} lesson count in index.html`).toContain(
                `${chapters} ${id === 'coding-interview-patterns' ? 'patterns' : 'modules'}, ${getCourseExerciseCount(course!)}`,
            );
        }
    });

    it('gives every homepage Course entity a distinct canonical URL', () => {
        const itemList = homepageJsonLd().find((node) => node['@type'] === 'ItemList');
        expect(itemList).toBeDefined();

        const urls = itemList!.itemListElement.map((entry: any) => entry.item.url);
        expect(new Set(urls).size).toBe(urls.length);
        for (const url of urls) expect(url).toMatch(/^https:\/\/careervivid\.app\/learning\//);
    });

    it('describes CareerVivid as a learning platform, not only a job-search tool', () => {
        const html = readIndexHtml();
        expect(html).not.toContain('The AI That Gets You Hired');
        expect(html).toContain('online learning platform');
    });
});
