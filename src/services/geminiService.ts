import { ResumeData, TranscriptEntry, InterviewAnalysis, JobApplicationData, ResumeMatchAnalysis } from '../types';
import { auth } from '../firebase';
import { generateSafeUUID } from '../constants';
import { trackUsage } from './trackingService';
import { reportError } from './errorService';
import { AI_CREDIT_COSTS } from '../config/creditCosts';
import { parseModelJson, type ParsedModelJson } from './modelJson';
import {
    createFallbackSystemDesignPlan,
    normalizeSystemDesignPlan,
    type SystemDesignDiagramPlan,
    type SystemDesignDiagramStyle,
} from '../lib/systemDesignDiagram';

// --- Configuration ---
const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL || 'https://us-west1-jastalk-firebase.cloudfunctions.net/geminiProxy';
export const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL_FALLBACK = 'gemini-2.5-flash-image';
const IMAGE_MODEL_PRIMARY = 'gemini-2.5-flash-image';

/**
 * The model that grades a practice attempt — transcript, diagram, or code.
 *
 * Every scored report goes through here. Grading is the hardest reasoning this
 * app does on the user's own work: tally what was actually answered or drawn,
 * score each dimension from that tally, and cite specific moments back. The
 * failure mode that matters is attribution — crediting substance the candidate
 * never produced — and that is exactly what a coaching report must not do.
 *
 * Call these through `callGeminiWithFallback` so a routing gap degrades the
 * report rather than losing it.
 */
export const REPORT_MODEL = 'gemini-3.6-flash';

/**
 * The model that drafts a resume from a prompt.
 *
 * Resume generation is structured writing against a strict JSON schema, not
 * judgment: the schema fixes the shape and the prompt fixes the content. The
 * lite model is the right tier for it, and it is the cheapest thing a new user
 * is likely to run first.
 */
export const RESUME_GENERATION_MODEL = 'gemini-3.1-flash-lite';

/**
 * Names the proxy cannot run, mapped to the nearest one it can.
 *
 * `gemini-3.6-flash` and `gemini-3.1-flash-lite` are deliberately absent: both
 * are on the proxy's allowlist and `getVertexLocationForModel` already routes
 * gemini-3.x to the global endpoint, so their entries were stale downgrades
 * that made asking for them silently return a 2.5 model. Callers that need a
 * guaranteed answer use `callGeminiWithFallback` instead of an alias — a
 * fallback that logs beats a downgrade nobody can see.
 */
const TEXT_MODEL_ALIASES: Record<string, string> = {
    'gemini-3.1-flash-lite-preview': 'gemini-2.5-flash-lite',
    'gemini-3.5-flash-lite': 'gemini-2.5-flash-lite',
    'gemini-3.5-flash': 'gemini-2.5-flash',
    'gemini-3.1-pro-preview': 'gemini-2.5-pro',
    'gemini-3-flash-preview': 'gemini-2.5-flash',
    'gemini-3.1-flash-preview': 'gemini-2.5-flash',
    'gemini-2.5-flash-preview': 'gemini-2.5-flash',
    'gemini-2.5-pro-preview': 'gemini-2.5-pro',
};

const normalizeTextModelName = (modelName?: string): string | undefined =>
    modelName ? TEXT_MODEL_ALIASES[modelName] || modelName : modelName;

/**
 * Errors that mean "this project cannot serve that model", as opposed to a
 * transient failure. `retryOperation` inside `callGeminiProxy` has already
 * given up by the time we see one, so retrying the same model is pointless —
 * but the same prompt on a different model is not.
 */
const MODEL_UNAVAILABLE = /model not available|not found|does not exist|not supported|unsupported model/i;

/**
 * Run a prompt on `preferred`, falling back to `fallback` if the project cannot
 * serve it.
 *
 * Model rollout and code deploy are separate events here: the frontend ships
 * from Hosting, the allowlist from Functions, and the model itself is enabled
 * on the Vertex project. Any of the three can lag. Without this, naming a newer
 * model turns every affected call into a hard failure the moment they fall out
 * of step — for a report that means the user finishes an interview and gets
 * nothing back, which is far worse than a report graded by the older model.
 */
/**
 * Ceiling for structured JSON generation.
 *
 * Set explicitly rather than left to the model default, which differs per model
 * — so changing a model silently changed how much room a resume had to finish
 * in. On 2.5-flash thinking tokens also draw from this budget, which is how a
 * response ends mid-sentence at 2.7 KB while nothing reports an error.
 */
const STRUCTURED_JSON_MAX_TOKENS = 16_384;

/** parseModelJson, but returning null instead of throwing, for retry paths. */
const tryParseModelJson = <T = any>(text: unknown): ParsedModelJson<T> | null => {
    try {
        return parseModelJson<T>(text);
    } catch {
        return null;
    }
};

/** True when the model stopped because it ran out of room, not because it was done. */
export const wasTruncated = (response: any): boolean => {
    const reason = response?.candidates?.[0]?.finishReason;
    return typeof reason === 'string' && reason !== 'STOP' && reason !== '';
};

export const callGeminiWithFallback = async (
    preferred: string,
    fallback: string,
    payload: Omit<ProxyPayload, 'modelName'>,
): Promise<{ text: string; response: any }> => {
    if (preferred === fallback) return callGeminiProxy({ ...payload, modelName: preferred });
    try {
        return await callGeminiProxy({ ...payload, modelName: preferred });
    } catch (error) {
        if (!MODEL_UNAVAILABLE.test((error as Error)?.message ?? '')) throw error;
        console.warn(`[gemini] ${preferred} unavailable, falling back to ${fallback}.`, error);
        return callGeminiProxy({ ...payload, modelName: fallback });
    }
};

// --- Proxy Helper ---
export interface ProxyPayload {
    modelName?: string;
    contents: any;
    config?: any;
    systemInstruction?: any;
}

const extractSystemText = (parts?: { text?: string }[]) => {
    if (!Array.isArray(parts)) return '';
    return parts.map(part => part.text || '').filter(Boolean).join('\n');
};

const normalizeGeminiContents = (contents: any, systemInstruction?: any) => {
    const rawContents = Array.isArray(contents) ? contents : [contents];
    const systemTexts: string[] = [];

    const normalizedContents = rawContents.map(item => {
        if (typeof item === 'string') {
            return { role: 'user', parts: [{ text: item }] };
        }
        if (!item || typeof item !== 'object') {
            return { role: 'user', parts: [{ text: String(item ?? '') }] };
        }
        if (item.role === 'system' || item.role === 'developer') {
            const text = extractSystemText(item.parts);
            if (text) systemTexts.push(text);
            return null;
        }
        return {
            ...item,
            role: item.role === 'assistant' ? 'model' : item.role === 'model' ? 'model' : 'user'
        };
    }).filter(Boolean);

    const extraSystemText = systemTexts.join('\n\n');
    const normalizedSystemInstruction = extraSystemText
        ? [systemInstruction, extraSystemText].filter(Boolean).join('\n\n')
        : systemInstruction;

    return { normalizedContents, normalizedSystemInstruction };
};

// --- Concurrency & Retry Logic ---

const MAX_CONCURRENT_REQUESTS = 3;

/**
 * RequestQueue manages concurrent AI service requests using a Breadth-First-Search (BFS) 
 * approach to task scheduling. 
 * 
 * By using a FIFO (First-In, First-Out) queue, it ensures that requests are processed 
 * in the order they were received, preventing request starvation while strictly 
 * enforcing concurrency limits to stay within API rate thresholds.
 */
class RequestQueue {
    // Tasks are stored in a queue for FIFO (Breadth-First) processing
    private queue: (() => Promise<void>)[] = [];
    private activeRequests = 0;

    /**
     * Adds a new operation to the queue.
     * If fewer than MAX_CONCURRENT_REQUESTS are active, it executes immediately.
     * Otherwise, it's queued for sequential processing.
     */
    async add<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const task = async () => {
                this.activeRequests++;
                try {
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.activeRequests--;
                    this.processNext();
                }
            };

            if (this.activeRequests < MAX_CONCURRENT_REQUESTS) {
                task();
            } else {
                this.queue.push(task);
            }
        });
    }

    /**
     * Processes the next task in the queue.
     * This ensures constant-time O(1) retrieval of the next scheduled task.
     */
    private processNext() {
        if (this.queue.length > 0 && this.activeRequests < MAX_CONCURRENT_REQUESTS) {
            const nextTask = this.queue.shift();
            if (nextTask) nextTask();
        }
    }
}

const requestQueue = new RequestQueue();

const retryOperation = async <T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        if (retries > 0 && (error.message?.includes('429') || error.message?.includes('503'))) {
            // console.warn(`Retrying Gemini API request... Attempts left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOperation(operation, retries - 1, delay * 2);
        }
        throw error;
    }
};

export const callGeminiProxy = async (payload: ProxyPayload): Promise<{ text: string, response: any }> => {
    return requestQueue.add(() => retryOperation(async () => {
        try {
            const normalizedModelName = normalizeTextModelName(payload.modelName);
            const { normalizedContents, normalizedSystemInstruction } = normalizeGeminiContents(
                payload.contents,
                payload.systemInstruction
            );

            // The proxy verifies this token and refuses anonymous callers, so a
            // missing one is worth failing on here rather than round-tripping.
            const user = auth.currentUser;
            if (!user) throw new Error('Sign in to use AI features.');
            const idToken = await user.getIdToken();

            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    data: {
                        ...payload,
                        modelName: normalizedModelName,
                        contents: normalizedContents,
                        systemInstruction: normalizedSystemInstruction
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                // Throw specific errors for retry logic
                if (response.status === 429) throw new Error(`Gemini Rate Limit (429): ${errText}`);
                if (response.status === 503) throw new Error(`Gemini Service Overloaded (503): ${errText}`);
                throw new Error(`Proxy Error (${response.status}): ${errText}`);
            }

            if (!response.body) throw new Error("No response body received from proxy.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            const END_MARKER = "__END_GEMINI__";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
            }
            buffer += decoder.decode();

            const parts = buffer.split(END_MARKER);
            if (parts.length < 2) {
                try {
                    const manualJson = JSON.parse(buffer);
                    if (manualJson.error) throw new Error(manualJson.error);
                } catch (e) { }

                console.warn("Gemini Proxy response missing end marker. Returning buffer as text.", buffer);
                return { text: buffer, response: {} };
            }

            const jsonStr = parts[1];
            try {
                return JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse proxy payload JSON", jsonStr);
                throw new Error("Failed to parse AI response.");
            }

        } catch (error) {
            console.error("CallGeminiProxy failed:", error);
            throw error;
        }
    }));
};

