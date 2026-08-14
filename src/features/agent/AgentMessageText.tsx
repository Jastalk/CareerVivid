import React from 'react';
import { renderInlineMarkdown } from '../../utils/renderInlineMarkdown';
import {
    emphasizeTechnicalTerms,
    type AgentTechnicalContext,
} from './technicalTermEmphasis';
import type { WorkspaceSnapshot } from './workspaceSnapshot';

const KEY_TERM_CLASS =
    'box-decoration-clone rounded-md border border-[#dfe2ff] bg-[#f3f2ff] px-1 py-0.5 ' +
    'font-semibold text-[#4a4392] dark:border-[#3f3b70] dark:bg-[#252347] dark:text-[#bbb8ff]';

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
