import React from 'react';
import { renderInlineMarkdown } from '../../utils/renderInlineMarkdown';
import {
    emphasizeTechnicalTerms,
    type AgentTechnicalContext,
} from './technicalTermEmphasis';
import type { WorkspaceSnapshot } from './workspaceSnapshot';
import '../../components/Landing/live/liveLanding.css';

/*
 * The token set already carries its own dark values, so the highlight no longer
 * needs a parallel `dark:` chip — one declaration reads correctly in both
 * themes instead of two that can drift apart.
 */
const KEY_TERM_CLASS =
    'box-decoration-clone rounded-md border border-[color:var(--cvl-line)] bg-[var(--cvl-purple-soft)] ' +
    'px-1 py-0.5 font-semibold text-[color:var(--cvl-purple-ink)]';

interface AgentMessageTextProps {
    text: string;
    technicalContext: AgentTechnicalContext | null;
    workspace?: WorkspaceSnapshot | null;
}

export const AgentMessageText = React.memo(function AgentMessageText({
    text,
    technicalContext,
    workspace,
}: AgentMessageTextProps) {
    const formatted = emphasizeTechnicalTerms(text, technicalContext, workspace);

    return (
        <>
            {renderInlineMarkdown(formatted, technicalContext
                ? { highlightClassName: KEY_TERM_CLASS, highlightTitle: 'Key solution concept' }
                : undefined)}
        </>
    );
});
