/**
 * AgentCreditsClient — thin client for the `agentDeductCredits` Firebase callable.
 *
 * Called after each successful Gemini API call to deduct credits from the user's account.
 * Reads the CareerVivid API key from config and sends it with each request.
 */

import { getApiUrl, getApiKey } from "../config.js";

export interface DeductResult {
  ok: true;
  creditsUsed: number;
  creditsRemaining: number;
  monthlyLimit: number;
}

export interface LimitReachedResult {
  ok: false;
  reason: "limit_reached";
  creditsRemaining: number;
}

export type CreditDeductionResult = DeductResult | LimitReachedResult;

// Firebase project region — same as where agentDeductCredits is deployed
const FIREBASE_REGION = "us-west1";
const FIREBASE_PROJECT_ID = "jastalk-firebase"; // CareerVivid's project ID

const CALLABLE_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/agentDeductCredits`;

export class AgentCreditsClient {
  private cvApiKey: string;
  private model: string;
  /** Running session totals */
  private sessionCreditsUsed: number = 0;
  private lastKnownRemaining: number | null = null;

  constructor(cvApiKey: string, model: string) {
    this.cvApiKey = cvApiKey;
    this.model = model;
  }

  /**
   * Deduct credits for one API call.
   * Returns the result — callers should check result.ok and handle limit_reached.
   */
  async deduct(calls = 1): Promise<CreditDeductionResult> {
    try {
      const response = await fetch(CALLABLE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            apiKey: this.cvApiKey,
            model: this.model,
            calls,
          },
        }),
      });

      if (!response.ok) {
        // Network/server error — don't block the user, just warn
        console.warn(`[credits] HTTP ${response.status} — continuing without deduction`);
        return {
          ok: true,
          creditsUsed: 0,
          creditsRemaining: this.lastKnownRemaining ?? 999,
          monthlyLimit: 999,
        };
      }

      const json: any = await response.json();
      const result: CreditDeductionResult = json.result || json;

      if (result.ok) {
        this.sessionCreditsUsed += result.creditsUsed;
        this.lastKnownRemaining = result.creditsRemaining;
      } else {
        this.lastKnownRemaining = result.creditsRemaining;
      }

      return result;
    } catch (_err) {
      // Offline or function not yet deployed — silently skip
      return {
        ok: true,
        creditsUsed: 0,
        creditsRemaining: this.lastKnownRemaining ?? 999,
        monthlyLimit: 999,
      };
    }
  }

  /** Total credits used in this session */
  get sessionUsed(): number {
    return this.sessionCreditsUsed;
  }

  /** Last known remaining credits (may be null before first deduction) */
  get remaining(): number | null {
    return this.lastKnownRemaining;
  }
}
