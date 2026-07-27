import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getAIClient } from "./utils/ai";
import { secureCorsHandler } from "./utils/corsUtils.js";

const corsHandler = secureCorsHandler;
const END_MARKER = "__END_GEMINI__";

/**
 * Models this proxy is allowed to run.
 *
 * Without a list, `modelName` came straight off the request body, so a caller
 * could name any model the service account can reach — including ones far more
 * expensive than anything the UI offers.
 */
const ALLOWED_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
  "imagen-4.0-generate-001",
]);

/** Largest prompt this proxy will forward, in bytes of serialized `contents`. */
const MAX_CONTENTS_BYTES = 400_000;

/**
 * Resolve the caller from their Firebase ID token.
 *
 * `invoker: "public"` stays: a browser authenticates with a Firebase ID token,
 * which IAM knows nothing about, so making the function IAM-private would lock
 * the web app out rather than lock attackers out. The gate belongs here, in the
 * handler, where the Firebase token can actually be verified.
 */
async function resolveCaller(req: any): Promise<string | null> {
  const header: string = req.headers?.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(header.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

export const streamGeminiResponse = onRequest(
  {
    timeoutSeconds: 300,
    region: "us-west1",
    memory: "1GiB",
    invoker: "public",
  },
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }

      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const uid = await resolveCaller(req);
      if (!uid) {
        res.status(401).json({ error: "Sign in to use AI features." });
        return;
      }

      const payload = req.body?.data ?? req.body ?? {};
      let {
        modelName = "gemini-2.5-flash",
        contents,
        config,
        systemInstruction,
      } = payload;

      if (!ALLOWED_MODELS.has(modelName)) {
        res.status(400).json({ error: `Model not available: ${modelName}` });
        return;
      }

      if (JSON.stringify(contents ?? "").length > MAX_CONTENTS_BYTES) {
        res.status(413).json({ error: "Prompt too large." });
        return;
      }

      if (!systemInstruction && config?.systemInstruction) {
        systemInstruction = config.systemInstruction;
        delete config.systemInstruction;
      }

      if (!contents) {
        res.status(400).send("Missing contents payload.");
        return;
      }

      try {
        const isImageMode = config?.responseModalities?.includes("IMAGE") || modelName.startsWith("imagen") || modelName.includes("-image");
        const isImagenPredict = modelName.startsWith("imagen");

        if (isImageMode && isImagenPredict) {
          const ai = getAIClient();
          const promptText = typeof contents === 'string' ? contents : JSON.stringify(contents);
          
          const response = await ai.models.generateImages({
            model: modelName,
            prompt: promptText,
            config: {
              numberOfImages: 1
            }
          });

          const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
          const mimeType = response.generatedImages?.[0]?.image?.mimeType || "image/png";

          if (!base64Image) {
            throw new Error("No image data returned from model API.");
          }

          // Return in the format expected by the frontend based on SDK response
          const mockedResponse = {
            candidates: [{
              content: {
                parts: [{
                  inlineData: { mimeType, data: base64Image }
                }]
              }
            }]
          };

          res.setHeader("Content-Type", "text/plain");
          res.setHeader("Transfer-Encoding", "chunked");
          res.write(`\n${END_MARKER}${JSON.stringify({ response: mockedResponse, text: "" })}`);
          res.end();
          return;
        }

        const ai = getAIClient();
        const finalConfig = { ...config };
        if (systemInstruction) {
          finalConfig.systemInstruction = systemInstruction;
        }

        let result: any;
        if (isImageMode) {
          result = await ai.models.generateContent({ 
            model: modelName, 
            contents, 
            config: finalConfig 
          });
        } else {
          result = await ai.models.generateContentStream({ 
            model: modelName, 
            contents, 
            config: finalConfig 
          });
        }

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");

        let aggregatedText = "";
        let jsonResponse: any;

        if (isImageMode) {
          aggregatedText = result.text || "";
          jsonResponse = result;
          if (aggregatedText) res.write(aggregatedText);
        } else {
          for await (const chunk of result) {
            try {
              const chunkText = chunk.text;
              if (chunkText) {
                aggregatedText += chunkText;
                res.write(chunkText);
              }
            } catch (e) {
              // Ignore non-text chunks
            }
          }
          // Mock the response structure for the client
          jsonResponse = {
            candidates: [{
              content: {
                parts: [{ text: aggregatedText }]
              }
            }]
          };
        }

        const payloadJson = JSON.stringify({
          response: jsonResponse,
          text: aggregatedText,
        });

        res.write(`\n${END_MARKER}${payloadJson}`);
        res.end();
      } catch (error: any) {
        console.error("Gemini Proxy Error:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: error.message || "Gemini proxy failed" });
        } else {
          res.end();
        }
      }
    });
  }
);
