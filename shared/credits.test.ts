import { describe, expect, it } from 'vitest';
import {
    MODEL_RATES,
    CLI_MODELS,
    ACTION_PRICES,
    CREDIT_UNIT_USD,
    PLAN_MONTHLY_CREDITS,
    isBillableModel,
    quoteCliTurn,
    quoteAgentTurn,
    voiceCreditsForSeconds,
    usageCostUsd,
    settlementAmount,
    resolvePlan,
    FREE_AGENT_TURNS_PER_DAY,
    VOICE_CREDITS_PER_MINUTE,
} from './credits';

describe('model allowlist', () => {
    it('derives the CLI allowlist from the rate table so the two cannot drift', () => {
        // The original bug: creditCosts.ts advertised model IDs that agentProxy's
        // hand-maintained allowlist rejected with a 400.
        for (const model of CLI_MODELS) {
            expect(isBillableModel(model)).toBe(true);
            expect(MODEL_RATES[model].cliTurnCost).toBeGreaterThan(0);
        }
    });

    it('refuses to price a model it has no rate for', () => {
        expect(isBillableModel('gemini-3.1-flash-lite-preview')).toBe(false);
        expect(() => quoteCliTurn('gemini-3.1-flash-lite-preview')).toThrow(/Unsupported model/);
    });

    it('will not bill Live audio per turn — it is duration-metered', () => {
        expect(isBillableModel('gemini-live-2.5-flash-native-audio')).toBe(true);
        expect(CLI_MODELS).not.toContain('gemini-live-2.5-flash-native-audio');
        expect(() => quoteCliTurn('gemini-live-2.5-flash-native-audio')).toThrow(/not available for per-turn/);
    });
});

describe('free agent allowance', () => {
    it('is free up to the daily cap, then charged', () => {
        expect(quoteAgentTurn(0)).toMatchObject({ credits: 0, free: true });
        expect(quoteAgentTurn(FREE_AGENT_TURNS_PER_DAY - 1)).toMatchObject({ free: true });
        expect(quoteAgentTurn(FREE_AGENT_TURNS_PER_DAY)).toMatchObject({
            credits: ACTION_PRICES['agent.turn'],
            free: false,
        });
    });
});

describe('voice metering', () => {
    it('bills in 15s blocks rather than rounding up to a minute', () => {
        expect(voiceCreditsForSeconds(15)).toBe(1.25);
        expect(voiceCreditsForSeconds(20)).toBe(2.5); // 2 blocks
        expect(voiceCreditsForSeconds(60)).toBe(VOICE_CREDITS_PER_MINUTE);
    });

    it('covers the cost of a 30-minute session, which the old flat 15 did not', () => {
        const charged = voiceCreditsForSeconds(30 * 60);
        expect(charged).toBe(150);

        // A 30-min native-audio session: ~57.6k input + ~23k output audio tokens.
        const realCost = usageCostUsd('gemini-live-2.5-flash-native-audio', {
            audioInputTokens: 30 * 60 * 32,
            audioOutputTokens: 12 * 60 * 32,
        });
        // The old flat price recovered under a tenth of it.
        expect(15 * CREDIT_UNIT_USD).toBeLessThan(realCost / 5);
        expect(charged * CREDIT_UNIT_USD).toBeGreaterThanOrEqual(realCost * 0.9);
    });

    it('treats a zero-length session as free', () => {
        expect(voiceCreditsForSeconds(0)).toBe(0);
        expect(voiceCreditsForSeconds(-5)).toBe(0);
    });
});

describe('settlement', () => {
    it('charges actual usage when it lands within tolerance', () => {
        expect(settlementAmount(5, 6)).toEqual({ charge: 6, capped: false });
        expect(settlementAmount(5, 3)).toEqual({ charge: 3, capped: false });
    });

    it('absorbs the overage rather than surprise-billing the user', () => {
        // Quoted 5, actually cost 40 — our mispricing, not their bill.
        expect(settlementAmount(5, 40)).toEqual({ charge: 5, capped: true });
    });

    it('never charges for a free action that overruns', () => {
        expect(settlementAmount(0, 12)).toEqual({ charge: 0, capped: true });
    });
});

describe('COGS reconciliation', () => {
    it('prices a typical Flash turn near one credit', () => {
        const usd = usageCostUsd('gemini-2.5-flash', { inputTokens: 4_000, outputTokens: 1_000 });
        expect(usd / CREDIT_UNIT_USD).toBeGreaterThan(0.8);
        expect(usd / CREDIT_UNIT_USD).toBeLessThan(2);
    });

    it('makes free conversation affordable by pinning it to Flash-Lite', () => {
        const lite = usageCostUsd('gemini-2.5-flash-lite', { inputTokens: 4_000, outputTokens: 1_000 });
        const flash = usageCostUsd('gemini-2.5-flash', { inputTokens: 4_000, outputTokens: 1_000 });
        expect(lite * FREE_AGENT_TURNS_PER_DAY * 30).toBeLessThan(1); // under $1/mo at full abuse
        expect(flash).toBeGreaterThan(lite * 3);
    });

    it('returns zero for an unpriced model instead of guessing', () => {
        expect(usageCostUsd('some-future-model', { inputTokens: 1_000_000 })).toBe(0);
    });
});

describe('plans', () => {
    it('maps every Firestore plan alias to a real tier', () => {
        expect(resolvePlan('premium')).toBe('pro');
        expect(resolvePlan('pro_max')).toBe('max');
        expect(resolvePlan(undefined)).toBe('free');
        expect(resolvePlan('nonsense')).toBe('free');
    });

    it('keeps every tier gross-margin positive at full burn', () => {
        const revenue = { free: 0, pro: 12, max: 35, enterprise: 12 };
        for (const [plan, credits] of Object.entries(PLAN_MONTHLY_CREDITS)) {
            const cogs = credits * CREDIT_UNIT_USD;
            const rev = revenue[plan as keyof typeof revenue];
            if (rev > 0) expect(cogs).toBeLessThan(rev * 0.8);
        }
    });
});
