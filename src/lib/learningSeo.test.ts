import { describe, expect, it } from 'vitest';
import { getLearningSeoKey, getLearningSeoPage } from './learningSeo';

describe('learning SEO metadata', () => {
    it('assigns unique canonical metadata to the course catalog and every public course', () => {
        const pages = [
            getLearningSeoPage('catalog'),
            getLearningSeoPage('ai-agent-curriculum'),
            getLearningSeoPage('coding-interview-patterns'),
            getLearningSeoPage('system-design-interview'),
        ];

        expect(new Set(pages.map((page) => page.path))).toEqual(new Set([
            '/learning',
            '/learning/ai-agent-curriculum',
            '/learning/coding-interview-patterns',
            '/learning/system-design-interview',
        ]));
        expect(pages.every((page) => page.title.length > 20 && page.description.length > 100)).toBe(true);
    });

    it('maps every course with its own page to that page, not a sibling', () => {
        expect(getLearningSeoKey('coding-interview-patterns')).toBe('coding-interview-patterns');
        expect(getLearningSeoKey('ai-agent-curriculum')).toBe('ai-agent-curriculum');
        expect(getLearningSeoKey('system-design-interview')).toBe('system-design-interview');
        expect(getLearningSeoKey(null)).toBe('catalog');
    });

    // Regression: the old fallback returned 'ai-agent-curriculum' for anything
    // unrecognised, so an unknown /learning/* URL claimed the AI curriculum's
    // canonical and Google treated it as a duplicate of that page.
    it('falls back to the catalog for unknown course ids, never to another course', () => {
        for (const unknown of ['', 'ccaf-quest', 'not-a-course', 'system-design']) {
            expect(getLearningSeoKey(unknown)).toBe('catalog');
        }
        expect(getLearningSeoPage(getLearningSeoKey('not-a-course')).path).toBe('/learning');
    });

    it('gives each page a canonical URL that matches its own path', () => {
        for (const key of ['catalog', 'ai-agent-curriculum', 'coding-interview-patterns', 'system-design-interview'] as const) {
            const page = getLearningSeoPage(key);
            const graph = (page.schemaData as { '@graph'?: Array<Record<string, unknown>> })['@graph'] ?? [];
            const course = graph.find((node) => node['@type'] === 'Course');
            if (course) expect(course.url).toBe(`https://careervivid.app${page.path}`);
        }
    });
});
