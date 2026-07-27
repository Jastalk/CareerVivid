/**
 * IDataLogger.ts — Dependency-Inversion storage interface for the eval framework.
 *
 * DESIGN PRINCIPLE (Dependency Inversion):
 *   High-level modules (runner, scorer) depend on THIS abstraction, never on
 *   a concrete storage technology. Swapping CSV → Firebase → BigQuery requires
 *   changing exactly ONE line in eval/index.ts:
 *
 *     const logger: IDataLogger = new CsvDataLogger(opts);
 *                                         ↕ swap here
 *     const logger: IDataLogger = new FirebaseDataLogger(opts);
 *
 * New logger implementations should:
 *   1. Implement this interface
 *   2. Be placed in cli/src/eval/storage/
 *   3. Export a matching *Options type
 */

import type { EvalResult, RunSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Core interface
// ---------------------------------------------------------------------------

export interface IDataLogger {
  /**
   * Persist a single test result immediately after each test completes.
   * Implementations MUST be non-blocking from the runner's perspective
   * (i.e., they should handle internal buffering/retry themselves).
   */
  log(result: EvalResult): Promise<void>;

  /**
   * Flush any internal buffers and ensure all log() calls are durably written.
   * Called once after all tests complete.
   */
  flush(): Promise<void>;

  /**
   * Release resources (file handles, DB connections, etc.).
   * Called once after flush().
   */
  close(): Promise<void>;

  /**
   * Optional: write a run-level summary record (aggregate stats).
   * Implementations may no-op this if they don't support summary rows.
   */
  logSummary?(summary: RunSummary): Promise<void>;
}

// ---------------------------------------------------------------------------
// Factory helper — makes dependency injection explicit and type-safe
// ---------------------------------------------------------------------------

/**
 * A factory function type for constructing an IDataLogger from its options.
 * Registering factories instead of classes enables runtime logger selection
 * based on config (e.g. env var, CLI flag).
 */
export type DataLoggerFactory<TOptions> = (options: TOptions) => IDataLogger;