const ENTERPRISE_AGENT_URL =
    import.meta.env.VITE_ENTERPRISE_AGENT_URL
    || PROXY_URL.replace(/\/geminiProxy$/, '/enterpriseAgentProxy');

/** Datastores the Enterprise Agent can be pointed at. Mirrors ENTERPRISE_DATASTORES server-side. */
export type EnterpriseDatastore = 'jobCatalog' | 'rubrics';

export interface EnterpriseCitation {
    referenceId: string | null;
    title: string | null;
    uri: string | null;
    snippet: string | null;
    startIndex: number;
    endIndex: number;
}

export interface EnterpriseAnswer {
    text: string;
    groundingScore: number | null;
    citations: EnterpriseCitation[];
    sessionId: string | null;
    structured?: unknown;
    /** True when the answer came from the legacy ungrounded proxy. */
    fellBack: boolean;
}

/** The agent refused on purpose — ungrounded, unsafe, or adversarial. Not retryable. */
export class EnterpriseAgentRefusal extends Error {
    constructor(message: string, readonly detail: unknown) {
        super(message);
        this.name = 'EnterpriseAgentRefusal';
    }
}

/**
 * Ask the Enterprise Agent a question grounded in a knowledge datastore.
 *
 * Falls back to the legacy Gemini proxy only when the agent is *unreachable* —
 * not provisioned yet, network failure, 5xx. A 422 means the platform evaluated
 * the answer and rejected it for groundedness or safety; retrying that on the
 * ungrounded proxy would hand back exactly the hallucination the guardrail just
 * caught, so it is surfaced to the caller instead.
 */
export const callEnterpriseAgent = async (options: {
    userMessage: string;
    datastoreId?: EnterpriseDatastore;
    sessionId?: string;
    structured?: boolean;
    filter?: string;
    /** Set false for surfaces where an ungrounded answer is worse than none. */
    allowLegacyFallback?: boolean;
}): Promise<EnterpriseAnswer> => {
    const {
        userMessage,
        datastoreId = 'jobCatalog',
        sessionId,
        structured = false,
        filter,
        allowLegacyFallback = true,
    } = options;

    const user = auth.currentUser;
    if (!user) throw new Error('Sign in to use AI features.');
    const idToken = await user.getIdToken();

    let response: Response;
    try {
        response = await fetch(ENTERPRISE_AGENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ data: { userMessage, datastoreId, sessionId, structured, filter } })
        });
    } catch (networkError) {
        if (!allowLegacyFallback) throw networkError;
        const legacy = await callGeminiProxy({ contents: userMessage });
        return { text: legacy.text, groundingScore: null, citations: [], sessionId: null, fellBack: true };
    }

    if (response.status === 422) {
        // Deliberate refusal — carries the grounding score / skip reasons.
        throw new EnterpriseAgentRefusal('The agent could not ground an answer.', await response.json().catch(() => null));
    }

    if (!response.ok) {
        if (!allowLegacyFallback) {
            throw new Error(`Enterprise agent error (${response.status}): ${await response.text()}`);
        }
        const legacy = await callGeminiProxy({ contents: userMessage });
        return { text: legacy.text, groundingScore: null, citations: [], sessionId: null, fellBack: true };
    }

    const data = await response.json();
    return {
        text: data.text ?? '',
        groundingScore: data.groundingScore ?? null,
        citations: data.citations ?? [],
        sessionId: data.sessionId ?? null,
        structured: data.structured,
        fellBack: false,
    };
};

// --- Function Implementations ---

// Note: Replaced Type.* with raw strings to avoid SDK dependency
const resumeSchema = {
    type: "OBJECT",
    properties: {
        personalDetails: {
            type: "OBJECT",
            description: "The user's personal contact information.",
            properties: {
                jobTitle: { type: "STRING", description: "The user's desired job title. Return an empty string if not found." },
                firstName: { type: "STRING", description: "The user's first name. Return an empty string if not found." },
                lastName: { type: "STRING", description: "The user's last name. Return an empty string if not found." },
                email: { type: "STRING", description: "The user's email address. Return an empty string if not found." },
                phone: { type: "STRING", description: "The user's phone number. Return an empty string if not found." },
                address: { type: "STRING", description: "The user's full street address (e.g., '123 Cloud Lane'). Return an empty string if not found." },
                city: { type: "STRING", description: "The user's city. Return an empty string if not found." },
                postalCode: { type: "STRING", description: "The user's postal or zip code. Return an empty string if not found." },
                country: { type: "STRING", description: "The user's country. Return an empty string if not found." },
            },
            required: ['jobTitle', 'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode', 'country']
        },
        professionalSummary: {
            type: "STRING",
            description: "A 3-5 sentence professional summary. Return an empty string if not found."
        },
        websites: {
            type: "ARRAY",
            description: "A list of websites or social links. Return an empty array if none are found.",
            items: {
                type: "OBJECT",
                properties: {
                    label: { type: "STRING", description: "The name of the website (e.g., LinkedIn, GitHub)." },
                    url: { type: "STRING", description: "The full URL." },
                },
                required: ['label', 'url']
            },
        },
        skills: {
            type: "ARRAY",
            description: "A list of skills. Return an empty array if none are found.",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING", description: "The name of the skill." },
                    level: { type: "STRING", description: "The user's proficiency level (e.g., Expert, Advanced, Intermediate). If not specified, infer a reasonable level like 'Advanced'." },
                },
                required: ['name', 'level']
            },
        },
        languages: {
            type: "ARRAY",
            description: "A list of languages spoken by the user. Return an empty array if none are found.",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING", description: "The name of the language (e.g., English, Spanish)." },
                    level: { type: "STRING", description: "The user's proficiency level (e.g., Native, Fluent). If not specified, infer a reasonable level like 'Proficient'." },
                },
                required: ['name', 'level']
            },
        },
        employmentHistory: {
            type: "ARRAY",
            description: "A list of past employment positions. Return an empty array if none are found.",
            items: {
                type: "OBJECT",
                properties: {
                    jobTitle: { type: "STRING" },
                    employer: { type: "STRING" },
                    city: { type: "STRING", description: "The city where the job was located. Return an empty string if not found." },
                    startDate: { type: "STRING", description: "e.g., 'Jan 2020' or '2020'" },
                    endDate: { type: "STRING", description: "e.g., 'Present' or 'Dec 2022'" },
                    description: { type: "STRING", description: "A few bullet points (use markdown for lists) or a short paragraph describing responsibilities and achievements." },
                },
                required: ['jobTitle', 'employer', 'city', 'startDate', 'endDate', 'description']
            },
        },
        education: {
            type: "ARRAY",
            description: "A list of educational qualifications. Return an empty array if none are found.",
            items: {
                type: "OBJECT",
                properties: {
                    school: { type: "STRING" },
                    degree: { type: "STRING" },
                    city: { type: "STRING", description: "The city where the school was located. Return an empty string if not found." },
                    startDate: { type: "STRING" },
                    endDate: { type: "STRING" },
                    description: { type: "STRING", description: "Optional details about the degree or coursework. Return an empty string if not found." },
                },
                required: ['school', 'degree', 'city', 'startDate', 'endDate', 'description']
            },
        },
    },
    required: [
        'personalDetails',
        'professionalSummary',
        'websites',
        'skills',
        'languages',
        'employmentHistory',
        'education',
    ],
};

export const parseResume = async (userId: string, resumeText: string, language: string): Promise<Partial<ResumeData>> => {
    try {
        const contents = `The following resume is in ${language}. Parse it and extract all available information into a structured JSON format that strictly conforms to the provided schema. If a section (like 'languages') is not present in the text, return an empty array for it. If a simple field (like 'phone') is not present, return an empty string for it. Here is the resume text:\n\n---\n\n${resumeText}`;
        const config = {
            responseMimeType: "application/json",
            responseSchema: resumeSchema,
            maxOutputTokens: STRUCTURED_JSON_MAX_TOKENS,
        };

        const result = await callGeminiProxy({ modelName: DEFAULT_TEXT_MODEL, contents, config });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'resume_parse_text', { tokenUsage });

        // A long resume is exactly the input most likely to be cut off, and
        // losing it silently means the user's upload appears to have done
        // nothing. Salvage what arrived rather than throwing it all away.
        const parsedData = parseModelJson(result.text).value;

        const addId = (list: any[]) => { if (list) list.forEach((item: any) => item.id = generateSafeUUID()); };
        addId(parsedData.websites);
        addId(parsedData.skills);
        addId(parsedData.languages);
        addId(parsedData.employmentHistory);
        addId(parsedData.education);

        return parsedData;
    } catch (error) {
        console.error("Error parsing resume with AI:", error);
        reportError(error as Error, { functionName: 'parseResume' });
        throw new Error("Failed to parse resume with AI. Please check the format or try again.");
    }
};

export const parseResumeFromFile = async (userId: string, fileData: string, mimeType: string, language: string): Promise<Partial<ResumeData>> => {
    const base64Data = fileData.split(',')[1];
    try {
        const contents = {
            parts: [
                { text: `The following resume document is in ${language}. Parse it and extract all available information into a structured JSON format that strictly conforms to the provided schema. If a section (like 'languages') is not present in the document, return an empty array for it. If a simple field (like 'phone') is not present, return an empty string for it.` },
                { inlineData: { mimeType, data: base64Data } }
            ]
        };
        const config = {
            responseMimeType: "application/json",
            responseSchema: resumeSchema,
            maxOutputTokens: STRUCTURED_JSON_MAX_TOKENS,
        };

        const result = await callGeminiProxy({ modelName: DEFAULT_TEXT_MODEL, contents, config });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'resume_parse_file', { tokenUsage });

        const parsedData = parseModelJson(result.text).value;

        const addId = (list: any[]) => { if (list) list.forEach((item: any) => item.id = generateSafeUUID()); };
        addId(parsedData.websites);
        addId(parsedData.skills);
        addId(parsedData.languages);
        addId(parsedData.employmentHistory);
        addId(parsedData.education);

        return parsedData;
    } catch (error) {
        console.error("Error parsing resume from file:", error);
        reportError(error as Error, { functionName: 'parseResumeFromFile' });
        throw new Error("Failed to parse resume from file with AI. Please check the file format or try again.");
    }
};

