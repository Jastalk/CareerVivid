/**
 * Config Manager — reads/writes ~/.careervividrc.json
 *
 * Stored fields:
 *   apiKey   — cv_live_... key
 *   apiUrl   — override for the publish endpoint (default: prod)
 */

import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";

export const CONFIG_FILE = join(homedir(), ".careervividrc.json");

export const DEFAULT_API_URL = "https://careervivid.app/api";

export type LLMProvider = 'careervivid' | 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'custom';

export interface CareerVividConfig {
    apiKey?: string;
    apiUrl?: string;
    /** @internal — CareerVivid platform key, never exposed to users */
    geminiKey?: string;
    targetCompanies?: string;
    /** ISO timestamp of when the CLI session was created */
    sessionCreatedAt?: string;
    /** BYO LLM provider preference */
    llmProvider?: LLMProvider;
    /** BYO model identifier (e.g. "gpt-4o", "claude-opus-4-5", "gemini-2.5-pro") */
    llmModel?: string;
    /** @deprecated use llmKeys[provider] instead — kept for migration */
    llmApiKey?: string;
    /** Per-provider API keys — keyed by provider name */
    llmKeys?: Partial<Record<LLMProvider, string>>;
    /** Custom base URL for OpenAI-compatible endpoints (OpenRouter, Kimi, GLM, Qwen, etc.) */
    llmBaseUrl?: string;
}

export interface LLMConfig {
    provider: LLMProvider;
    model: string;
    apiKey?: string;
    baseUrl?: string;
}

export function loadConfig(): CareerVividConfig {
    if (!existsSync(CONFIG_FILE)) return {};
    try {
        const raw = readFileSync(CONFIG_FILE, "utf-8");
        return JSON.parse(raw) as CareerVividConfig;
    } catch {
        return {};
    }
}

export function saveConfig(config: CareerVividConfig): void {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
}

export function getApiKey(): string | undefined {
    // Priority: env var > config file
    return process.env.CV_API_KEY || loadConfig().apiKey;
}

/** Gemini API key used by `cv agent`. Priority: GEMINI_API_KEY env var > geminiKey in config. */
export function getGeminiKey(): string | undefined {
    return process.env.GEMINI_API_KEY || loadConfig().geminiKey;
}

/** Get the saved API key for a specific BYO provider */
export function getProviderKey(provider: LLMProvider): string | undefined {
    const cfg = loadConfig();
    // Per-provider key takes priority, fallback to old llmApiKey (migration)
    return cfg.llmKeys?.[provider] ?? (cfg.llmProvider === provider ? cfg.llmApiKey : undefined);
}

/** Save the API key for a specific BYO provider */
export function setProviderKey(provider: LLMProvider, key: string): void {
    const cfg = loadConfig();
    cfg.llmKeys = cfg.llmKeys ?? {};
    cfg.llmKeys[provider] = key;
    // Also write to llmApiKey for backwards compat when this is the active provider
    cfg.llmApiKey = key;
    cfg.llmProvider = provider;
    saveConfig(cfg);
}

export function getApiUrl(): string {
    return process.env.CV_API_URL || loadConfig().apiUrl || DEFAULT_API_URL;
}

export function setConfigValue(key: keyof CareerVividConfig, value: string): void {
    const current = loadConfig();
    (current as Record<string, string>)[key] = value;
    saveConfig(current);
}

// ── Session / re-auth ────────────────────────────────────────────────────────

/** How long a CLI session stays valid (90 days in ms) */
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Returns true if the stored session is still valid */
export function isSessionValid(): boolean {
    const cfg = loadConfig();
    if (!cfg.apiKey) return false;
    if (!cfg.sessionCreatedAt) return true; // legacy key with no timestamp → still valid
    const age = Date.now() - new Date(cfg.sessionCreatedAt).getTime();
    return age < SESSION_TTL_MS;
}

/** Call when user successfully authenticates — stamps the session creation time */
export function stampSession(): void {
    const cfg = loadConfig();
    cfg.sessionCreatedAt = new Date().toISOString();
    saveConfig(cfg);
}

/** Clear all auth credentials (logout) */
export function clearSession(): void {
    const cfg = loadConfig();
    delete cfg.apiKey;
    delete cfg.sessionCreatedAt;
    // preserve geminiKey (internal) and user preferences
    saveConfig(cfg);
}

/**
 * Returns the active LLM config, with env var overrides.
 * Priority: CLI flags (passed in) > env vars > config file > defaults.
 */
export function getLlmConfig(overrides?: {
    provider?: LLMProvider;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
}): LLMConfig {
    const cfg = loadConfig();

    const provider: LLMProvider =
        overrides?.provider ??
        (process.env.CV_LLM_PROVIDER as LLMProvider | undefined) ??
        cfg.llmProvider ??
        'careervivid';

    const model: string =
        overrides?.model ??
        process.env.CV_LLM_MODEL ??
        cfg.llmModel ??
        'gemini-2.5-flash';

    const apiKey: string | undefined =
        overrides?.apiKey ??
        process.env.CV_LLM_API_KEY ??
        getProviderKey(provider) ??
        cfg.geminiKey ??
        process.env.GEMINI_API_KEY;

    const baseUrl: string | undefined =
        overrides?.baseUrl ??
        process.env.CV_LLM_BASE_URL ??
        cfg.llmBaseUrl ??
        getDefaultBaseUrl(provider);

    return { provider, model, apiKey, baseUrl };
}

/** Default base URLs for known providers */
function getDefaultBaseUrl(provider: LLMProvider): string | undefined {
    switch (provider) {
        case 'openrouter': return 'https://openrouter.ai/api/v1';
        default: return undefined;
    }
}
