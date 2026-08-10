import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * A resume is a document, not a surface of this app.
 *
 * It is printed, exported to PDF, and read by someone who has never seen our
 * dark mode. When the app's dark-mode fallbacks reached inside it, every
 * template rendered dark text on a dark page — measured at 1.04:1 across 28
 * templates, which is invisible, and the same DOM is what the PDF is rendered
 * from.
 *
 * These guard the two ways that regresses: a new dark-mode fallback that
 * forgets the exclusion, and a `dark:` variant creeping back into a template.
 */

const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');
const EXCLUSION = ':where(:not(.cv-resume-document, .cv-resume-document *))';

/**
 * The theme rules that can reach arbitrary markup.
 *
 * Only the broad utility fallbacks matter here — the ones keyed on
 * `[class~="..."]`, which match any element carrying a Tailwind colour class,
 * templates included. Rules scoped to an app component class (`.cv-warm-*`,
 * `.cv-design-*`) are opt-in by name and no template uses them, so they are
 * deliberately not required to carry the exclusion.
 */
const themedRules = css
    .split('\n')
    .filter((line) => /^\s*html(\.dark|:not\(\.dark\))\s/.test(line) && line.includes('[class~='));

describe('resume documents are held out of app theming', () => {
    it('has theme-dependent fallbacks to check', () => {
        // If this ever hits zero the other assertions would pass vacuously.
        expect(themedRules.length).toBeGreaterThan(5);
    });

    it('excludes the document from every theme-dependent fallback', () => {
        const missing = themedRules.filter((line) => !line.includes(EXCLUSION));
        expect(missing, `these would repaint the resume:\n${missing.join('\n')}`).toEqual([]);
    });

    /*
     * A matching declaration beats inheritance whatever its specificity, so a
     * global heading colour overrode templates that colour headings from a
     * parent — Bold paints its header `bg-gray-900 text-white` and expects the
     * name inside to inherit white.
     */
    it('does not declare a heading colour inside the document', () => {
        const headingColourRules = css
            .split('}')
            .filter((block) => /h1,\s*h2,\s*h3/.test(block) && /(^|\s)color:/m.test(block));

        for (const block of headingColourRules) {
            expect(block, 'a heading colour rule must skip resume documents').toContain(EXCLUSION);
        }
    });

    it('gives the document an explicit light baseline', () => {
        const reset = css.slice(css.indexOf('.cv-resume-document {'));
        expect(reset).toMatch(/color-scheme:\s*light/);
        expect(reset).toMatch(/background-color:\s*#ffffff/i);
    });

    /*
     * `dark:` on a resume template is always wrong: the page is white in both
     * themes, so the variant either hides the text or gives a printed document
     * app-chrome colours. Infographic used to turn the candidate's name
     * near-white this way.
     */
    it('has no dark: variants left in any template', async () => {
        const { readdirSync } = await import('node:fs');
        const dir = join(process.cwd(), 'src/components/templates');
        const offenders: string[] = [];
        for (const file of readdirSync(dir).filter((f) => f.endsWith('Template.tsx'))) {
            const source = readFileSync(join(dir, file), 'utf8');
            const hits = source.match(/\bdark:[a-zA-Z0-9[\]#/.\-]+/g);
            if (hits) offenders.push(`${file}: ${hits.slice(0, 3).join(' ')}`);
        }
        expect(offenders, offenders.join('\n')).toEqual([]);
    });
});