export const improveSection = async (
    userId: string,
    sectionName: string,
    currentText: string,
    instruction: string,
    language: string,
    contextType: string = 'resume'
): Promise<{ improvedContent: string; explanation: string }> => {
    try {
        const schema = {
            type: "OBJECT",
            properties: {
                improvedContent: { type: "STRING", description: "The rewritten and improved text content." },
                explanation: { type: "STRING", description: "A brief, 1-2 sentence explanation of why this change is better or why it's important. Keep it professional and helpful." }
            },
            required: ["improvedContent", "explanation"]
        };

        let prompt;
        if (contextType === 'blog post') {
            prompt = `Role: You are an expert career coach...
Task: Rewrite and improve the following "${sectionName}" section.
Instructions:
1. Tone: Professional, authoritative, and actionable.
2. Structure: Use Markdown.
3. User Instruction: "${instruction}"
4. Language: ${language}

Current Content:
---
${currentText}
---

Return a JSON object with 'improvedContent' and 'explanation'.`;
        } else {
            prompt = `Rewrite the following "${sectionName}" section for a ${contextType} in ${language}. Follow the user's instruction: "${instruction}".
            
Current Text:
---
${currentText}
---
            
Return a JSON object with:
1. improvedContent: The improved text.
2. explanation: A brief explanation (1-2 sentences) of why this improvement is beneficial.`;
        }

        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'resume_suggestion', { tokenUsage });

        return JSON.parse(result.text.trim());
    } catch (error) {
        console.error("Error improving section:", error);
        reportError(error as Error, { functionName: 'improveSection' });
        throw new Error("Failed to improve section with AI.");
    }
};

const extractInlineImage = (response: any): string | null => {
    const candidates = response?.candidates;
    if (!candidates?.[0]?.content?.parts) return null;

    for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes = part.inlineData.data;
            const outputMimeType = part.inlineData.mimeType || 'image/png';
            if (base64ImageBytes) {
                return `data:${outputMimeType};base64,${base64ImageBytes}`;
            }
        }
    }

    return null;
};

const isImageModelFallbackError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return [
        '404',
        'not found',
        'model',
        'quota',
        'permission',
        'access',
        'location',
        'region',
        'unsupported',
        'unavailable',
        '500',
        'did not return an image',
        'no image'
    ].some(term => message.includes(term));
};

const isNetworkOrCorsError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('cors');
};

export const editProfilePhoto = async (userId: string, base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    const runImageEdit = async (modelName: string) => {
        const contents = {
            parts: [
                { inlineData: { mimeType, data: base64Image } },
                { text: prompt }
            ]
        };

        const result = await callGeminiProxy({
            modelName,
            contents,
            config: { responseModalities: ["IMAGE", "TEXT"] }
        });

        const generatedImage = extractInlineImage(result.response);
        if (!generatedImage) {
            throw new Error("AI did not return an image.");
        }

        return { generatedImage, response: result.response };
    };

    try {
        let modelName = IMAGE_MODEL_PRIMARY;
        let fallbackUsed = false;
        let result: Awaited<ReturnType<typeof runImageEdit>>;

        try {
            result = await runImageEdit(modelName);
        } catch (primaryError) {
            if (!isImageModelFallbackError(primaryError)) {
                throw primaryError;
            }

            console.warn(`Primary image edit model failed; retrying with ${IMAGE_MODEL_FALLBACK}.`, primaryError);
            modelName = IMAGE_MODEL_FALLBACK;
            fallbackUsed = true;
            result = await runImageEdit(modelName);
        }

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 1000;
        await trackUsage(userId, 'image_generation', { tokenUsage, modelName, fallbackUsed });

        return result.generatedImage;

    } catch (error) {
        console.error("Error editing photo:", error);
        reportError(error as Error, { functionName: 'editProfilePhoto' });
        if (isNetworkOrCorsError(error)) {
            throw new Error("CareerVivid could not reach the AI image service from this origin. Try careervivid.app, or redeploy the Gemini proxy CORS update for local testing.");
        }
        throw new Error("AI image editing is temporarily unavailable. Try a smaller uploaded JPG/PNG, or try again in a few minutes.");
    }
};

export const generateImage = async (userId: string, prompt: string, modelType: 'standard' | 'pro' = 'standard'): Promise<string> => {
    const generateWithModel = async (modelName: string) => {
        const contents = {
            parts: [
                { text: prompt }
            ]
        };

        const result = await callGeminiProxy({
            modelName,
            contents,
            config: { responseModalities: ["IMAGE"] }
        });

        const generatedImage = extractInlineImage(result.response);
        if (!generatedImage) {
            throw new Error("AI did not return an image.");
        }

        return { generatedImage, response: result.response };
    };

    try {
        const requestedModel = modelType === 'pro' ? IMAGE_MODEL_PRIMARY : IMAGE_MODEL_FALLBACK;
        const requiredCredits = modelType === 'pro' ? 20 : 10;
        let apiModel = requestedModel;
        let fallbackUsed = false;
        let result: Awaited<ReturnType<typeof generateWithModel>>;

        try {
            result = await generateWithModel(apiModel);
        } catch (primaryError) {
            if (apiModel !== IMAGE_MODEL_PRIMARY || !isImageModelFallbackError(primaryError)) {
                throw primaryError;
            }
            console.warn(`Primary image generation model failed; retrying with ${IMAGE_MODEL_FALLBACK}.`, primaryError);
            apiModel = IMAGE_MODEL_FALLBACK;
            fallbackUsed = true;
            result = await generateWithModel(apiModel);
        }

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 1000;
        const billedCredits = fallbackUsed ? 10 : requiredCredits;
        await trackUsage(userId, 'image_generation_prompt', { tokenUsage, deductCredits: billedCredits, modelName: apiModel, fallbackUsed });

        return result.generatedImage;

    } catch (error) {
        console.error("Error generating image:", error);
        reportError(error as Error, { functionName: 'generateImage' });
        throw new Error("AI image generation is temporarily unavailable. Try a more specific prompt or try again in a few minutes.");
    }
};

export const generateResumeFromPrompt = async (userId: string, prompt: string): Promise<Partial<ResumeData>> => {
    try {
        const fullPrompt = `Generate a complete, professional resume based on the following description: "${prompt}". The resume should be tailored for this role and must include a professional summary, a list of 8-10 relevant technical and soft skills, 2-3 detailed example employment history entries with 3-4 achievement-oriented bullet points each, and a relevant education entry. Use realistic but placeholder personal details (e.g., John Doe, anytown, etc.). Respond with a structured JSON object that strictly conforms to the provided schema. Ensure all required fields are populated.`;

        const generationSchema = {
            ...resumeSchema,
            required: [
                'personalDetails',
                'professionalSummary',
                'skills',
                'employmentHistory',
                'education'
            ]
        };

        const config = {
            responseMimeType: "application/json",
            responseSchema: generationSchema,
            maxOutputTokens: STRUCTURED_JSON_MAX_TOKENS,
        };

        /*
         * One retry before salvaging.
         *
         * A generation that stops early is usually not deterministic — the same
         * prompt run again normally finishes. Retrying costs one call and
         * returns a whole resume; salvaging returns a resume missing whatever
         * came after the cut. Try for the whole one first, keep the partial as
         * the floor, and never let either failure reach the user as a
         * SyntaxError over an empty screen.
         */
        let result = await callGeminiWithFallback(RESUME_GENERATION_MODEL, DEFAULT_TEXT_MODEL, {
            contents: fullPrompt,
            config,
        });
        let parsed = tryParseModelJson(result.text);

        if (!parsed || parsed.repaired) {
            console.warn(
                `[resume] first generation ${parsed ? 'was truncated' : 'did not parse'}` +
                `${wasTruncated(result.response) ? ' (finishReason is not STOP)' : ''}. Retrying once.`,
            );
            const retry = await callGeminiWithFallback(RESUME_GENERATION_MODEL, DEFAULT_TEXT_MODEL, {
                contents: fullPrompt,
                config,
            });
            const retryParsed = tryParseModelJson(retry.text);
            // Keep whichever is better: a complete retry beats a repaired first
            // attempt, but a repaired first attempt beats a retry that failed
            // outright.
            if (retryParsed && (!parsed || !retryParsed.repaired)) {
                result = retry;
                parsed = retryParsed;
            }
        }

        if (!parsed) {
            // parseModelJson throws with the raw text attached, which is what
            // makes the next occurrence diagnosable instead of a mystery.
            parseModelJson(result.text);
        }

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        if (!userId.startsWith('guest_')) {
            await trackUsage(userId, 'resume_generate_prompt', { tokenUsage });
        }

        const parsedData = parsed!.value;

        const addId = (list: any[]) => { if (list) list.forEach((item: any) => item.id = generateSafeUUID()); };
        addId(parsedData.websites);
        addId(parsedData.skills);
        addId(parsedData.languages);
        addId(parsedData.employmentHistory);
        addId(parsedData.education);

        return parsedData;
    } catch (error) {
        console.error("Error generating resume from prompt:", error);
        reportError(error as Error, { functionName: 'generateResumeFromPrompt' });
        throw new Error("Failed to generate resume with AI. Please try a different prompt.");
    }
};

export const generalChat = async (userId: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], newMessage: string, language: string): Promise<string> => {
    const systemInstruction = `You are an expert AI assistant for the "CareerVivid" application...`;

    try {
        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: [...history, { role: 'user', parts: [{ text: newMessage }] }],
            systemInstruction
        });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'ai_assistant_query', { tokenUsage });

        return result.text;
    } catch (error) {
        console.error("Error in general chat:", error);
        reportError(error as Error, { functionName: 'generalChat' });
        return "Sorry, I encountered an error. Please try again.";
    }
};

/**
 * "AI coding companion" for interactive lessons: answers questions about the
 * current exercise and the learner's own code. Coaches toward the answer —
 * explains concepts and points at the bug — rather than just handing over a
 * finished solution.
 */
export const askCodingCompanion = async (
    userId: string,
    context: { exerciseTitle: string; exerciseContent: string; language: string; code: string },
    history: { role: 'user' | 'model', parts: { text: string }[] }[],
    question: string,
): Promise<string> => {
    const systemInstruction = `You are a friendly, encouraging coding tutor inside CareerVivid's interactive lessons.

The learner is on this exercise: "${context.exerciseTitle}"

Exercise instructions:
---
${context.exerciseContent}
---

Their current ${context.language} code:
---
${context.code || '(empty)'}
---

Answer their question. Explain the relevant concept and, if their code has a bug, point at what's wrong and why — but do NOT just hand them the complete corrected solution unless they explicitly ask for the answer. Keep responses short (2-5 sentences) and encouraging.`;

    try {
        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: [...history, { role: 'user', parts: [{ text: question }] }],
            systemInstruction,
        });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'ai_assistant_query', { tokenUsage });

        return result.text;
    } catch (error) {
        console.error('Error in coding companion chat:', error);
        reportError(error as Error, { functionName: 'askCodingCompanion' });
        return "Sorry, I couldn't answer that right now. Please try again.";
    }
};

