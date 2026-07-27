import { Content, GoogleGenAI } from '@google/genai';

/**
 * Coding-session-aware context compaction.
 * Summarizes the old portion of the conversation history while preserving
 * key artifacts: file paths touched, errors encountered, fixes applied,
 * and design decisions made. Mimics Claude Code's context sliding-window.
 */
export async function compactHistory(
  ai: GoogleGenAI,
  history: Content[],
  model: string = 'gemini-2.5-flash',
  preserveCount: number = 6
): Promise<Content[]> {
  if (history.length <= preserveCount + 2) {
    return history;
  }

  // Split history into old vs new
  // Preserve the first system or initial context if it exists
  const isFirstSystem = history[0].role === 'system';
  const startIdx = isFirstSystem ? 1 : 0;
  
  const toCompact = history.slice(startIdx, history.length - preserveCount);
  const preserved = history.slice(history.length - preserveCount);

  // Coding-aware summarization prompt
  const summaryPrompt: Content = {
    role: 'user',
    parts: [{
      text: [
        'You are summarizing a coding agent session. Produce a concise but accurate ledger that preserves:',
        '1. Every file path that was read, created, or modified (list each with a one-line summary of changes).',
        '2. Any TypeScript/compiler errors encountered and their resolutions.',
        '3. Key design decisions or constraints established during the session.',
        '4. The current goal/task the agent was working on at the end of this segment.',
        '',
        'Format:',
        '## Files Touched',
        '- path/to/file.ts — [what changed]',
        '',
        '## Errors & Fixes',
        '- [error] → [fix applied]',
        '',
        '## Decisions & Constraints',
        '- [decision]',
        '',
        '## Current Task',
        '[one sentence]',
        '',
        '---',
        'Conversation to summarize:',
        JSON.stringify(toCompact, null, 2),
      ].join('\n')
    }]
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [summaryPrompt],
    });

    const summaryText = response.text || 'No summary generated.';
    
    const compactedNode: Content = {
      role: 'user',
      parts: [{
        text: `[SYSTEM] The following is a compacted summary of previous interactions:\n${summaryText}`
      }]
    };

    const newHistory = isFirstSystem ? [history[0]] : [];
    newHistory.push(compactedNode);
    newHistory.push(...preserved);

    return newHistory;
  } catch (error) {
    console.warn('Compaction failed. Returning original history.', error);
    return history;
  }
}
