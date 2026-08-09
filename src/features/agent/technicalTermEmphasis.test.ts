import { describe, expect, it } from 'vitest';
import { emphasizeTechnicalTerms, getAgentTechnicalContext } from './technicalTermEmphasis';
import { TECHNICAL_TERM_CLOSE, TECHNICAL_TERM_OPEN } from '../../utils/renderInlineMarkdown';

const highlighted = (text: string) => `${TECHNICAL_TERM_OPEN}${text}${TECHNICAL_TERM_CLOSE}`;

describe('technical term emphasis', () => {
    it('highlights the key concepts in a system-design coaching answer', () => {
        const result = emphasizeTechnicalTerms(
            "Add GPU inference worker nodes and response streaming with Server-Sent Events. " +
            'A vector database can support long-context memory.',
            'system_design',
        );

        expect(result).toBe(
            `Add ${highlighted('GPU inference worker nodes')} and ${highlighted('response streaming')} with ` +
            `${highlighted('Server-Sent Events')}. A ${highlighted('vector database')} can support ` +
            `${highlighted('long-context memory')}.`,
        );
    });

    it('highlights coding patterns and complexity without emphasizing normal prose', () => {
        const result = emphasizeTechnicalTerms(
            "Use Kahn's algorithm with an adjacency list for topological sort. That gives O(V + E) time complexity.",
            'coding',
        );

        expect(result).toContain(highlighted("Kahn's algorithm"));
        expect(result).toContain(highlighted('adjacency list'));
        expect(result).toContain(highlighted('topological sort'));
        expect(result).toContain(highlighted('O(V + E)'));
        expect(emphasizeTechnicalTerms('I can help update your resume.', 'coding')).toBe(
            'I can help update your resume.',
        );
    });

    it('preserves agent-authored Markdown and caps added highlights', () => {
        const result = emphasizeTechnicalTerms(
            '**GPU inference workers** need response streaming, Server-Sent Events, a vector database, ' +
            'long-context memory, an API gateway, and Redis.',
            'system_design',
        );

        expect(result).toContain('**GPU inference workers**');
        expect(result.split(TECHNICAL_TERM_OPEN)).toHaveLength(6);
    });

    it('uses specific labels from the current diagram', () => {
        const result = emphasizeTechnicalTerms(
            'Connect the Feature Flag Control Plane after the API gateway.',
            'system_design',
            {
                kind: 'system_design',
                company: 'OpenAI',
                stageTitle: 'System design',
                problem: 'Design model serving.',
                components: ['Feature Flag Control Plane'],
                updatedAt: Date.now(),
            },
        );

        expect(result).toContain(highlighted('Feature Flag Control Plane'));
    });

    it('emphasizes a repeated concept only once', () => {
        expect(emphasizeTechnicalTerms(
            'The API gateway sends traffic back through the API gateway.',
            'system_design',
        )).toBe(`The ${highlighted('API gateway')} sends traffic back through the API gateway.`);
    });

    it('recognizes natural model paraphrases of system-design components', () => {
        const result = emphasizeTechnicalTerms(
            'GPU worker nodes run transformer model inference, Server-Sent Events stream tokens, ' +
            'and a vector database supports similarity search over context embeddings.',
            'system_design',
        );

        expect(result).toContain(highlighted('GPU worker nodes'));
        expect(result).toContain(highlighted('Server-Sent Events'));
        expect(result).toContain(highlighted('vector database'));
    });

    it('activates only in an open coding or system-design quest', () => {
        expect(getAgentTechnicalContext('/quest/openai', '?stage=system_design')).toBe('system_design');
        expect(getAgentTechnicalContext('/quest/google', '?stage=coding')).toBe('coding');
        expect(getAgentTechnicalContext('/agent', '?stage=coding')).toBeNull();
    });
});