export const generateInterviewQuestions = async (userId: string, prompt: string): Promise<string[]> => {
    try {
        const fullPrompt = `You are a senior interviewer designing the question set for a real interview. Use the context below to write questions that a candidate would actually be asked in this specific interview.

--- INTERVIEW CONTEXT ---
${prompt.trim()}
--- END CONTEXT ---

Write 5 to 7 interview questions that:
- Are specific to the role, seniority, company, and interview stage described in the context. If the context names a company or a stage (e.g. coding, system design, behavioral, values), tailor every question to it.
- Match the stated difficulty. Entry-level gets fundamentals; senior gets depth, trade-offs, and scale.
- Are a realistic mix for this stage, not five variations of the same question. Include at least one that probes depth with a follow-up built in ("...and how would you handle X?").
- Are answerable out loud in an interview — concrete and self-contained, not essay prompts or take-home tasks.
- Reference the candidate's background from the context when it is provided, to make questions feel targeted.

Do not number the questions or add preamble. Return ONLY a JSON array of question strings.`;
        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: "ARRAY", items: { type: "STRING" } },
            },
        });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'question_generation', { tokenUsage });

        const parsed = JSON.parse(result.text.trim()) as string[];
        return Array.isArray(parsed) ? parsed.map(q => String(q).trim()).filter(Boolean) : [];
    } catch (error) {
        console.error("Error generating interview questions:", error);
        reportError(error as Error, { functionName: 'generateInterviewQuestions' });
        throw new Error("Failed to generate interview questions with AI.");
    }
};

export const generateDemoInterviewQuestions = async (prompt: string): Promise<string[]> => {
    try {
        const fullPrompt = `Based on the following description, generate a list of 2-3 insightful interview questions for a short demo interview. The questions should be relevant to the role described. Return ONLY a valid JSON array of strings, with no other text or explanation. Description: "${prompt}"`;
        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: "ARRAY", items: { type: "STRING" } },
            },
        });

        return JSON.parse(result.text.trim()) as string[];
    } catch (error) {
        console.error("Error generating demo interview questions:", error);
        reportError(error as Error, { functionName: 'generateDemoInterviewQuestions' });
        throw new Error("Failed to generate interview questions with AI. Please try a different prompt.");
    }
};

export const analyzeInterviewTranscript = async (userId: string, transcript: TranscriptEntry[], prompt: string, durationInSeconds?: number): Promise<Omit<InterviewAnalysis, 'id' | 'timestamp' | 'transcript'>> => {
    try {
        const formattedTranscript = transcript.map(entry => `${entry.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${entry.text}`).join('\n\n');

        // Detect whether this is a management/leadership role
        const isLeadershipRole = /\b(manager|director|vp|head of|lead|principal|staff|senior manager|engineering manager|product lead|team lead|people manager)\b/i.test(prompt);

        const leadershipDimension = isLeadershipRole
            ? `- leadershipScore: Did the candidate demonstrate people management, mentoring, team building, stakeholder alignment, or cross-functional collaboration? Score their ability to lead through others and make organizational decisions.`
            : `- leadershipScore: set to null (this is an individual contributor role).`;

        const fullPrompt = `You are an experienced interviewer writing an honest but encouraging feedback report after a practice interview. Judge the CANDIDATE only — the Interviewer lines are the questions asked. Base every judgment on what the candidate actually said in the transcript; never invent strengths or answers that are not there.

Role / interview context:
${prompt}

## MANDATORY PROCEDURE — follow in order, write findings into rubricFindings first
Step 1 — TALLY: list every question the interviewer asked. For each, note in one line: answered fully / answered partially / dodged or no answer, plus the strongest specific detail the candidate gave (metric, name, example) or "no specifics".
Step 2 — RUBRIC: score each dimension from the tally using the bands below. A dimension score must be explainable purely from your tally lines.
Step 3 — Write feedback bullets; every bullet must reference a specific question or quote from the transcript.
Step 4 — SKILLS: Identify 3 to 5 key professional, domain-specific, or soft skills demonstrated by the candidate (e.g. "React State Management", "Cross-functional Collaboration", "User Empathy", "API Design"). Let yourself choose freely based on the transcript answers.

Scoring bands — all scores 0 to 100. A typical candidate giving reasonable answers should land 70-85. Be encouraging for practice:
- 90-100: Exceptional — specific, well-structured, with depth and impact. Reserve for truly standout responses.
- 75-89: Strong — solid answers that demonstrate competence and relevant experience.
- 60-74: Developing — reasonable answers with room for more specificity, structure, or depth.
- 40-59: Needs work — vague, off-target, or missing key substance.
- 0-39: Minimal — barely answered, evasive, or empty transcript.

Score each dimension:
- communicationScore: How clearly and effectively did the candidate convey their ideas? Consider structure, clarity, and ability to explain complex concepts simply. Don't require a specific framework (like STAR) — any clear structure counts.
- problemSolvingScore: Did the candidate demonstrate analytical thinking, structured reasoning, or good judgment? Consider how they approached problems, made decisions, or evaluated trade-offs.
- experienceScore: Did the candidate share relevant experiences with concrete outcomes, learnings, or impact? Give credit for real examples even if they don't include exact metrics.
- roleAlignmentScore: How well do the candidate's answers connect to the specific role, its requirements, and the company context? Consider domain knowledge and role fit.
${leadershipDimension}
- overallScore: Your holistic assessment — a weighted blend of all dimensions. This represents your overall impression of the candidate's readiness.

Important rules:
- Give credit for demonstrating understanding, even without perfect delivery.
- Don't penalize informal or conversational answers if the substance is good.
- Empty transcript or barely-responding candidate → everything below 30, say so plainly.
- Focus on what the candidate DID say, not what they didn't say.
- Never credit knowledge the candidate did not state. Judge the words in the transcript, not plausible intent.

Feedback rules:
- strengths: 2-4 markdown bullets, each citing something specific the candidate actually said (quote or close paraphrase). No generic praise.
- areasForImprovement: 2-4 markdown bullets, each an actionable, encouraging fix tied to a concrete moment. Be direct and useful, not punishing.
- skills: An array of 3 to 5 strings representing key skills demonstrated. Be specific and descriptive.

**Transcript:**
---
${formattedTranscript}
---

Return ONLY a valid JSON object conforming to the schema.`;

        const leadershipProp = isLeadershipRole
            ? { leadershipScore: { type: "NUMBER", description: "Leadership and collaboration score 0-100" } }
            : {};

        const config = {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    rubricFindings: { type: "STRING", description: "Working notes: one tally line per interviewer question (answered fully/partially/dodged + strongest specific detail). Written before any score." },
                    communicationScore: { type: "NUMBER", description: "Communication and clarity score 0-100." },
                    problemSolvingScore: { type: "NUMBER", description: "Problem solving and analytical thinking score 0-100." },
                    experienceScore: { type: "NUMBER", description: "Experience demonstration and impact score 0-100." },
                    roleAlignmentScore: { type: "NUMBER", description: "Role alignment score 0-100." },
                    ...leadershipProp,
                    overallScore: { type: "NUMBER", description: "Holistic overall assessment score." },
                    // Legacy fields — mapped from new dimensions for backward compatibility
                    confidenceScore: { type: "NUMBER", description: "Mapped from problemSolvingScore for legacy compatibility." },
                    relevanceScore: { type: "NUMBER", description: "Mapped from experienceScore for legacy compatibility." },
                    strengths: { type: "STRING", description: "A markdown-formatted string summarizing the candidate's strengths." },
                    areasForImprovement: { type: "STRING", description: "A markdown-formatted string with actionable tips for improvement." },
                    // NOTE: Demonstrated skills are currently displayed only on iOS, but the structure is kept/calculated here for parity and future use.
                    skills: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Array of 3 to 5 key skills demonstrated in the interview, decided freely by the LLM based on answers."
                    }
                },
                propertyOrdering: [
                    'rubricFindings',
                    'communicationScore',
                    'problemSolvingScore',
                    'experienceScore',
                    'roleAlignmentScore',
                    ...(isLeadershipRole ? ['leadershipScore'] : []),
                    'overallScore',
                    'confidenceScore',
                    'relevanceScore',
                    'strengths',
                    'areasForImprovement',
                    'skills',
                ],
                required: [
                    'rubricFindings',
                    'overallScore',
                    'communicationScore',
                    'problemSolvingScore',
                    'experienceScore',
                    'roleAlignmentScore',
                    'confidenceScore',
                    'relevanceScore',
                    'strengths',
                    'areasForImprovement',
                    'skills'
                ]
            },
        };

        const result = await callGeminiWithFallback(REPORT_MODEL, DEFAULT_TEXT_MODEL, { contents: fullPrompt, config });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        const metadata: { tokenUsage: number, durationInSeconds?: number } = { tokenUsage };
        if (durationInSeconds && durationInSeconds > 0) metadata.durationInSeconds = durationInSeconds;

        await trackUsage(userId, 'interview_analysis', metadata);

        // The scratchpad improved the scores; it is not part of the report.
        const { rubricFindings: _rubricFindings, ...analysis } = JSON.parse(result.text.trim());
        return analysis;
    } catch (error) {
        console.error("Error analyzing transcript:", error);
        reportError(error as Error, { functionName: 'analyzeInterviewTranscript' });
        throw new Error("Failed to analyze interview transcript.");
    }
};

/**
 * Scores a system design diagram (exported as a PNG data URL) against a design
 * brief. Returns the same shape as analyzeInterviewTranscript so it plugs into
 * the interview report + quest scoring. The four score fields carry
 * system-design semantics: communicationScore = diagram clarity,
 * confidenceScore = requirement coverage, relevanceScore = scalability & trade-offs.
 */
