/**
 * repl/toolHandlers.ts
 *
 * Tool call confirmation, spinner lifecycle, mutation budgets,
 * circuit breaker, and audit logging for the REPL.
 */

import chalk from "chalk";
import ora from "ora";
import pkg from "enquirer";
import { isSafeCommand } from "../../../agent/tools/coding.js";
import { auditLog, SESSION_ID } from "../../../agent/agentAuditLog.js";

const { prompt } = pkg;

// ── Mutation budget constants ──────────────────────────────────────────────────
export const WRITE_TOOLS = new Set([
  "tracker_add_job", "tracker_update_job", "kanban_add_job", "kanban_update_status",
  "save_cover_letter", "delete_cover_letter", "write_file", "patch_file",
  "tracker_recheck_urls", "openings_apply",
]);
export const SESSION_MAX_MUTATIONS = 25;
export const TURN_MAX_MUTATIONS = 10;

// ── Tool label map ─────────────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  list_directory:               "🔍 Scanning workspace...",
  read_file:                    "📖 Reading file...",
  run_command:                  "⚙️  Running command...",
  write_file:                   "✏️  Writing file...",
  patch_file:                   "✏️  Patching file...",
  tracker_list_jobs:            "📊 Checking job pipeline...",
  tracker_add_job:              "➕ Adding job to pipeline...",
  tracker_update_job:           "🔄 Updating job record...",
  tracker_rank_priority:        "📈 Ranking pipeline...",
  tracker_dashboard:            "📊 Fetching pipeline analytics...",
  tracker_find_stale:           "🚩 Checking stale jobs...",
  tracker_inspect_quality:      "🔍 Inspecting data quality...",
  kanban_add_job:               "📌 Saving to Kanban board...",
  kanban_list_jobs:             "📋 Loading Kanban board...",
  kanban_update_status:         "🔄 Updating Kanban status...",
  list_cover_letters:           "📄 Loading cover letters...",
  get_cover_letter:             "📄 Reading cover letter...",
  save_cover_letter:            "💾 Saving cover letter...",
  delete_cover_letter:          "🗑️  Deleting cover letter...",
  browser_navigate:             "🌐 Navigating to page...",
  browser_click:                "🖱️  Clicking element...",
  browser_type:                 "⌨️  Typing input...",
  browser_state:                "🌐 Reading browser state...",
  browser_screenshot:           "📸 Taking screenshot...",
  browser_scroll:               "📜 Scrolling page...",
  browser_wait:                 "⏳ Waiting...",
  browser_close:                "🔒 Closing browser...",
  browser_select:               "🖱️  Selecting option...",
  tracker_recheck_urls:         "🔗 Re-checking job URLs...",
  browser_autofill_application: "📝 Auto-filling application...",
  verify_url:                   "🔍 Verifying URL...",
  verify_job_urls:              "🔍 Verifying job URLs...",
  search_jobs:                  "🔍 Searching jobs...",
  openings_scan:                "🎯 Scanning companies for open roles...",
  openings_list:                "📋 Loading saved openings...",
  openings_apply:               "✅ Marking opening as applied...",
  get_resume:                   "📄 Loading resume...",
  list_resumes:                 "📄 Loading resumes...",
  get_profile:                  "👤 Loading profile...",
};

export interface ToolHandlerState {
  sessionMutations: number;
  turnMutations: number;
  trustAllCommands: boolean;
  trustAllWrites: boolean;
  currentSpinner: ReturnType<typeof ora> | null;
  lastToolCall: { name: string; argsHash: string; count: number };
}

export function createToolHandlerState(): ToolHandlerState {
  return {
    sessionMutations: 0,
    turnMutations: 0,
    trustAllCommands: false,
    trustAllWrites: false,
    currentSpinner: null,
    lastToolCall: { name: "", argsHash: "", count: 0 },
  };
}

/**
 * Called before a tool executes. Returns true to allow, false to deny.
 * Manages confirmation prompts, spinner start, and mutation budgets.
 */
