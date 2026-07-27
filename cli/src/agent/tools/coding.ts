import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { resolve, dirname, relative, join, normalize } from 'path';
import { Type } from '@google/genai';
import { Tool } from '../Tool.js';

// ============================================================================
// Path-based Access Control (Least Privilege)
// ============================================================================

// ============================================================================
// Path-based Access Control
// ============================================================================

/**
 * In coding mode the agent operates like a real coding assistant (Antigravity-style).
 * It can read and write files anywhere in the working directory tree.
 *
 * Hard-blocked regardless of mode:
 *   - .env / .env.* files  (secrets)
 *   - node_modules/        (package artifacts — use npm install)
 *   - .git/                (git internals)
 */

const HARD_BLOCKED_PATTERNS = [
  /\/\.env(\.\w+)?$/,      // .env, .env.local, .env.production, etc.
  /\/node_modules\//,       // node_modules anywhere in path
  /\/\.git\//,              // .git internals
];

function isHardBlocked(absPath: string): boolean {
  return HARD_BLOCKED_PATTERNS.some(re => re.test(absPath));
}

/**
 * Resolve a raw path argument and enforce hard-block rules.
 * @throws if the path matches a hard-blocked pattern.
 */
function guardPath(rawPath: string, _allowedPrefixes: string[], mode: 'read' | 'write'): string {
  const cwd = process.cwd();
  const absPath = normalize(resolve(rawPath));

  if (isHardBlocked(absPath)) {
    const rel = relative(cwd, absPath);
    throw new Error(
      `⛔ Access denied: ${mode} access to "${rel}" is blocked for safety.\n` +
      `Blocked paths: .env files, node_modules/, .git/\n` +
      `Edit secrets manually in your editor.`
    );
  }

  return absPath;
}


// ============================================================================
// Safe list for run_command (no confirmation required)
// ============================================================================

const SAFE_COMMAND_PREFIXES = [
  'tsc',
  'npx tsc',
  'npm test',
  'npm run test',
  'npm run build',
  'npm run lint',
  'cat ',
  'ls ',
  'echo ',
  'wc ',
  'head ',
  'tail ',
  'git status',
  'git log',
  'git diff',
  'git branch',
  // Network / web fetching (read-only)
  'curl ',
  'curl -s',
  'wget ',
  // Text processing
  'grep ',
  'grep -',
  'sed ',
  'awk ',
  'sort ',
  'uniq ',
  'find ',
  'which ',
  'type ',
  // Script one-liners (read-only)
  'python3 -c',
  'python -c',
  'node -e',
  'node -p',
  // Info / diagnostics
  'pwd',
  'whoami',
  'uname',
  'env ',
  'printenv',
];

function isSafeCommand(cmd: string): boolean {
  const trimmed = cmd.trim();
  return SAFE_COMMAND_PREFIXES.some(prefix => trimmed.startsWith(prefix));
}

// ============================================================================
// read_file — Read a file, optionally with line range
// ============================================================================

export const readFileTool: Tool = {
  name: 'read_file',
  description:
    'Read the contents of a file. Supports an optional line range to avoid reading huge files in full.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'Relative or absolute path to the file.',
      },
      start_line: {
        type: Type.NUMBER,
        description: 'Optional. 1-based line number to start reading from.',
      },
      end_line: {
        type: Type.NUMBER,
        description: 'Optional. 1-based line number to stop reading at (inclusive).',
      },
    },
    required: ['path'],
  },
  execute: async (args: { path: string; start_line?: number; end_line?: number }) => {
    const absPath = guardPath(args.path, [], 'read');
    if (!existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }
    const content = readFileSync(absPath, 'utf-8');
    if (args.start_line !== undefined || args.end_line !== undefined) {
      const lines = content.split('\n');
      const start = Math.max(0, (args.start_line ?? 1) - 1);
      const end = args.end_line !== undefined ? args.end_line : lines.length;
      const slice = lines.slice(start, end);
      return `[Lines ${start + 1}–${end} of ${absPath}]\n${slice.join('\n')}`;
    }
    return content;
  },
};

// ============================================================================
// write_file — Create or overwrite a file
// ============================================================================

export const writeFileTool: Tool = {
  name: 'write_file',
  description:
    'Write content to a file, creating it (and any parent directories) if it does not exist, or overwriting it if it does.',
  requiresConfirmation: true,
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'Relative or absolute path to the target file.',
      },
      content: {
        type: Type.STRING,
        description: 'The full content to write to the file.',
      },
    },
    required: ['path', 'content'],
  },
  execute: async (args: { path: string; content: string }) => {
    const absPath = guardPath(args.path, [], 'write');
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, args.content, 'utf-8');
    const lines = args.content.split('\n').length;
    return `Written ${lines} lines to ${absPath}`;
  },
};