export const analyzeSystemDesignDiagram = async (
    userId: string,
    imageDataUrl: string,
    brief: string,
): Promise<Omit<InterviewAnalysis, 'id' | 'timestamp' | 'transcript'>> => {
    try {
        const base64Data = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
        const mimeType = imageDataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';

        const instruction = `You are a senior staff engineer grading a system design interview diagram. The candidate was given this brief:

---
${brief}
---

The attached image is the candidate's whiteboard diagram. Judge ONLY what is visibly drawn and labeled. Never credit intentions — if it is not in the diagram, it does not exist.

## MANDATORY PROCEDURE — follow in order, write findings into rubricFindings first
Step 1 — INVENTORY: list every labeled component, every arrow/connection, every data store, and every annotation you can actually read in the diagram.
Step 2 — RUBRIC: score every checklist item below, citing the inventory. An item with no visible evidence scores 0.
Step 3 — COMPUTE the three dimension scores by summing their items. Do not round up.
Step 4 — Write feedback bullets, each citing a specific labeled element or a specific missing item.

## CHECKLIST

communicationScore (diagram clarity) = sum of:
- [0-25] Components have specific labels (e.g. "order-router", "Postgres: tax lots") — generic boxes ("service", "DB") earn at most half.
- [0-25] Directional arrows show request/data flow between components.
- [0-25] Layout is organized in layers or groups (client → services → data); related parts are near each other.
- [0-25] Readable as-is: no orphan boxes, no ambiguous crossings, a stranger could trace one request end-to-end.

confidenceScore (requirement coverage) — the brief lists explicit requirements. Score each of the 4 requirements [0-25] strictly on visible evidence: fully addressed = 20-25, partially = 8-15, mentioned in a label but not designed = 3-7, absent = 0.

relevanceScore (scale & trade-offs) = sum of:
- [0-30] A concrete scaling mechanism appropriate to the problem (caching, load balancing, partitioning/sharding, batch windows, queues) is drawn AND placed correctly.
- [0-25] Storage choices fit the data (e.g. ledger in a transactional store, hot data in cache); the diagram shows WHAT each store holds.
- [0-25] At least one bottleneck or failure mode is explicitly called out with a visible mitigation (retry, DLQ, replica, circuit breaker).
- [0-20] Trade-off awareness visible (sync vs async boundaries, consistency notes, backpressure, idempotency).

overallScore = round(0.25 × communicationScore + 0.40 × confidenceScore + 0.35 × relevanceScore).

## HARD RULES — violations make the report worthless
- Empty or unreadable diagram → all scores under 30, say so plainly.
- Fewer than 4 labeled components → confidenceScore ≤ 40.
- No directional arrows → communicationScore ≤ 50.
- Nothing addressing scale → relevanceScore ≤ 40.
- 90+ on any dimension requires every one of its checklist items at ≥90% credit with cited evidence. Scores of 95+ should occur for at most 1 in 20 real submissions. NEVER output 100 unless literally nothing could be added or improved — if you list ANY area for improvement touching a dimension, that dimension must be below 95.
- Every strengths bullet MUST name a specific labeled element from the inventory. Every improvement bullet MUST name the missing/weak item, why it matters at this scale, and the concrete fix. No generic advice ("add monitoring" alone is banned; say what to monitor and where).

strengths: 2-4 markdown bullets. areasForImprovement: 3-5 markdown bullets, ordered by impact.

Return ONLY a JSON object matching the schema. Fill rubricFindings FIRST (inventory + per-item scores), then the score fields must equal the sums you computed there.`;

        const contents = {
            parts: [
                { text: instruction },
                { inlineData: { mimeType, data: base64Data } },
            ],
        };

        const config = {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    // Generated FIRST so the weak model does its checklist work
                    // before committing to scores (structured chain-of-thought).
                    rubricFindings: { type: "STRING", description: "Working notes: diagram inventory, then every checklist item with its awarded points and the evidence. Written before any score." },
                    communicationScore: { type: "NUMBER", description: "Sum of the 4 clarity checklist items, 0 to 100." },
                    confidenceScore: { type: "NUMBER", description: "Sum of the per-requirement coverage scores, 0 to 100." },
                    relevanceScore: { type: "NUMBER", description: "Sum of the scale & trade-off checklist items, 0 to 100." },
                    overallScore: { type: "NUMBER", description: "round(0.25*communication + 0.40*confidence + 0.35*relevance)." },
                    strengths: { type: "STRING", description: "Markdown bullets, each citing a specific labeled element." },
                    areasForImprovement: { type: "STRING", description: "Markdown bullets: missing item, why it matters, concrete fix." },
                },
                propertyOrdering: ['rubricFindings', 'communicationScore', 'confidenceScore', 'relevanceScore', 'overallScore', 'strengths', 'areasForImprovement'],
                required: ['rubricFindings', 'overallScore', 'communicationScore', 'confidenceScore', 'relevanceScore', 'strengths', 'areasForImprovement'],
            },
        };

        const result = await callGeminiWithFallback(REPORT_MODEL, DEFAULT_TEXT_MODEL, { contents, config });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'interview_analysis', { tokenUsage });

        // The scratchpad improved the scores; it is not part of the report.
        const { rubricFindings: _rubricFindings, ...analysis } = JSON.parse(result.text.trim());
        return analysis;
    } catch (error) {
        console.error("Error analyzing system design diagram:", error);
        reportError(error as Error, { functionName: 'analyzeSystemDesignDiagram' });
        throw new Error("Failed to analyze system design diagram.");
    }
};

export interface CodingSubmissionInput {
    language: 'javascript' | 'python' | 'cpp' | 'java' | 'csharp';
    code: string;
    /** Challenge brief text (problem, requirements). */
    brief: string;
    /** Hidden + visible test outcomes from the in-browser runner, when supported. */
    passed: number;
    total: number;
    /** Up to 5 failing cases as short strings. */
    failures: string[];
}

/**
 * Scores a coding-round submission. Correctness is decided by the real test
 * run in the browser — the model is told the pass rate and must anchor
 * confidenceScore to it, grading only approach, clarity, and complexity on
 * top. Returns the same shape as analyzeInterviewTranscript so it plugs into
 * the interview report + quest scoring: communicationScore = code clarity,
 * confidenceScore = correctness (test pass rate), relevanceScore = efficiency
 * & approach.
 */
export const analyzeCodingSubmission = async (
    userId: string,
    submission: CodingSubmissionInput,
): Promise<Omit<InterviewAnalysis, 'id' | 'timestamp' | 'transcript'>> => {
    try {
        const hasSandboxResults = submission.total > 0;
        const passRate = hasSandboxResults ? Math.round((submission.passed / submission.total) * 100) : 0;
        const instruction = `You are a senior engineer grading a coding-interview submission against a strict rubric. The candidate was given this brief:

---
${submission.brief}
---

The candidate submitted this ${submission.language} solution:

\`\`\`${submission.language}
${submission.code}
\`\`\`

${hasSandboxResults ? `The solution was ALREADY EXECUTED against a hidden test suite in a sandbox. Ground truth (do not second-guess it):
- Tests passed: ${submission.passed}/${submission.total} (${passRate}%)
${submission.failures.length ? `- Failing cases:\n${submission.failures.map((f) => `  - ${f}`).join('\n')}` : '- All tests passed.'}` : `This language is not sandbox-executed in the browser yet. There are no hidden test results. Grade correctness by careful code review against the brief, expected edge cases, complexity, and language semantics.`}

## MANDATORY PROCEDURE — follow in order, write findings into rubricFindings first
Step 1 — READ the code line by line. In rubricFindings, state: the algorithm used, its actual time complexity and space complexity (as big-O), and the complexity the brief's requirements ask for.
Step 2 — RUBRIC: score every checklist item below, quoting the exact identifier, expression, or line that justifies each award or deduction.
Step 3 — COMPUTE the dimension scores by summing their items. Do not round up.
Step 4 — Write feedback bullets; every bullet must quote a concrete construct from the code.

## CHECKLIST

confidenceScore (correctness) — anchored to ground truth:
${hasSandboxResults ? `- Start at the pass rate: ${passRate}.
- Subtract up to 10 ONLY if you identify a concrete input (outside the suite) that would fail, and name that input in rubricFindings.
- Add up to 10 ONLY if pass rate < 100 and the failures are trivially fixable (e.g. off-by-one on an edge case) — name the fix.` : `- Start from your code-review estimate of functional correctness against the visible brief and examples.
- Award 85-100 only when the code is complete, type-consistent, handles edge cases, and the algorithm clearly satisfies the requirements.
- Award 50-84 for plausible but incomplete or edge-case-fragile code.
- Award 0-49 for starter-code-only, non-compilable, or wrong-approach submissions.`}

communicationScore (code clarity) = sum of:
- [0-25] Naming: identifiers describe intent (deduct for single letters beyond loop indices, misleading names, inconsistent style).
- [0-25] Structure: clean decomposition, no dead code, no duplicated logic, early returns over deep nesting (deduct per violation, cite it).
- [0-25] Idiomatic ${submission.language}: uses the language's natural constructs (deduct for C-style loops where iterators fit, manual index bookkeeping where a map/set fits, reinvented builtins).
- [0-25] Self-documentation: non-obvious logic has a WHY comment; obvious code is NOT commented (both over- and under-commenting deduct).

relevanceScore (approach & efficiency) = sum of:
- [0-40] Algorithm vs requirement: compare your Step-1 complexity against the brief's requirement. Meets it exactly = 32-40. Correct but one class worse (e.g. O(n log n) where O(n) asked) = 16-28. Brute force where better is explicitly required = 0-15.
- [0-20] Data structure choice: the right structure for the access pattern, with justification.
- [0-20] Edge cases handled IN CODE (empty input, single element, duplicates, negatives, boundaries) — credit only what the code visibly handles.
- [0-20] No accidental inefficiency: deduct for O(n) lookups inside loops (includes/indexOf/in on arrays), repeated sorting, unnecessary copies, string concatenation in hot loops. Quote each offender.

overallScore = round(0.45 × confidenceScore + 0.20 × communicationScore + 0.35 × relevanceScore).

## HARD RULES — violations make the report worthless
- Passing tests does NOT imply clean code: communicationScore and relevanceScore are judged from the source, and a 100% pass rate alone never justifies either being above 85.
- 90+ on any dimension requires every one of its checklist items at ≥90% credit with quoted evidence. 95+ should occur for at most 1 in 20 real submissions. NEVER output 100 unless you can write, in rubricFindings, why not a single point could be deducted — and if you list ANY improvement touching a dimension, that dimension must be below 95.
- The first improvement bullet MUST state the solution's actual time and space complexity and whether it meets the brief's requirement.
- Every bullet quotes a concrete identifier, expression, or pattern from the submitted code. Generic advice ("consider edge cases", "improve naming") without a quoted example is banned.
- Do not praise boilerplate or the starter scaffold; judge only what the candidate wrote.

strengths: 2-4 markdown bullets. areasForImprovement: 3-5 markdown bullets, ordered by impact.

Return ONLY a JSON object matching the schema. Fill rubricFindings FIRST; the score fields must equal the sums you computed there.`;

        const contents = { parts: [{ text: instruction }] };

        const config = {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    // Generated FIRST so the weak model does its checklist work
                    // before committing to scores (structured chain-of-thought).
                    rubricFindings: { type: "STRING", description: "Working notes: algorithm + actual big-O vs required, then every checklist item with awarded points and the quoted code evidence. Written before any score." },
                    confidenceScore: { type: "NUMBER", description: "Pass rate with at most ±10 justified adjustment, 0 to 100." },
                    communicationScore: { type: "NUMBER", description: "Sum of the 4 code-clarity checklist items, 0 to 100." },
                    relevanceScore: { type: "NUMBER", description: "Sum of the approach & efficiency checklist items, 0 to 100." },
                    overallScore: { type: "NUMBER", description: "round(0.45*confidence + 0.20*communication + 0.35*relevance)." },
                    strengths: { type: "STRING", description: "Markdown bullets, each quoting a concrete construct from the code." },
                    areasForImprovement: { type: "STRING", description: "Markdown bullets; first states actual time/space complexity vs requirement." },
                },
                propertyOrdering: ['rubricFindings', 'confidenceScore', 'communicationScore', 'relevanceScore', 'overallScore', 'strengths', 'areasForImprovement'],
                required: ['rubricFindings', 'overallScore', 'communicationScore', 'confidenceScore', 'relevanceScore', 'strengths', 'areasForImprovement'],
            },
        };

        const result = await callGeminiWithFallback(REPORT_MODEL, DEFAULT_TEXT_MODEL, { contents, config });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'interview_analysis', { tokenUsage });

        // The scratchpad improved the scores; it is not part of the report.
        const { rubricFindings: _rubricFindings, ...analysis } = JSON.parse(result.text.trim());
        return analysis;
    } catch (error) {
        console.error("Error analyzing coding submission:", error);
        reportError(error as Error, { functionName: 'analyzeCodingSubmission' });
        throw new Error("Failed to analyze coding submission.");
    }
};

