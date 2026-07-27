/**
 * CVLogger — Generic structured logging module for the CareerVivid CLI.
 *
 * Design goals:
 *  - Zero-friction: never throws, never blocks the user — fire-and-forget
 *  - Extensible: one logger per command/feature, sessionId for event correlation
 *  - Dual-sink: (1) remote POST to cliLog Cloud Function, (2) local JSONL fallback
 *  - Buffered: batched remote flushes to minimize network calls
 *
 * Usage:
 *   import { createLogger } from "../lib/logger.js";
 *   const log = createLogger("interview", { sessionId, apiKey, version: pkg.version });
 *   log.info("session_start", { role, numQuestions });
 *   log.error("connection_error", err, { phase: "websocket_open" });
 *   await log.dispose(); // flush before process exit
 *
 * Extending to new features — no changes to this file needed:
 *   const agentLog = createLogger("agent", { apiKey, version });
 *   const resumeLog = createLogger("resume", { sessionId: resumeId, apiKey, version });
 */

import { appendFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
    /** Severity level */
    level: LogLevel;
    /** Feature area: "interview" | "agent" | "resume" | ... */
    feature: string;
    /** Machine-readable event name: "session_start" | "billing_complete" | ... */
    event: string;
    /** Optional session/entity correlation ID */
    sessionId?: string;
    /** Arbitrary serializable metadata */
    metadata?: Record<string, unknown>;
    /** Error message (when level === "error") */
    errorMessage?: string;
    /** Error stack trace (when level === "error") */
    errorStack?: string;
    /** ISO 8601 timestamp from the client */
    clientTime: string;
    /** CLI package.json version */
    cliVersion: string;
}

// ─── Logger class ─────────────────────────────────────────────────────────────

export class CVLogger {
    private readonly _feature: string;
    private _sessionId: string | undefined;
    private readonly _flushUrl: string;
    private readonly _apiKey: string | undefined;
    private readonly _cliVersion: string;
    private readonly _localLogDir: string;

    private _buffer: LogEvent[] = [];
    private _flushing = false;
    private _disposed = false;
    private _flushTimer: ReturnType<typeof setInterval> | null = null;

    private static readonly FLUSH_INTERVAL_MS = 60_000;
    private static readonly FLUSH_BUFFER_SIZE = 25;