// ============================================================================
// patch_file — Apply a targeted line-range replacement
// ============================================================================

export const patchFileTool: Tool = {
  name: 'patch_file',
  description:
    'Replace a specific range of lines in a file with new content. More precise than rewriting the entire file. Use this for targeted edits.',
  requiresConfirmation: true,
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'Path to the file to patch.',
      },
      start_line: {
        type: Type.NUMBER,
        description: '1-based line number where the replacement begins (inclusive).',
      },
      end_line: {
        type: Type.NUMBER,
        description: '1-based line number where the replacement ends (inclusive).',
      },
      new_content: {
        type: Type.STRING,
        description: 'The replacement content for lines start_line through end_line.',
      },
    },
    required: ['path', 'start_line', 'end_line', 'new_content'],
  },
  execute: async (args: { path: string; start_line: number; end_line: number; new_content: string }) => {
    const absPath = guardPath(args.path, [], 'write');
    if (!existsSync(absPath)) throw new Error(`File not found: ${absPath}`);

    const lines = readFileSync(absPath, 'utf-8').split('\n');
    const start = args.start_line - 1;
    const end = args.end_line;

    if (start < 0 || end > lines.length) {
      throw new Error(
        `Line range ${args.start_line}–${args.end_line} is out of bounds (file has ${lines.length} lines).`,
      );
    }

    const newLines = args.new_content.split('\n');
    lines.splice(start, end - start, ...newLines);
    writeFileSync(absPath, lines.join('\n'), 'utf-8');

    return `Patched ${absPath}: replaced lines ${args.start_line}–${args.end_line} with ${newLines.length} new line(s).`;
  },
};

// ============================================================================
// list_directory — List files and folders
// ============================================================================

export const listDirectoryTool: Tool = {
  name: 'list_directory',
  description:
    'List the contents of a directory. Returns file names, sizes, and types. Use recursive=true to see nested contents (up to depth 3).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'Directory path to list.',
      },
      recursive: {
        type: Type.BOOLEAN,
        description: 'If true, list contents recursively up to depth 3. Default: false.',
      },
    },
    required: ['path'],
  },
  execute: async (args: { path: string; recursive?: boolean }) => {
    const absPath = resolve(args.path);
    if (!existsSync(absPath)) throw new Error(`Directory not found: ${absPath}`);

    function listDir(dir: string, depth: number): string[] {
      if (depth > 3) return [];
      const entries = readdirSync(dir, { withFileTypes: true });
      const results: string[] = [];
      for (const entry of entries) {
        if (entry.name.startsWith('.') && depth > 0) continue; // skip dotfiles in subdirs
        const fullPath = join(dir, entry.name);
        const rel = relative(absPath, fullPath);
        if (entry.isDirectory()) {
          results.push(`${rel}/`);
          if (args.recursive) {
            results.push(...listDir(fullPath, depth + 1));
          }
        } else {
          const size = statSync(fullPath).size;
          results.push(`${rel} (${size} bytes)`);
        }
      }
      return results;
    }

    const listing = listDir(absPath, 0);
    return listing.join('\n') || '(empty directory)';
  },
};

// ============================================================================
// search_files — Grep-style pattern search
// ============================================================================

export const searchFilesTool: Tool = {
  name: 'search_files',
  description:
    'Search for a text pattern across files in a directory. Returns matching file paths and line excerpts. Equivalent to `grep -rn`.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      pattern: {
        type: Type.STRING,
        description: 'The text or regex pattern to search for.',
      },
      path: {
        type: Type.STRING,
        description: 'Directory or file path to search within. Defaults to current directory.',
      },
      file_pattern: {
        type: Type.STRING,
        description: 'Glob pattern to filter files, e.g. "*.ts" or "*.md". Optional.',
      },
      case_sensitive: {
        type: Type.BOOLEAN,
        description: 'If false, perform case-insensitive search. Default: true.',
      },
    },
    required: ['pattern'],
  },
  execute: async (args: {
    pattern: string;
    path?: string;
    file_pattern?: string;
    case_sensitive?: boolean;
  }) => {
    const searchDir = resolve(args.path || '.');
    const caseFlag = args.case_sensitive === false ? '-i' : '';
    const includeFlag = args.file_pattern ? `--include="${args.file_pattern}"` : '';

    try {
      const cmd = `grep -rn ${caseFlag} ${includeFlag} ${JSON.stringify(args.pattern)} ${JSON.stringify(searchDir)} 2>/dev/null | head -50`;
      const output = execSync(cmd, { encoding: 'utf-8' });
      return output.trim() || 'No matches found.';
    } catch (e: any) {
      // grep exits with code 1 when no matches, that's fine
      if (e.status === 1) return 'No matches found.';
      throw e;
    }
  },
};