const granularCategorySchema = {
    type: "OBJECT",
    properties: {
        score: { type: "NUMBER", description: "Score (0-100) for this specific match category." },
        rating: { type: "STRING", description: "Rating: 'Great', 'Good', 'Fair', or 'Missing'." },
        impact: { type: "STRING", description: "Impact: 'High Impact', 'Medium Impact', or 'Low Impact'." },
        details: { type: "ARRAY", description: "Bullet points detailing match points, missing requirements, or improvements.", items: { type: "STRING" } }
    },
    required: ["score", "rating", "impact", "details"]
};

const resumeMatchSchema = {
    type: "OBJECT",
    properties: {
        totalKeywords: { type: "NUMBER", description: "The total number of unique, important keywords extracted from the job description." },
        matchedKeywords: { type: "ARRAY", description: "A list of keywords found in both the job description and the resume.", items: { type: "STRING" } },
        missingKeywords: { type: "ARRAY", description: "A list of important keywords from the job description that were NOT found in the resume.", items: { type: "STRING" } },
        matchPercentage: { type: "NUMBER", description: "A percentage score (0-100) representing the overall match score between resume and job." },
        summary: { type: "STRING", description: "A brief, 2-3 sentence summary of the resume's strengths and weaknesses against the job description." },
        verdict: { type: "STRING", description: "Overall AI text verdict summary (e.g. 'Great Fit! Your resume strongly aligns...')" },
        verdictCategory: { type: "STRING", description: "Overall verdict classification: 'Great', 'Good', 'Fair', or 'Missing'." },
        strongMatches: { type: "ARRAY", description: "2-3 short proof points showing why this candidate is a strong match.", items: { type: "STRING" } },
        experienceGaps: { type: "ARRAY", description: "1-3 practical gaps or weak evidence areas the candidate should address.", items: { type: "STRING" } },
        suggestedResumeAngle: { type: "STRING", description: "One concise resume positioning angle for this role." },
        recommendedAction: { type: "STRING", description: "One of: apply_now, tailor_first, network_first, skip_for_now." },
        qualifications: { 
            type: "OBJECT",
            properties: granularCategorySchema.properties,
            required: granularCategorySchema.required,
            description: "Breakdown of qualifications match (degrees, certifications, academic requirements, etc.)" 
        },
        responsibilities: { 
            type: "OBJECT",
            properties: granularCategorySchema.properties,
            required: granularCategorySchema.required,
            description: "Breakdown of responsibilities match (prior experience scope, seniority levels, project duties, role alignment)" 
        },
        keywords: { 
            type: "OBJECT",
            properties: granularCategorySchema.properties,
            required: granularCategorySchema.required,
            description: "Breakdown of keyword and tech skills match (hard tools, programming languages, software, and core methodologies)" 
        },
        jobTitle: { 
            type: "OBJECT",
            properties: granularCategorySchema.properties,
            required: granularCategorySchema.required,
            description: "Breakdown of job title and seniority level match (exact match, seniority hierarchy level, or translation of titles)" 
        }
    },
    required: [
        "totalKeywords", 
        "matchedKeywords", 
        "missingKeywords", 
        "matchPercentage", 
        "summary", 
        "verdict", 
        "verdictCategory", 
        "strongMatches",
        "experienceGaps",
        "suggestedResumeAngle",
        "recommendedAction",
        "qualifications", 
        "responsibilities", 
        "keywords", 
        "jobTitle"
    ]
};

export const analyzeResumeMatch = async (userId: string, resumeText: string, jobDescription: string): Promise<ResumeMatchAnalysis> => {
    try {
        // Truncate job description and resume content to ensure ultra-high execution speed
        const cleanJd = jobDescription.slice(0, 2500);
        const cleanResume = resumeText.slice(0, 4000);

        const prompt = `Act as an expert scanning engine. Analyze resume against job description.

Job Description (Core):
${cleanJd}

Resume:
${cleanResume}

Audit matches across these four categories in the response schema:
1. Qualifications: Degrees, study fields, certifications, licenses.
2. Responsibilities: Scope, project scale, seniority level, duties.
3. Keywords: Core tools, tech skills, software.
4. Job Title: Current/past titles compared with target seniority.

CRITICAL RULES FOR ULTRA-FAST RESPONSE:
- Keep overall summary and verdict to 1-2 short sentences.
- Limit 'details' lists under EACH category to exactly 2 key short points.
- Limit totalKeywords, matchedKeywords, and missingKeywords arrays to at most 6-8 core tech skills. Do not list large lists.
- Limit strongMatches to at most 3 proof points and experienceGaps to at most 3 practical gaps.
- recommendedAction must be exactly one of: apply_now, tailor_first, network_first, skip_for_now.
- suggestedResumeAngle must be one compact sentence a user can apply in resume tailoring.
- Be highly concise and brief.

Return JSON matching the schema.`;

        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: resumeMatchSchema,
            },
        });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'resume_match_analysis', { tokenUsage });

        return JSON.parse(result.text.trim());
    } catch (error) {
        console.error("Error analyzing resume match:", error);
        reportError(error as Error, { functionName: 'analyzeResumeMatch' });
        throw new Error("Failed to analyze the resume match with AI.");
    }
};

const jobParseSchema = {
    type: "OBJECT",
    properties: {
        jobTitle: { type: "STRING", description: "The job title. Return 'Untitled Job' if not found." },
        companyName: { type: "STRING", description: "The company name. Return 'Unknown Company' if not found." },
        location: { type: "STRING", description: "The job location (e.g., 'Remote - US; New York City', or city/state). Return empty string if not found." },
        salaryRange: { type: "STRING", description: "Extract any visible salary boundaries or compensation ranges (e.g., '$120k - $150k'). Return empty string if not found." },
        jobPostURL: { type: "STRING", description: "The original marketing job post link if present in context or text. Return empty string if not found." },
        directApplicationURL: { type: "STRING", description: "The specific ATS hosting portal submission link (e.g., https://jobs.ashbyhq.com/..., Greenhouse, Lever, etc.) if present. Return empty string if not found." }
    },
    required: ["jobTitle", "companyName", "location", "salaryRange", "jobPostURL", "directApplicationURL"]
};

export const parseJobDescriptionFromText = async (
    userId: string, 
    descriptionText: string,
    metadataUrl?: string
): Promise<Partial<JobApplicationData> & { directApplicationURL?: string }> => {
    try {
        const prompt = `Analyze the following job description text to extract structural metadata. 
Original Job Post URL / Browser metadata URL context: ${metadataUrl || 'None provided'}

Job description text:
${descriptionText}

Please parse and return the structured JSON payload according to the schema. 
For 'jobPostURL', prioritize using the original browser metadata URL context provided (${metadataUrl || ''}) if it is valid. Otherwise, look for it in the text.
For 'directApplicationURL', look for any ATS hosting portals (like greenhouse.io, ashbyhq.com, lever.co, workday.com, etc.) in the text.`;

        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: jobParseSchema,
            },
        });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'job_parse_description', { tokenUsage });

        return JSON.parse(result.text.trim());
    } catch (error) {
        console.error("Error parsing job description from text:", error);
        reportError(error as Error, { functionName: 'parseJobDescriptionFromText' });
        throw new Error("Failed to analyze the job description with AI.");
    }
};

const prepNotesSchema = {
    type: "OBJECT",
    properties: {
        prep_RoleOverview: { type: "STRING", description: "Detailed research..." },
        prep_MyStory: { type: "STRING", description: "A compelling 2-3 paragraph..." },
        prep_InterviewPrep: { type: "STRING", description: "A numbered list of 5-7 potential interview questions..." },
        prep_QuestionsForInterviewer: { type: "STRING", description: "A numbered list of 3-5 insightful questions..." },
        notes: { type: "STRING", description: "A bulleted list of general notes..." },
    },
    required: ["prep_RoleOverview", "prep_MyStory", "prep_InterviewPrep", "prep_QuestionsForInterviewer", "notes"]
};

export const generateJobPrepNotes = async (userId: string, job: JobApplicationData, resumeContext: string): Promise<Partial<JobApplicationData>> => {
    try {
        const prompt = `You are an expert career coach... [Job: ${job.jobTitle}]`;
        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: prepNotesSchema,
            },
        });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        // "Generate All Prep Notes" is a bulk operation — costs JOB_PREP_NOTES_ALL (10) credits.
        await trackUsage(userId, 'job_prep_generation', { tokenUsage, deductCredits: AI_CREDIT_COSTS.JOB_PREP_NOTES_ALL });

        return JSON.parse(result.text.trim());
    } catch (error) {
        console.error("Error generating job prep notes:", error);
        reportError(error as Error, { functionName: 'generateJobPrepNotes' });
        throw new Error("Failed to generate AI preparation notes.");
    }
};

export const regenerateJobPrepSection = async (
    userId: string,
    sectionName: string,
    job: JobApplicationData,
    resumeContext: string,
    instruction: string
): Promise<string> => {
    try {
        const prompt = `...Regenerate content for "${sectionName}"...`;

        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: prompt,
        });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'job_prep_regeneration', { tokenUsage });

        return result.text.trim();
    } catch (error) {
        console.error("Error regenerating job prep section:", error);
        reportError(error as Error, { functionName: 'regenerateJobPrepSection' });
        throw new Error("Failed to regenerate section with AI.");
    }
};