export async function onToolCall(
  name: string,
  args: any,
  thinkingSpinner: ReturnType<typeof ora>,
  state: ToolHandlerState
): Promise<boolean> {
  // Stop thinking spinner on first tool call
  if (thinkingSpinner.isSpinning) {
    thinkingSpinner.stop();
    process.stdout.write("\r\x1b[K");
  }

  // ── Circuit breaker ──────────────────────────────────────────────────────
  const argsHash = JSON.stringify(args).slice(0, 100);
  if (state.lastToolCall.name === name && state.lastToolCall.argsHash === argsHash) {
    state.lastToolCall.count++;
    if (state.lastToolCall.count >= 5) {
      console.log(chalk.red(
        `\n⛔ Loop detected: "${name}" called ${state.lastToolCall.count} times with identical args. Aborting turn.`
      ));
      return false;
    }
  } else {
    state.lastToolCall = { name, argsHash, count: 1 };
  }

  // ── Mutation budget ───────────────────────────────────────────────────────
  if (WRITE_TOOLS.has(name)) {
    state.turnMutations++;
    if (state.turnMutations > TURN_MAX_MUTATIONS) {
      console.log(chalk.red(
        `\n⛔ Turn mutation limit (${TURN_MAX_MUTATIONS}) reached. The agent has made ${state.turnMutations} writes this turn.`
      ));
      return false;
    }
    state.sessionMutations++;
    if (state.sessionMutations >= SESSION_MAX_MUTATIONS) {
      console.log(chalk.yellow(
        `\n⚠️  Session mutation budget exhausted (${SESSION_MAX_MUTATIONS} writes). Restart the agent to continue writing.`
      ));
      return false;
    } else if (state.sessionMutations === SESSION_MAX_MUTATIONS - 5) {
      console.log(chalk.yellow(
        `\n💡 Heads up: ${SESSION_MAX_MUTATIONS - state.sessionMutations} writes remaining this session.`
      ));
    }
  }

  // Print compact tool label
  process.stdout.write(chalk.dim(`  ${TOOL_LABELS[name] ?? "⚙️  Working..."}\n`));

  // ── Per-tool confirmations ────────────────────────────────────────────────
  if (name === "run_command") {
    if (state.trustAllCommands || isSafeCommand(args.command)) return true;
    const confirm = await (prompt as any)({
      type: "select",
      name: "ok",
      message: `Allow running: ${chalk.bold(args.command)}?`,
      choices: ["Yes, run it", "Yes, and trust all commands this session", "No, skip it"],
    });
    if (confirm.ok === "Yes, and trust all commands this session") {
      state.trustAllCommands = true;
      console.log(chalk.dim("   ✅ All commands will run automatically for the rest of this session."));
      return true;
    }
    return confirm.ok === "Yes, run it";
  }

  if (name === "write_file" || name === "patch_file") {
    if (state.trustAllWrites) return true;
    const target = args.path || "(unknown path)";
    const confirm = await (prompt as any)({
      type: "select",
      name: "ok",
      message: `Allow writing to: ${chalk.bold(target)}?`,
      choices: ["Yes, write it", "Yes, and trust all writes this session", "No, skip it"],
    });
    if (confirm.ok === "Yes, and trust all writes this session") {
      state.trustAllWrites = true;
      console.log(chalk.dim("   ✅ All file writes will run automatically for the rest of this session."));
      return true;
    }
    if (confirm.ok !== "Yes, write it") return false;
  }

  if (name === "browser_close") {
    const confirm = await (prompt as any)({
      type: "select",
      name: "ok",
      message: "Close the browser?",
      choices: ["Yes, close it", "No, keep it open"],
    });
    if (confirm.ok !== "Yes, close it") return false;
  }

  // Interview tool takes over the terminal — stop spinner, yield cleanly
  if (name === "start_interview") {
    process.stdout.write("\r\x1b[K");
    return true;
  }

  // All other tools: start a generic spinner
  state.currentSpinner = ora(`Running ${chalk.bold(name)}...`).start();
  return true;
}

/**
 * Called after a tool completes. Stops spinner, logs audit entry.
 */
export function onToolResult(name: string, result: any, state: ToolHandlerState) {
  if (state.currentSpinner) {
    state.currentSpinner.succeed(chalk.dim("Done"));
    state.currentSpinner = null;
  }
  if (name === "start_interview") {
    console.log(chalk.dim("─".repeat(50)));
  }
  auditLog({
    sessionId: SESSION_ID,
    tool: name,
    args: typeof result?._args === "object" ? result._args : {},
    result: typeof result === "string" ? result : JSON.stringify(result ?? ""),
    durationMs: 0,
  });
}
