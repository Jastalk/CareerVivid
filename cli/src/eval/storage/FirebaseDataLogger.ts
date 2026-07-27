/**
 * FirebaseDataLogger.ts — Firebase/Firestore implementation stub.
 *
 * MIGRATION GUIDE (when ready to move from CSV → Firebase):
 *
 * 1. Install the Firebase Admin SDK:
 *      npm install firebase-admin --save
 *
 * 2. Set up a service account key at ~/.careervivid/firebase-service-account.json
 *    OR use GOOGLE_APPLICATION_CREDENTIALS env var.
 *
 * 3. Create a Firestore collection named "agent_eval_results" in your project.
 *
 * 4. Uncomment the implementation below and remove the NotImplementedError.
 *
 * 5. In cli/src/eval/index.ts (or eval.ts command), change:
 *      const logger = new CsvDataLogger(csvOpts);
 *    to:
 *      const logger = new FirebaseDataLogger({ projectId: "jastalk-firebase" });
 *
 * That's it. No other files need to change.
 */

import type { IDataLogger } from "./IDataLogger.js";
import type { EvalResult, RunSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface FirebaseDataLoggerOptions {
  /** GCP project ID (e.g. "jastalk-firebase") */
  projectId: string;
  /** Firestore collection name. Default: "agent_eval_results" */
  collection?: string;
  /** Path to service account JSON. Falls back to ADC if omitted. */
  serviceAccountPath?: string;
}

// ---------------------------------------------------------------------------
// Stub implementation
// ---------------------------------------------------------------------------

/**
 * Placeholder FirebaseDataLogger that satisfies IDataLogger but throws
 * NotImplementedError on any call. Replace with the real implementation
 * when migrating from CSV storage.
 */
export class FirebaseDataLogger implements IDataLogger {
  private readonly projectId: string;
  private readonly collection: string;

  constructor(options: FirebaseDataLoggerOptions) {
    this.projectId   = options.projectId;
    this.collection  = options.collection ?? "agent_eval_results";
    this.throwNotImplemented();
  }

  async log(_result: EvalResult): Promise<void> {
    this.throwNotImplemented();
  }

  async flush(): Promise<void> {
    this.throwNotImplemented();
  }

  async close(): Promise<void> {
    this.throwNotImplemented();
  }

  async logSummary(_summary: RunSummary): Promise<void> {
    this.throwNotImplemented();
  }

  // ---------------------------------------------------------------------------
  // FUTURE IMPLEMENTATION SKELETON (uncomment + install firebase-admin)
  // ---------------------------------------------------------------------------
  //
  // private db!: FirebaseFirestore.Firestore;
  //
  // constructor(options: FirebaseDataLoggerOptions) {
  //   const admin = require("firebase-admin");
  //   const credential = options.serviceAccountPath
  //     ? admin.credential.cert(require(options.serviceAccountPath))
  //     : admin.credential.applicationDefault();
  //   if (!admin.apps.length) {
  //     admin.initializeApp({ credential, projectId: options.projectId });
  //   }
  //   this.db = admin.firestore();
  //   this.projectId = options.projectId;
  //   this.collection = options.collection ?? "agent_eval_results";
  // }
  //
  // async log(result: EvalResult): Promise<void> {
  //   await this.db.collection(this.collection).add({
  //     ...result,
  //     testCase: { ...result.testCase }, // flatten nested object
  //     createdAt: admin.firestore.FieldValue.serverTimestamp(),
  //   });
  // }
  //
  // async flush(): Promise<void> { /* no-op — Firestore writes are immediate */ }
  // async close(): Promise<void> { /* no-op */ }
  //
  // async logSummary(summary: RunSummary): Promise<void> {
  //   await this.db.collection("agent_eval_runs").doc(summary.runId).set(summary);
  // }

  private throwNotImplemented(): never {
    throw new Error(
      `FirebaseDataLogger is not yet implemented.\n` +
      `To use Firebase for eval telemetry:\n` +
      `  1. Follow the MIGRATION GUIDE in FirebaseDataLogger.ts\n` +
      `  2. Swap CsvDataLogger → FirebaseDataLogger in cli/src/commands/eval.ts\n` +
      `Project: ${this.projectId}  Collection: ${this.collection}`,
    );
  }
}