// ============================================================================
// run_command — Execute a shell command
// ============================================================================

export const runCommandTool: Tool = {
  name: 'run_command',
  description:
    'Execute a shell command and return its stdout, stderr, and exit code. Use this to run the TypeScript compiler, tests, formatters, or git commands. Safe commands (tsc, npm test, cat, ls, git status/log/diff) run automatically. All others require user confirmation.',
  requiresConfirmation: true,
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description: 'The shell command to execute.',
      },
      cwd: {
        type: Type.STRING,
        description: 'Working directory for the command. Defaults to current directory.',
      },
      timeout_ms: {
        type: Type.NUMBER,
        description: 'Timeout in milliseconds. Default: 30000 (30 seconds).',
      },
    },
    required: ['command'],
  },
  execute: async (args: { command: string; cwd?: string; timeout_ms?: number }) => {
    const cwd = args.cwd ? resolve(args.cwd) : process.cwd();
    const timeout = args.timeout_ms ?? 30_000;

    const opts: ExecSyncOptionsWithStringEncoding = {
      encoding: 'utf-8',
      cwd,
      timeout,
      stdio: 'pipe',
    };

    try {
      const stdout = execSync(args.command, opts);
      return {
        success: true,
        exitCode: 0,
        stdout: stdout.trim(),
        stderr: '',
      };
    } catch (e: any) {
      return {
        success: false,
        exitCode: e.status ?? 1,
        stdout: (e.stdout || '').trim(),
        stderr: (e.stderr || e.message || '').trim(),
      };
    }
  },
};

/** Override requiresConfirmation for safe commands at runtime */
export function createSmartRunCommandTool(): Tool {
  return {
    ...runCommandTool,
    execute: async (args: { command: string; cwd?: string; timeout_ms?: number }) => {
      return runCommandTool.execute(args);
    },
    // requiresConfirmation will be evaluated per-call in the agent command
  };
}

// ============================================================================
// get_file_tree — Compact directory tree for orientation
// ============================================================================

export const getFileTreeTool: Tool = {
  name: 'get_file_tree',
  description:
    'Return a compact tree representation of a directory — similar to the `tree` command. Useful for quickly understanding the project structure before diving into specific files.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'Root directory to build the tree from. Defaults to current directory.',
      },
      max_depth: {
        type: Type.NUMBER,
        description: 'Maximum directory depth to display. Default: 3.',
      },
    },
    required: [],
  },
  execute: async (args: { path?: string; max_depth?: number }) => {
    const root = resolve(args.path || '.');
    const maxDepth = args.max_depth ?? 3;
    const IGNORED = new Set(['node_modules', '.git', 'dist', 'dist-extension', '.next', 'build', 'coverage']);

    function tree(dir: string, prefix: string, depth: number): string[] {
      if (depth > maxDepth) return [];
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        return [];
      }
      entries = entries.filter(e => !IGNORED.has(e) && !e.startsWith('.'));
      const lines: string[] = [];
      entries.forEach((entry, idx) => {
        const isLast = idx === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = isLast ? '    ' : '│   ';
        const fullPath = join(dir, entry);
        const isDir = statSync(fullPath).isDirectory();
        lines.push(`${prefix}${connector}${entry}${isDir ? '/' : ''}`);
        if (isDir) {
          lines.push(...tree(fullPath, prefix + childPrefix, depth + 1));
        }
      });
      return lines;
    }

    const relRoot = relative(process.cwd(), root) || '.';
    return [relRoot + '/'].concat(tree(root, '', 0)).join('\n');
  },
};

// ============================================================================
// Convenience export — all coding tools
// ============================================================================

/** All tools suitable for coding-mode agent sessions */
export const ALL_CODING_TOOLS: Tool[] = [
  readFileTool,
  writeFileTool,
  patchFileTool,
  listDirectoryTool,
  searchFilesTool,
  runCommandTool,
  getFileTreeTool,
];

export { isSafeCommand };