export const generateExcalidrawDiagram = async (userId: string, prompt: string): Promise<any> => {
    try {
        const systemInstruction = `You are an Expert System Architect and UI Layout Engine.
Generate a professional, well-spaced diagram as RAW Excalidraw JSON — no markdown, no explanation, just the JSON object.

OUTPUT FORMAT: A single JSON object with exactly: {"type":"excalidraw","version":2,"elements":[...]}

ELEMENT RULES (follow precisely):

1. RECTANGLES — one per component:
{
  "type": "rectangle", "id": "<unique 20-char alphanumeric>",
  "x": <number>, "y": <number>, "width": 200, "height": 70,
  "backgroundColor": "#4dabf7", "fillStyle": "solid",
  "strokeColor": "#1971c2", "strokeWidth": 2, "roughness": 0,
  "roundness": {"type": 3}, "opacity": 100,
  "isDeleted": false, "boundElements": null, "locked": false
}
Use distinct, professional pastel colors per layer (e.g., #4dabf7 blue for clients, #69db7c green for services, #ffd43b yellow for storage, #ff8787 red for external, #a9e34b lime for queues).

2. TEXT LABELS — one per rectangle, as a STANDALONE text element (NOT bound):
{
  "type": "text", "id": "<unique 20-char alphanumeric>",
  "x": <rect_x + 10>, "y": <rect_y + 22>, "width": 180, "height": 26,
  "text": "<component name>", "fontSize": 16, "fontFamily": 1,
  "textAlign": "center", "verticalAlign": "middle",
  "strokeColor": "#1a1a2e", "backgroundColor": "transparent",
  "fillStyle": "solid", "opacity": 100,
  "isDeleted": false, "boundElements": null, "containerId": null, "locked": false
}
CRITICAL: Do NOT use containerId. Do NOT add boundElements on rectangles. Text must be standalone.

3. ARROWS — connecting rectangles:
{
  "type": "arrow", "id": "<unique 20-char alphanumeric>",
  "x": <startX>, "y": <startY>,
  "points": [[0, 0], [<dx>, <dy>]],
  "startBinding": {"elementId": "<source_rect_id>", "focus": 0, "gap": 8},
  "endBinding": {"elementId": "<target_rect_id>", "focus": 0, "gap": 8},
  "strokeColor": "#495057", "strokeWidth": 2, "roughness": 0,
  "opacity": 100, "isDeleted": false, "boundElements": null, "locked": false,
  "endArrowhead": "arrow", "startArrowhead": null
}

LAYOUT: Space nodes at least 320px apart horizontally, 180px vertically. No overlaps.
Generate 6-15 nodes for a meaningful diagram. Keep IDs strictly 20 alphanumeric chars.`;

        // Guard: cap prompt length to prevent abuse
        if (prompt.length > 1000) {
            throw new Error('Prompt is too long. Please keep it under 1000 characters.');
        }

        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: `Generate an Excalidraw diagram for: "${prompt.slice(0, 1000)}"`,
            systemInstruction,
        });

        const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
        await trackUsage(userId, 'diagram_generation', { tokenUsage });

        // Clean up any markdown wrapping the LLM might add despite instructions
        let rawJson = result.text.trim();
        if (rawJson.startsWith('```json')) {
            rawJson = rawJson.replace(/^```json\n?/, '');
        }
        if (rawJson.startsWith('```')) {
            rawJson = rawJson.replace(/^```[a-z]*\n?/, '');
        }
        if (rawJson.endsWith('```')) {
            rawJson = rawJson.replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(rawJson);

        if (!parsed.elements || !Array.isArray(parsed.elements)) {
            throw new Error("AI response is missing a valid 'elements' array.");
        }

        // Security: whitelist only known-safe Excalidraw element types to prevent
        // injection of unknown types that might be processed unsafely by Excalidraw.
        const SAFE_ELEMENT_TYPES = new Set([
            'rectangle', 'ellipse', 'diamond', 'triangle',
            'line', 'arrow', 'text', 'image', 'freedraw', 'frame', 'embeddable',
        ]);
        parsed.elements = parsed.elements.filter(
            (el: any) => el && typeof el === 'object' && SAFE_ELEMENT_TYPES.has(el.type)
        );

        return parsed;
    } catch (error) {
        console.error("Error generating Excalidraw diagram:", error);
        reportError(error as Error, { functionName: 'generateExcalidrawDiagram' });
        throw new Error("Failed to generate diagram with AI. Please try a different prompt.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Voice-to-Code + Socratic Coach
// ─────────────────────────────────────────────────────────────────────────────

export interface VoiceCoachMessage {
    role: 'user' | 'coach';
    text: string;
}

export interface VoiceToCodeResult {
    convertedCode: string;
    coachingMessage: string;
    /** The most important algorithm, correctness, or complexity topic to revisit next. */
    focusArea: string;
    /** Why that topic matters for the candidate's current approach. */
    whyItMatters: string;
    /** A small next coding or testing action, not a finished solution. */
    nextAction: string;
    /** Comma-separated test cases the candidate should consider next. */
    suggestedTests: string;
    /**
     * A short, runnable snippet for the step they are on — never the finished
     * solution.
     *
     * The agent used to answer "can you give me a code snippet?" with "I can't
     * provide code snippets directly", which is both unhelpful and untrue: it
     * writes the whole editor draft in `convertedCode`. Refusing the small
     * version of something it already does at full size just made it look
     * broken. Scoping the snippet to one step is what keeps the round worth
     * practising.
     */
    codeSnippet: string;
    /** One line saying what the snippet shows, so it is not dropped in unexplained. */
    snippetCaption: string;
    /** Whether the agent thinks the current direction is correct. */
    isOnRightTrack: boolean;
}

/**
 * Remove a markdown fence the model wrapped around code despite being asked not
 * to. Models do this often enough that trusting the instruction alone shows
 * ```javascript to the user as line one of their snippet.
 */
export const stripCodeFence = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed.startsWith('```')) return trimmed;
    return trimmed
        .replace(/^```[a-zA-Z0-9+#-]*\n?/, '')
        .replace(/\n?```$/, '')
        .trim();
};

export const normalizeVoiceToCodeResult = (value: unknown, currentCode: string): VoiceToCodeResult => {
    const result = value && typeof value === 'object' ? value as Partial<VoiceToCodeResult> : {};
    const text = (candidate: unknown, fallback: string) =>
        typeof candidate === 'string' && candidate.trim() ? candidate.trim() : fallback;

    return {
        convertedCode: text(result.convertedCode, currentCode),
        coachingMessage: text(result.coachingMessage, 'What input would most clearly test the assumption in your approach?'),
        focusArea: text(result.focusArea, 'Validate the core algorithm'),
        whyItMatters: text(result.whyItMatters, 'A focused test exposes whether the implementation matches the approach you described.'),
        nextAction: text(result.nextAction, 'Review the generated code, then run the visible tests before you submit.'),
        suggestedTests: typeof result.suggestedTests === 'string' ? result.suggestedTests.trim() : '',
        // Fenced blocks get stripped: the panel renders this in a <pre>, so a
        // stray ```lang line would show up as literal text in the code.
        codeSnippet: stripCodeFence(result.codeSnippet),
        snippetCaption: typeof result.snippetCaption === 'string' ? result.snippetCaption.trim() : '',
        isOnRightTrack: result.isOnRightTrack === true,
    };
};

/**
 * Takes the user's verbal description of their approach and the current state
 * of the editor, then returns:
 *   1. `convertedCode`   — the code that faithfully reflects what the user
 *                          described (not necessarily a correct solution).
 *   2. `coachingMessage` — a Socratic nudge that guides rather than solves.
 *   3. `isOnRightTrack`  — true when the described approach is sound.
 */
export const voiceToCode = async (params: {
    problem: string;
    language: string;
    userDescription: string;
    currentCode: string;
    conversationHistory: VoiceCoachMessage[];
}): Promise<VoiceToCodeResult> => {
    const { problem, language, userDescription, currentCode, conversationHistory } = params;

    const historyText = conversationHistory.length
        ? conversationHistory
              .map((m) => `${m.role === 'user' ? 'Candidate' : 'Coach'}: ${m.text}`)
              .join('\n')
        : 'None yet.';

    const systemInstruction = `You are an expert technical interview agent who helps candidates practise coding interviews.

## Your three jobs
1. **Code Transcription** — Convert the candidate's verbal description into ${language} code that faithfully implements what THEY described, even if their idea is flawed or incomplete. Do not fix their logic silently; reflect it.
2. **Coaching** — Guide the candidate with ONE targeted question or hint. Ask leading questions, surface edge cases they haven't considered, or nudge them toward a better data structure or algorithm. Keep it under 3 sentences.
3. **Show them code** — Give a short ${language} snippet for the step they are on right now.

## Snippets: always give one, never give the whole answer
NEVER say you cannot provide code. You can, and you already write a full draft
into their editor — refusing the small version of that is both unhelpful and
untrue. When they ask for a snippet, they get a snippet.

What a good snippet is:
- The ONE step under discussion: the data structure declaration, the eviction
  branch, the helper that moves a node to the head — not the finished function.
- Short. Usually 3 to 12 lines. If it is approaching the whole solution, cut it
  down to the part they are actually stuck on.
- Runnable ${language} on its own terms: real syntax, real names from THEIR code
  where they exist, conventional indentation.
- Illustrative where that teaches more: a signature with a \`// then: …\` comment
  beats a filled-in body when the point is the shape, not the lines.

If they explicitly ask for the complete solution, give them the next step
instead and say plainly that you are keeping the rest for them to write, because
solving it themselves is the entire point of the round.

## Rules
- If the candidate's approach is correct, praise it briefly and then challenge them on complexity or edge cases.
- If the approach is wrong or inefficient, point out the flaw through a question ("What happens when the input is empty?" / "What's the time complexity of your inner loop?"), then help them discover the fix.
- The converted code must compile, run, and use conventional indentation and line breaks. Fill in obvious syntactic boilerplate the user implied but didn't state. Use ${language} idioms.
- Identify one next focus, explain why it matters specifically for this approach, give one small next action, and list at most three useful test cases.
- \`coachingMessage\` stays prose. Put code in \`codeSnippet\`, never in the message — the panel renders them differently and code in the message loses its formatting.
- Return ONLY valid JSON matching the schema. Do NOT wrap \`codeSnippet\` or \`convertedCode\` in markdown fences; use real newlines inside the JSON string.`;

    const userPrompt = `## Problem
${problem}

## Current code in the editor
\`\`\`${language}
${currentCode || '(empty)'}
\`\`\`

## Conversation so far
${historyText}

## Candidate's latest verbal description
"${userDescription}"

Respond with JSON:
{
  "convertedCode": "<full ${language} solution reflecting candidate's description>",
  "coachingMessage": "<your reply — question or nudge, max 3 sentences, prose only>",
  "focusArea": "<one short coding topic, e.g. Duplicate handling>",
  "whyItMatters": "<one sentence tied to this approach>",
  "nextAction": "<one concrete coding or testing action>",
  "suggestedTests": "<comma-separated test cases, or empty string>",
  "codeSnippet": "<short ${language} snippet for the step they are on — no markdown fences>",
  "snippetCaption": "<one line saying what the snippet shows>",
  "isOnRightTrack": <true|false>
}`;

    const contents = [{ role: 'user', parts: [{ text: userPrompt }] }];

    const config = {
        responseMimeType: 'application/json',
        responseSchema: {
            type: 'OBJECT',
            properties: {
                convertedCode:    { type: 'STRING' },
                coachingMessage:  { type: 'STRING' },
                focusArea:        { type: 'STRING' },
                whyItMatters:     { type: 'STRING' },
                nextAction:       { type: 'STRING' },
                suggestedTests:   { type: 'STRING' },
                codeSnippet:      { type: 'STRING', description: 'Short runnable snippet for the current step. Never the finished solution. No markdown fences.' },
                snippetCaption:   { type: 'STRING', description: 'One line naming what the snippet shows.' },
                isOnRightTrack:   { type: 'BOOLEAN' },
            },
            // codeSnippet is required so the model cannot quietly opt out of the
            // job by omitting the field — the refusal it used to write in prose.
            required: ['convertedCode', 'coachingMessage', 'focusArea', 'whyItMatters', 'nextAction', 'suggestedTests', 'codeSnippet', 'snippetCaption', 'isOnRightTrack'],
        },
    };

    try {
        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents,
            config,
            systemInstruction,
        });
        return normalizeVoiceToCodeResult(JSON.parse(result.text.trim()), currentCode);
    } catch (error) {
        console.error('Error in voiceToCode:', error);
        reportError(error as Error, { functionName: 'voiceToCode' });
        throw new Error('Voice-to-code failed. Please try again.');
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// System Design Voice Coach (Socratic)
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemDesignCoachResult {
    coachingMessage: string;
    /** The single system-design area the candidate should work on next. */
    focusArea: string;
    /** Why this gap matters in the design under discussion. */
    whyItMatters: string;
    /** A short action the candidate can take on the canvas before the next response. */
    nextAction: string;
    /** Comma-separated component names the coach suggests adding next, e.g. "Load Balancer, Redis Cache" */
    suggestedComponents: string;
    isOnRightTrack: boolean;
}

const normalizeSystemDesignCoachResult = (value: unknown): SystemDesignCoachResult => {
    const result = value && typeof value === 'object' ? value as Partial<SystemDesignCoachResult> : {};
    const text = (candidate: unknown, fallback: string) =>
        typeof candidate === 'string' && candidate.trim() ? candidate.trim() : fallback;

    return {
        coachingMessage: text(result.coachingMessage, 'What would you draw next to make the request path more explicit?'),
        focusArea: text(result.focusArea, 'Clarify one missing system boundary'),
        whyItMatters: text(result.whyItMatters, 'A clear boundary lets an interviewer see how the system behaves as it scales.'),
        nextAction: text(result.nextAction, 'Add one component or connection that makes this boundary visible.'),
        suggestedComponents: typeof result.suggestedComponents === 'string' ? result.suggestedComponents.trim() : '',
        isOnRightTrack: result.isOnRightTrack === true,
    };
};

/**
 * Takes the user's verbal description of their system design approach and
 * returns Socratic coaching guidance (questions + hints, never the full answer).
 */
export const voiceSystemDesignCoach = async (params: {
    problem: string;
    requirements: string[];
    userDescription: string;
    /** Names of components already drawn on the canvas, if extractable. */
    existingComponents: string[];
    conversationHistory: VoiceCoachMessage[];
}): Promise<SystemDesignCoachResult> => {
    const { problem, requirements, userDescription, existingComponents, conversationHistory } = params;

    const historyText = conversationHistory.length
        ? conversationHistory
              .map((m) => `${m.role === 'user' ? 'Candidate' : 'Coach'}: ${m.text}`)
              .join('\n')
        : 'None yet.';

    const componentsText = existingComponents.length
        ? existingComponents.join(', ')
        : 'Canvas is empty';

    const systemInstruction = `You are a senior staff engineer coaching a candidate through a system design interview using the Socratic method.

## Your goal
Guide the candidate toward a correct, scalable architecture — but NEVER design it for them.
Ask ONE targeted question or give ONE specific hint per turn. Max 3 sentences.

## What to focus on (in order of impact):
1. Missing critical components (load balancer, caching, queues, databases suited to workload)
2. Scale bottlenecks not yet addressed
3. Data flow gaps (no arrows showing how components connect)
4. Failure modes not called out (no retry, DLQ, replica, or circuit breaker)
5. Trade-off awareness (sync vs async, consistency vs availability)

## Rules
- If the approach is correct, push deeper: ask about edge cases, failure modes, or complexity at 10× scale.
- Suggest no more than three component names the candidate should add next (be specific: "Redis cache", not just "cache").
- Never write a complete architecture for them.
- Return ONLY valid JSON matching the schema.`;

    const userPrompt = `## Design problem
${problem}

## Requirements
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Components already on the canvas
${componentsText}

## Conversation so far
${historyText}

## Candidate's latest verbal description
"${userDescription}"

Respond with JSON:
{
  "coachingMessage": "<Socratic question or nudge, max 3 sentences>",
  "focusArea": "<one short topic, e.g. Session ownership>",
  "whyItMatters": "<one sentence tied to this candidate's design>",
  "nextAction": "<one concrete canvas action, not a full solution>",
  "suggestedComponents": "<comma-separated specific component names to add next, or empty string>",
  "isOnRightTrack": <true|false>
}`;

    const config = {
        responseMimeType: 'application/json',
        responseSchema: {
            type: 'OBJECT',
            properties: {
                coachingMessage:     { type: 'STRING' },
                focusArea:           { type: 'STRING' },
                whyItMatters:        { type: 'STRING' },
                nextAction:          { type: 'STRING' },
                suggestedComponents: { type: 'STRING' },
                isOnRightTrack:      { type: 'BOOLEAN' },
            },
            required: ['coachingMessage', 'focusArea', 'whyItMatters', 'nextAction', 'suggestedComponents', 'isOnRightTrack'],
        },
    };

    try {
        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config,
            systemInstruction,
        });
        return normalizeSystemDesignCoachResult(JSON.parse(result.text.trim()));
    } catch (error) {
        console.error('Error in voiceSystemDesignCoach:', error);
        reportError(error as Error, { functionName: 'voiceSystemDesignCoach' });
        throw new Error('Voice coaching failed. Please try again.');
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Diagram Style Types (for output picker)
// ─────────────────────────────────────────────────────────────────────────────

export type DiagramStyle = SystemDesignDiagramStyle;

export const DIAGRAM_STYLE_LABELS: Record<DiagramStyle, string> = {
    auto:     'Auto (AI decides)',
    flow:     'Flow diagram',
    layered:  'Layered architecture',
    sequence: 'Sequence diagram',
};

export const DIAGRAM_STYLE_DESCRIPTIONS: Record<DiagramStyle, string> = {
    auto:     'AI picks the best layout for the problem',
    flow:     'Left-to-right request path: client → services → data',
    layered:  'Top-down swim lanes: Presentation / API / Services / Data',
    sequence: 'Time-based: components as columns, messages as arrows',
};

export interface GeneratedSystemDesignDiagram {
    plan: SystemDesignDiagramPlan;
    usedFallback: boolean;
}

const extractDiagramPlanJson = (value: string): unknown => {
    const cleaned = value.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '');
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end <= start) return null;
        try {
            return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
            return null;
        }
    }
};

