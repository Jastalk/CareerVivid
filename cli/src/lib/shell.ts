/**
 * shell.ts — Subshell escape for the CareerVivid REPL
 *
 * Intercepts user input starting with `!` and spawns it as a raw
 * shell command. stdout/stderr are piped directly to the terminal.
 * The agent session and conversation history are never affected.
 */

import { spawn } from "child_process";

/**
 * Runs a shell command and streams its output to the terminal.
 * Returns a promise that resolves when the command exits.
 */
export function runShellEscape(command: string): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      stdio: "inherit", // pipe stdin/stdout/stderr directly to TTY
    });

    child.on("error", (err) => {
      process.stderr.write(`\n⚠️  Shell error: ${err.message}\n`);
      resolve();
    });

    child.on("close", (code) => {
      if (code !== 0 && code !== null) {
        process.stdout.write(`\n  [exit ${code}]\n`);
      }
      resolve();
    });
  });
}
