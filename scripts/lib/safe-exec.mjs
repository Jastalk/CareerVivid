import { execFileSync } from 'node:child_process';

/**
 * Split the small, shell-like command strings used by legacy media scripts.
 * Operators, substitutions, globbing, and environment expansion are never
 * evaluated; every parsed token is passed directly to the executable.
 */
export const splitCommandLine = (commandLine) => {
    const args = [];
    let token = '';
    let quote = null;
    let tokenStarted = false;

    for (let index = 0; index < commandLine.length; index += 1) {
        const char = commandLine[index];
        if (quote === "'") {
            if (char === "'") quote = null;
            else token += char;
            tokenStarted = true;
            continue;
        }
        if (quote === '"') {
            if (char === '"') {
                quote = null;
            } else if (char === '\\') {
                const next = commandLine[index + 1];
                if (next === '"' || next === '\\' || next === '$' || next === '`') {
                    token += next;
                    index += 1;
                } else {
                    token += char;
                }
            } else {
                token += char;
            }
            tokenStarted = true;
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
            tokenStarted = true;
        } else if (/\s/.test(char)) {
            if (tokenStarted) {
                args.push(token);
                token = '';
                tokenStarted = false;
            }
        } else if (char === '\\') {
            if (index + 1 < commandLine.length) {
                token += commandLine[index + 1];
                index += 1;
            }
            tokenStarted = true;
        } else {
            token += char;
            tokenStarted = true;
        }
    }

    if (quote) throw new Error(`Unterminated ${quote} quote in command line.`);
    if (tokenStarted) args.push(token);
    return args;
};

export const execCommandLine = (commandLine, options = {}) => {
    const [executable, ...args] = splitCommandLine(commandLine);
    if (!executable) throw new Error('Command line must include an executable.');
    return execFileSync(executable, args, { ...options, shell: false });
};