/**
 * Generate a semantic architecture plan. Excalidraw elements are created on
 * the client from this plan, so malformed AI geometry can never break the canvas.
 */
export const generateStyledExcalidrawDiagram = async (
    userId: string,
    prompt: string,
    style: DiagramStyle,
): Promise<GeneratedSystemDesignDiagram> => {
    const styleHint: Record<DiagramStyle, string> = {
        auto: 'Choose the clearest style for the problem: flow, layered, or sequence.',
        flow: 'Use a LEFT-TO-RIGHT flow layout. Client(s) on the far left, databases on the far right. Arrows show the request path.',
        layered: 'Use a TOP-TO-DOWN layered layout: Client, Edge/API, Services, Events, Data.',
        sequence: 'Use a LEFT-TO-RIGHT column layout where each column is a participant/component. Draw horizontal arrows between columns to show message passing. Time flows top-to-bottom. Label each arrow with the message name.',
    };

    const systemInstruction = `You are an expert system-design interviewer. Return one JSON object only, with this exact shape:
{"recommendedStyle":"flow|layered|sequence","nodes":[{"id":"short-stable-id","label":"specific component","layer":"client|edge|service|event|data"}],"connections":[{"from":"node-id","to":"node-id","label":"short action"}]}

The candidate needs an editable starting point, not a complete answer. Include 5-8 distinct components and 4-10 directed connections. Every connection must reference a node id. Use concise labels such as "validate token", "publish event", or "persist document". Do not include coordinates, drawing instructions, markdown, or any fields beyond this JSON shape.

Requested presentation: ${styleHint[style]}`;

    if (prompt.length > 1000) throw new Error('Prompt is too long.');

    try {
        const result = await callGeminiProxy({
            modelName: DEFAULT_TEXT_MODEL,
            contents: `Create an editable system-design starter diagram for: "${prompt.slice(0, 1000)}"`,
            systemInstruction,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        recommendedStyle: { type: 'STRING' },
                        nodes: { type: 'ARRAY', items: { type: 'OBJECT' } },
                        connections: { type: 'ARRAY', items: { type: 'OBJECT' } },
                    },
                    required: ['nodes', 'connections'],
                },
            },
        });

        const plan = normalizeSystemDesignPlan(extractDiagramPlanJson(result.text));
        if (plan) {
            const tokenUsage = result.response?.usageMetadata?.totalTokenCount || 0;
            try {
                await trackUsage(userId, 'diagram_generation', { tokenUsage });
            } catch (trackingError) {
                console.warn('Diagram generation succeeded, but usage tracking did not.', trackingError);
            }
            return { plan, usedFallback: false };
        }
    } catch (error) {
        console.warn('System design diagram plan generation failed; using the editable starter diagram.', error);
        reportError(error as Error, { functionName: 'generateStyledExcalidrawDiagram' });
    }

    return { plan: createFallbackSystemDesignPlan(prompt), usedFallback: true };
};
