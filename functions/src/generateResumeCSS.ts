import * as functions from "firebase-functions/v1";
import { getAIClient } from "./utils/ai";

/**
 * AI Resume CSS Generator Cloud Function
 *
 * Takes a free-text styling instruction and the current template context,
 * returns valid CSS rules + optional keyframe animations.
 *
 * Powered by Gemini 2.5 Flash — optimised for code generation.
 */
export const generateResumeCSS = functions
    .region("us-west1")
    .runWith({
        timeoutSeconds: 60,
        memory: "512MB",
    })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "You must be signed in to use AI Code Customizer."
            );
        }

        const { instruction, templateId, currentCss, themeColor } = data;

        if (!instruction?.trim()) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Missing instruction."
            );
        }

        const systemPrompt = `
You are an expert CSS engineer specializing in resume/CV styling for print-quality A4 documents rendered as React components.
The resume is rendered inside a div with the ID selector "#resume-preview-<id>".
All CSS you write will be SCOPED under that root selector automatically — so write rules relative to the resume root.

You MUST respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "css": "/* your CSS rules here, one block */",
  "summary": "A short (max 20 word) description of what you changed.",
  "animationName": "optional: name of keyframe animation if you added one"
}

RULES:
1. Write clean, valid CSS. No !important spam — only use it when truly necessary.
2. For color changes, use hex or rgba. Never use CSS variables that don't exist.
3. For animations, define @keyframes inside the css block AND use them immediately.
4. Keep animations subtle and professional: fade-in, slide-in, gentle pulse. NO disco effects.
5. Scoping: target elements semantically. Common resume elements:
   - h1, h2, h3 — name and section headings
   - p, li — body text
   - .section-title or section headings (usually h2 or h3)
   - Specific colors can be set with border-color, background-color, color
6. Template ID: "${templateId || 'Modern'}". Adjust selectors if necessary.
7. Current theme color: ${themeColor || '#2563eb'}
8. If the instruction is unclear, return: {"css": "", "summary": "I wasn't sure what to style. Please be more specific.", "animationName": ""}
9. If user says "remove" or "reset", return empty css: {"css": "", "summary": "Custom CSS removed.", "animationName": ""}

EXAMPLES of good instructions and what to output:
- "Make section headings purple gradient" → css with color: gradient on h2/h3
- "Add a subtle fade-in to each section" → @keyframes fadeIn + animation on sections
- "Increase name font size to 36px" → h1 { font-size: 36px; }
- "Add a thin blue left border to each section" → section or h2 { border-left: 3px solid #2563eb; padding-left: 8px; }

Current CSS already applied:
${currentCss ? `\`\`\`css\n${currentCss}\n\`\`\`` : "(none — clean slate)"}
`;

        const userPrompt = `
USER STYLING INSTRUCTION:
"${instruction.trim()}"

Respond with ONLY the JSON object. No explanation outside the JSON.
`;

        try {
            const ai = getAIClient();
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: userPrompt,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json",
                    temperature: 0.2,
                },
            });

            const responseText = (result.text || "").trim();
            let parsed: { css: string; summary: string; animationName?: string };

            try {
                parsed = JSON.parse(responseText);
            } catch {
                console.error("[generateResumeCSS] Parse error:", responseText);
                throw new functions.https.HttpsError("internal", "AI returned invalid JSON.");
            }

            return {
                success: true,
                css: parsed.css || "",
                summary: parsed.summary || "Style applied.",
                animationName: parsed.animationName || "",
            };
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            throw new functions.https.HttpsError("internal", `CSS generation failed: ${error.message}`);
        }
    });