    constructor(opts: {
        feature: string;
        sessionId?: string;
        flushUrl: string;
        apiKey?: string;
        cliVersion: string;
        localLogDir?: string;
    }) {
        this._feature = opts.feature;
        this._sessionId = opts.sessionId;
        this._flushUrl = opts.flushUrl;
        this._apiKey = opts.apiKey;
        this._cliVersion = opts.cliVersion;
        this._localLogDir = opts.localLogDir ?? join(homedir(), ".cv", "logs");

        // Ensure local log directory exists
        try {
            if (!existsSync(this._localLogDir)) {
                mkdirSync(this._localLogDir, { recursive: true });
            }
        } catch { /* non-fatal */ }

        // Auto-flush timer — unref() so it doesn't prevent clean process exit
        this._flushTimer = setInterval(() => {
            if (this._buffer.length > 0) this.flush().catch(() => {});
        }, CVLogger.FLUSH_INTERVAL_MS);
        this._flushTimer.unref?.();
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Informational event. */
    info(event: string, metadata?: Record<string, unknown>): void {
        this._push("info", event, metadata);
    }

    /** Warning event. */
    warn(event: string, metadata?: Record<string, unknown>): void {
        this._push("warn", event, metadata);
    }

    /**
     * Error event. Accepts Error objects or any thrown value.
     * Serializes the error — never rethrows.
     */
    error(event: string, err?: unknown, metadata?: Record<string, unknown>): void {
        let errorMessage: string | undefined;
        let errorStack: string | undefined;
        if (err instanceof Error) {
            errorMessage = err.message;
            errorStack = err.stack;
        } else if (typeof err === "string") {
            errorMessage = err;
        } else if (err != null) {
            try { errorMessage = JSON.stringify(err); } catch { errorMessage = String(err); }
        }
        this._push("error", event, metadata, errorMessage, errorStack);
    }

    /**
     * Record a numeric metric (latency, token count, credit charge, etc.)
     * Stored as an "info" event with metricName + metricValue in metadata.
     */
    metric(name: string, value: number, metadata?: Record<string, unknown>): void {
        this._push("info", `metric:${name}`, { ...metadata, metricName: name, metricValue: value });
    }

    /**
     * Update the sessionId after construction.
     * Use when the sessionId isn't available until after an async call.
     */
    setSessionId(sessionId: string): void {
        this._sessionId = sessionId;
    }

    /**
     * Flush buffered events to the remote endpoint.
     * Safe to call multiple times — idempotent. Never throws.
     */
    async flush(): Promise<void> {
        if (this._flushing || this._buffer.length === 0 || !this._apiKey) return;
        this._flushing = true;
        const batch = this._buffer.splice(0); // atomic drain
        try {
            await fetch(this._flushUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: this._apiKey, events: batch }),
                signal: AbortSignal.timeout(8_000),
            });
        } catch {
            // Remote flush failed: events are already in local JSONL file.
            // Don't re-buffer — avoids memory growth on persistent failures.
        } finally {
            this._flushing = false;
        }
    }

    /**
     * Dispose: stop auto-flush timer + flush remaining events.
     * Always call before the command exits (use try/finally).
     */
    async dispose(): Promise<void> {
        if (this._disposed) return;
        this._disposed = true;
        if (this._flushTimer) {
            clearInterval(this._flushTimer);
            this._flushTimer = null;
        }
        await this.flush();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private _push(
        level: LogLevel,
        event: string,
        metadata?: Record<string, unknown>,
        errorMessage?: string,
        errorStack?: string
    ): void {
        if (this._disposed) return;

        const entry: LogEvent = {
            level,
            feature: this._feature,
            event,
            sessionId: this._sessionId,
            metadata,
            errorMessage,
            errorStack,
            clientTime: new Date().toISOString(),
            cliVersion: this._cliVersion,
        };

        // Write to local JSONL immediately (synchronous, best-effort)
        this._writeLocal(entry);
        this._buffer.push(entry);

        // Trigger remote flush if buffer is large enough
        if (this._buffer.length >= CVLogger.FLUSH_BUFFER_SIZE) {
            this.flush().catch(() => {});
        }
    }

    private _writeLocal(entry: LogEvent): void {
        try {
            const date = entry.clientTime.slice(0, 10); // YYYY-MM-DD
            const logFile = join(this._localLogDir, `${this._feature}-${date}.jsonl`);
            appendFileSync(logFile, JSON.stringify(entry) + "\n");
        } catch { /* local write failure is non-fatal */ }
    }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLI_LOG_URL =
    process.env.CV_FUNCTIONS_URL
        ? `${process.env.CV_FUNCTIONS_URL}/cliLog`
        : "https://us-west1-jastalk-firebase.cloudfunctions.net/cliLog";

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a feature-scoped logger. Pass this around; call dispose() at the end.
 *
 * @param feature   "interview" | "agent" | "resume" | "jobs" | etc.
 * @param opts.sessionId  Correlation ID (interview sessionId, resumeId, …)
 * @param opts.apiKey     CareerVivid cv_live_ key (for remote attribution)
 * @param opts.version    CLI version from package.json
 */
export function createLogger(
    feature: string,
    opts: { sessionId?: string; apiKey?: string; version?: string } = {}
): CVLogger {
    return new CVLogger({
        feature,
        sessionId: opts.sessionId,
        flushUrl: CLI_LOG_URL,
        apiKey: opts.apiKey,
        cliVersion: opts.version ?? "unknown",
    });
}
