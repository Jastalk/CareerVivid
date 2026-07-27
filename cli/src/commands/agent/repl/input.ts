/**
 * repl/input.ts
 *
 * Handles all user input collection:
 *  - First-turn quick-action menu (autocomplete) — persona-aware with mouse click support & digit shortcuts
 *  - Subsequent turn free-text input with mouse click cursor positioning
 *  - Multi-line paste mode (<<<)
 *  - Fast-paste buffer accumulation
 */

import chalk from "chalk";
import pkg from "enquirer";
import type { PersonaDefinition } from "../personas.js";

const { prompt } = pkg;

const PICK_UP_LABEL = "🗓️  Pick up where we left off";

/**
 * ClickableInput
 * Subclasses Enquirer's Input prompt to enable mouse tracking
 * and position the cursor on click.
 */
class ClickableInput extends (pkg as any).Input {
  private originalEmit: any = null;
  private pendingClick: { col: number; row: number } | null = null;

  constructor(options: any) {
    super(options);
  }

  async run() {
    if (process.stdin.isTTY) {
      this.stdout.write('\x1b[?1000h\x1b[?1006h'); // Enable SGR mouse tracking
      
      this.originalEmit = process.stdin.emit;
      const self = this;
      (process.stdin as any).emit = function(event: string | symbol, ...args: any[]) {
        if (event === 'data' && Buffer.isBuffer(args[0])) {
          let str = args[0].toString();
          let intercepted = false;

          const mouseRegex = /\x1b\[<0;\d+;\d+[Mm]/g;
          if (mouseRegex.test(str)) {
            intercepted = true;
            const firstMatch = str.match(/\x1b\[<0;(\d+);(\d+)([Mm])/);
            if (firstMatch) {
              const col = parseInt(firstMatch[1], 10);
              const row = parseInt(firstMatch[2], 10);
              const isRelease = firstMatch[3] === 'm';
              if (!isRelease) {
                self.pendingClick = { col, row };
                self.stdout.write('\x1b[6n'); // Query cursor position
              }
            }
            str = str.replace(mouseRegex, '');
          }

          const cprRegex = /\x1b\[\d+;\d+R/g;
          if (cprRegex.test(str)) {
            intercepted = true;
            const firstCpr = str.match(/\x1b\[(\d+);(\d+)R/);
            if (firstCpr) {
              const row = parseInt(firstCpr[1], 10);
              const col = parseInt(firstCpr[2], 10);
              self.handleCpr(row, col);
            }
            str = str.replace(cprRegex, '');
          }

          if (intercepted) {
            if (str.length > 0) {
              args[0] = Buffer.from(str);
            } else {
              return true; // Consume
            }
          }
        }
        return self.originalEmit.apply(this, [event, ...args]);
      };
    }

    try {
      return await super.run();
    } finally {
      if (process.stdin.isTTY) {
        this.stdout.write('\x1b[?1000l\x1b[?1006l'); // Disable SGR mouse tracking
        if (this.originalEmit) {
          (process.stdin as any).emit = this.originalEmit;
        }
      }
    }
  }

  handleCpr(cursorRow: number, cursorCol: number) {
    if (!this.pendingClick) return;
    const click = this.pendingClick;
    this.pendingClick = null;

    // Extract raw prompt text without ANSI colors
    const promptText = (this.state.prompt || "").replace(/\x1b\[[0-9;]*m/g, "");
    const promptWidth = promptText.length;

    const totalWidth = this.width || 80;
    const lineCount = Math.ceil((promptWidth + this.input.length) / totalWidth) || 1;

    // Check if click row is within the prompt bounds
    if (click.row <= cursorRow && click.row >= cursorRow - lineCount + 1) {
      const relativeRow = click.row - (cursorRow - lineCount + 1);
      const L0_chars = totalWidth - promptWidth;

      let clickedIndex = 0;
      if (relativeRow === 0) {
        clickedIndex = click.col - promptWidth - 1;
      } else {
        clickedIndex = L0_chars + (relativeRow - 1) * totalWidth + (click.col - 1);
      }

      // Clamp index
      clickedIndex = Math.max(0, Math.min(this.input.length, clickedIndex));
      this.cursor = clickedIndex;
      this.render();
    }
  }
}

/**
 * ClickableAutocomplete
 * Subclasses Enquirer's Autocomplete prompt to enable mouse tracking,
 * mouse-click selection, and keyboard digit shortcuts.
 */
class ClickableAutocomplete extends (pkg as any).AutoComplete {
  private originalEmit: any = null;
  private pendingClick: { col: number; row: number } | null = null;
  private menuSize: number;

  constructor(options: any) {
    super(options);
    this.menuSize = options.choices ? options.choices.length : 0;
  }

  async run() {
    if (process.stdin.isTTY) {
      this.stdout.write('\x1b[?1000h\x1b[?1006h'); // Enable SGR mouse tracking
      
      this.originalEmit = process.stdin.emit;
      const self = this;
      (process.stdin as any).emit = function(event: string | symbol, ...args: any[]) {
        if (event === 'data' && Buffer.isBuffer(args[0])) {
          let str = args[0].toString();
          let intercepted = false;

          const mouseRegex = /\x1b\[<0;\d+;\d+[Mm]/g;
          if (mouseRegex.test(str)) {
            intercepted = true;
            const firstMatch = str.match(/\x1b\[<0;(\d+);(\d+)([Mm])/);
            if (firstMatch) {
              const col = parseInt(firstMatch[1], 10);
              const row = parseInt(firstMatch[2], 10);
              const isRelease = firstMatch[3] === 'm';
              if (!isRelease) {
                self.pendingClick = { col, row };
                self.stdout.write('\x1b[6n'); // Query cursor position
              }
            }
            str = str.replace(mouseRegex, '');
          }

          const cprRegex = /\x1b\[\d+;\d+R/g;
          if (cprRegex.test(str)) {
            intercepted = true;
            const firstCpr = str.match(/\x1b\[(\d+);(\d+)R/);
            if (firstCpr) {
              const row = parseInt(firstCpr[1], 10);
              const col = parseInt(firstCpr[2], 10);
              self.handleCpr(row, col);
            }
            str = str.replace(cprRegex, '');
          }

          if (intercepted) {
            if (str.length > 0) {
              args[0] = Buffer.from(str);
            } else {
              return true; // Consume
            }
          }
        }
        return self.originalEmit.apply(this, [event, ...args]);
      };
    }

    try {
      return await super.run();
    } finally {
      if (process.stdin.isTTY) {
        this.stdout.write('\x1b[?1000l\x1b[?1006l'); // Disable SGR mouse tracking
        if (this.originalEmit) {
          (process.stdin as any).emit = this.originalEmit;
        }
      }
    }
  }

  async keypress(char: string, key: any) {
    // Digit shortcut selection: immediately select and submit
    const isDigitChar = char >= '1' && char <= String(this.choices.length);
    const isDigitKey = key && key.name >= '1' && key.name <= String(this.choices.length);
    if (isDigitChar || isDigitKey) {
      const digitStr = isDigitChar ? char : key.name;
      const idx = parseInt(digitStr, 10) - 1;
      if (idx >= 0 && idx < this.choices.length) {
        this.index = idx;
        return this.submit();
      }
    }
    return super.keypress(char, key);
  }

  handleCpr(cursorRow: number, cursorCol: number) {
    if (!this.pendingClick) return;
    const click = this.pendingClick;
    this.pendingClick = null;

    // 1. Click is below the prompt (interactive choices list)
    const relativeInteractiveIndex = click.row - cursorRow - 1;
    if (relativeInteractiveIndex >= 0 && relativeInteractiveIndex < this.visible.length) {
      const visibleChoice = this.visible[relativeInteractiveIndex];
      const actualIndex = this.choices.indexOf(visibleChoice);
      if (actualIndex !== -1) {
        this.index = actualIndex;
        this.submit();
      }
      return;
    }

    // 2. Click is above the prompt (static printed menu items)
    const N = this.menuSize;
    const staticStartIndex = cursorRow - 1 - N;
    const relativeStaticIndex = click.row - staticStartIndex;
    if (relativeStaticIndex >= 0 && relativeStaticIndex < N) {
      this.index = relativeStaticIndex;
      this.submit();
    }
  }
}

/**
 * Read the first-turn menu selection.
 * Returns the cleaned user-intent string ready to send to the agent.
 */
export async function readFirstTurnInput(persona: PersonaDefinition): Promise<string> {
  console.log(chalk.dim("  What would you like to do today?\n"));
  for (let i = 0; i < persona.menuItems.length; i++) {
    console.log(chalk.dim(`  ${i + 1}. ${persona.menuItems[i]}`));
  }
  console.log("");

  const promptInstance = new ClickableAutocomplete({
    name: "choice",
    message: chalk.bold.hex("#6366f1")("❯") + chalk.dim(" ·"),
    limit: persona.menuItems.length,
    suggest(input: string, choices: any[]) {
      if (!input) return choices;
      return choices.filter((c: any) =>
        c.value.toLowerCase().includes(input.toLowerCase())
      );
    },
    choices: persona.menuItems.map((item, idx) => ({
      name: item, // Returned key matches persona.menuPrompts
      message: `${idx + 1}. ${item}`, // Displayed option has the number prefix
      value: item,
    })),
    footer: chalk.dim("  ↑↓ to navigate  ·  type to filter  ·  Enter or number to select"),
  });

  const firstResp = await promptInstance.run();
  const raw = firstResp?.trim() ?? "";

  // 1. "Pick up where we left off" → persona-specific context-gathering prompt
  if (raw === PICK_UP_LABEL || raw.toLowerCase().includes("pick up")) {
    return persona.pickUpPrompt;
  }

  // 2. Per-item prompt override (e.g. scaffold, debug) → rich targeted prompt
  if (persona.menuPrompts?.[raw]) {
    return persona.menuPrompts[raw];
  }

  // 3. Default: strip emoji prefix and send clean text
  return raw.replace(/^[\p{Emoji}\s]+/u, "").trim() || raw;
}

/** Reads a single multi-line paste block. User ends with an empty Enter. */
export async function readMultiLineInput(prefix: string): Promise<string> {
  console.log(chalk.dim("  📋 Multi-line mode: paste your text, then press Enter twice to submit.\n"));
  const lines: string[] = prefix ? [prefix] : [];
  let emptyCount = 0;

  while (emptyCount < 1) {
    const lineResp = await (prompt as any)({
      type: "input",
      name: "line",
      message: chalk.dim("  │"),
    });
    if (lineResp.line === "") {
      emptyCount++;
    } else {
      emptyCount = 0;
      lines.push(lineResp.line);
    }
  }

  return lines.join("\n").trim();
}

export interface InputResult {
  text: string;
  /** True when the input arrived in < 150ms (possible paste line) */
  isFastLine: boolean;
}

/** Read a normal subsequent-turn line. Returns the raw text and timing flag. */
export async function readNormalInput(showContinuation: boolean): Promise<InputResult> {
  const t0 = Date.now();
  const promptInstance = new ClickableInput({
    name: "query",
    message: showContinuation
      ? chalk.dim("... ")
      : chalk.bold.hex("#6366f1")("❯") + chalk.dim(" ·"),
  });
  const query = await promptInstance.run();
  return { text: query as string, isFastLine: Date.now() - t0 < 150 };
}
