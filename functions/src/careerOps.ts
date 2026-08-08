import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

import { getAIClient } from "./utils/ai";
import { getPlanMonthlyLimitForUser } from "./utils/planLimits";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();


// ─────────────────────────────────────────────────────────────────────────────
// Helper: Deduct AI Credits (returns false if limit reached)
// ─────────────────────────────────────────────────────────────────────────────
async function deductCredits(userId: string, cost: number): Promise<void> {
  const userRef = db.collection("users").doc(userId);

  await db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const data = userDoc.data()!;
    const aiUsage = data.aiUsage || {};
    const count: number = aiUsage.count || 0;
    const limit = getPlanMonthlyLimitForUser(data);

    const isAdmin =
      data.role === "admin" || (data.roles || []).includes("admin");

    if (!isAdmin && count + cost > limit) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "AI credit limit reached. Please upgrade your plan."
      );
    }

    tx.update(userRef, {
      "aiUsage.count": admin.firestore.FieldValue.increment(cost),
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Fetch user's CareerProfile
// ─────────────────────────────────────────────────────────────────────────────
async function getCareerProfile(userId: string): Promise<string> {
  const profileDoc = await db
    .collection("users")
    .doc(userId)
    .collection("careerProfile")
    .doc("profile")
    .get();

  if (!profileDoc.exists) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Career profile not found. Please set up your Career Profile first."
    );
  }

  const data = profileDoc.data()!;
  return data.cvMarkdown as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// evaluateJob — full A-F career-ops evaluation
// ─────────────────────────────────────────────────────────────────────────────
export const evaluateJob = functions
  .region("us-west1")
  .runWith({
    secrets: [],
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const userId = context.auth.uid;
    const {
      jobId,
      jobTitle,
      companyName,
      jobDescription,
      jobPostURL,
      location,
    } = data;

    if (!jobId || !jobTitle || !companyName || !jobDescription) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "jobId, jobTitle, companyName, and jobDescription are required"
      );
    }

    // Deduct 3 credits
    await deductCredits(userId, 3);

    // Fetch user's CV
    const cvMarkdown = await getCareerProfile(userId);

    const ai = getAIClient();

    // Build the career-ops evaluation prompt (A-F blocks)
    const prompt = `You are an expert career coach and hiring consultant with 20 years of experience.
Evaluate the following job opportunity against this candidate's CV. Produce a structured A-F evaluation.

=== CANDIDATE CV ===
${cvMarkdown}

=== JOB DETAILS ===
Title: ${jobTitle}
Company: ${companyName}
Location: ${location || "Not specified"}
URL: ${jobPostURL || "N/A"}

Job Description:
${jobDescription}

=== EVALUATION INSTRUCTIONS ===
Return your response as a JSON object with EXACTLY this structure. Do NOT include markdown code fences:

{
  "archetype": "<EXACTLY one of these 6 options: AI Platform / LLMOps | Solutions Architect | Engineering Manager | Senior IC | Product Engineer | Founding Engineer>",
  "score": <number 1.0-5.0 with one decimal, weighted average>,
  "scoreBreakdown": {
    "roleClarity": <1-5>,
    "cvMatch": <1-5>,
    "levelFit": <1-5>,
    "compPotential": <1-5>,
    "growthOpportunity": <1-5>
  },
  "blocksA_F": {
    "roleOverview": "<2-3 sentence summary of what this role actually requires day-to-day>",
    "cvMatch": "<paragraph: specific skills the candidate has that match, then specific gaps with suggested mitigation>",
    "levelStrategy": "<paragraph: is this a step up, lateral, or step down? How should they position themselves?>",
    "compResearch": "<paragraph: estimated market comp range for this role/location based on your knowledge, cite Levels.fyi or similar>",
    "personalizationPlan": "<5 specific, actionable bullet points to tailor the candidate's CV for this application>",
    "interviewPrep": "<3-4 STAR story frameworks mapped to likely interview questions for this role>"
  },
  "atsKeywords": ["keyword1", "keyword2", ...],
  "recommendApply": <true if score >= 4.0, false otherwise>
}

Be honest and specific. Avoid generic advice. Reference the actual CV and JD content.`;

    let evalResult: any;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = (response.text || "").trim();

      // Strip markdown code fences if present
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

      evalResult = JSON.parse(cleaned);
    } catch (parseError: any) {
      console.error("[evaluateJob] Failed to parse Gemini response:", parseError);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to parse AI evaluation. Please try again."
      );
    }

    // Build the AIJobEvaluation object
    const evaluation = {
      score: evalResult.score,
      archetype: evalResult.archetype,
      blocksA_F: {
        roleOverview: evalResult.blocksA_F?.roleOverview || "",
        cvMatch: evalResult.blocksA_F?.cvMatch || "",
        levelStrategy: evalResult.blocksA_F?.levelStrategy || "",
        compResearch: evalResult.blocksA_F?.compResearch || "",
        personalizationPlan: evalResult.blocksA_F?.personalizationPlan || "",
        interviewPrep: evalResult.blocksA_F?.interviewPrep || "",
      },
      atsKeywords: evalResult.atsKeywords || [],
      recommendApply: evalResult.recommendApply ?? evalResult.score >= 4.0,
      evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    await db
      .collection("users")
      .doc(userId)
      .collection("jobTracker")
      .doc(jobId)
      .update({
        aiEvaluation: evaluation,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(
      `[evaluateJob] Evaluated job ${jobId} for user ${userId}. Score: ${evalResult.score}`
    );

    // ── Phase 1C: Extract STAR+R stories when score >= 4.0 (non-blocking) ─────
    if (evalResult.score >= 4.0) {
      extractAndSaveStories(userId, jobId, jobTitle, companyName, cvMarkdown, evalResult)
        .catch(err => console.error("[storyBank] Extraction failed (non-fatal):", err));
    }

    return { success: true, evaluation };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1C: extractAndSaveStories — STAR+R story bank accumulator
// Runs non-blocking after evaluateJob when score >= 4.0
// ─────────────────────────────────────────────────────────────────────────────
async function extractAndSaveStories(
  userId: string,
  jobId: string,
  jobTitle: string,
  companyName: string,
  cvMarkdown: string,
  evalResult: any,
  apiKey?: string
): Promise<void> {
  const ai = getAIClient(apiKey);

  const prompt = `You are an interview coach. Extract 2-3 strong, reusable STAR+R interview stories from this candidate's CV that would be relevant for the "${jobTitle}" role at ${companyName}.

=== CANDIDATE CV ===
${cvMarkdown}

=== RELEVANT ATS KEYWORDS (from job evaluation) ===
${(evalResult.atsKeywords || []).join(", ")}

=== INTERVIEW PREP NOTES ===
${evalResult.blocksA_F?.interviewPrep || ""}

For each story, extract the following. Prioritize stories that:
1. Demonstrate concrete impact with metrics
2. Involve cross-functional collaboration or leadership
3. Apply to common behavioral questions ("Tell me about a time...")

Return a JSON array with 2-3 story objects. Each object MUST have:
{
  "title": "<short memorable title, e.g. 'Led 3x revenue growth for Platform team'>",
  "situation": "<1-2 sentences: context and problem>",
  "task": "<1 sentence: your specific responsibility>",
  "action": "<2-3 sentences: what you did and how>",
  "result": "<1-2 sentences: measurable outcome>",
  "relevance": "<What interview question this best answers, e.g. 'Describe an impact you had on a team'>",
  "tags": ["<archetype that benefits most, one of: AI Platform / LLMOps | Solutions Architect | Engineering Manager | Senior IC | Product Engineer | Founding Engineer>", "<optional skill tag>"]
}

Return ONLY the JSON array, no markdown fences.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = (response.text || "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  const stories: any[] = JSON.parse(text);
  if (!Array.isArray(stories) || stories.length === 0) return;

  const storyBankRef = db
    .collection("users")
    .doc(userId)
    .collection("storyBank");

  // Upsert each story — de-duplicate by first 80 chars of action field
  const batch = db.batch();
  for (const story of stories) {
    if (!story.title || !story.action) continue;

    // Simple dedup key: title slug
    const dedupKey = story.title.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 60);
    const storyRef = storyBankRef.doc(dedupKey);

    batch.set(storyRef, {
      ...story,
      sourceJobId: jobId,
      sourceJobTitle: jobTitle,
      sourceCompany: companyName,
      archetype: evalResult.archetype || null,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }); // merge:true = don't overwrite if already enriched
  }

  await batch.commit();

  console.log(
    `[storyBank] Saved ${stories.length} stories for user ${userId} from job ${jobId}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// generateLinkedInOutreach — contacto.md logic: 300-char message
// ─────────────────────────────────────────────────────────────────────────────

export const generateLinkedInOutreach = functions
  .region("us-west1")
  .runWith({
    secrets: [],
    timeoutSeconds: 60,
    memory: "512MB",
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const userId = context.auth.uid;
    const { jobId, jobTitle, companyName, hiringManagerName } = data;

    if (!jobId || !jobTitle || !companyName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "jobId, jobTitle, and companyName are required"
      );
    }

    await deductCredits(userId, 1);

    // Fetch CV + existing evaluation
    const cvMarkdown = await getCareerProfile(userId);
    const jobDoc = await db
      .collection("users")
      .doc(userId)
      .collection("jobTracker")
      .doc(jobId)
      .get();

    const jobData = jobDoc.data() || {};
    const evaluation = jobData.aiEvaluation;

    const recipientName = hiringManagerName || "hiring manager";
    const proofPoint =
      evaluation?.blocksA_F?.cvMatch?.split(".")[0] || "my background in this space";

    const prompt = `Write a LinkedIn connection request message for a job seeker.

Target: ${recipientName} at ${companyName}
Role being applied for: ${jobTitle}
Key proof point from the candidate's background: ${proofPoint}

STRICT RULES:
- Maximum 300 characters (including spaces)
- 3 sentences: 1) specific hook about their work/company, 2) brief proof point, 3) soft ask
- No generic phrases like "I'm interested in your company"
- Reference something specific about ${companyName}
- Sound natural, not salesy

Return ONLY the message text, no quotes, no explanation.`;

    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const message = (response.text || "").trim().substring(0, 300);

    // Save to job doc
    await db
      .collection("users")
      .doc(userId)
      .collection("jobTracker")
      .doc(jobId)
      .update({
        linkedInOutreach: message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(
      `[generateLinkedInOutreach] Generated message for job ${jobId}, user ${userId}`
    );

    return { success: true, message };
  });

// ─────────────────────────────────────────────────────────────────────────────
// generateDeepResearch — deep.md: 6-axis company research prompt
// ─────────────────────────────────────────────────────────────────────────────
export const generateDeepResearch = functions
  .region("us-west1")
  .runWith({
    secrets: [],
    timeoutSeconds: 60,
    memory: "512MB",
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const userId = context.auth.uid;
    const { jobId, jobTitle, companyName, jobDescription } = data;

    if (!jobId || !companyName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "jobId and companyName are required"
      );
    }

    await deductCredits(userId, 1);

    const prompt = `You are a research assistant helping a job seeker prepare for interviews.
Generate a comprehensive 6-axis research prompt they can paste into Perplexity or ChatGPT to research the company.

Company: ${companyName}
Role: ${jobTitle || "Unknown"}
${jobDescription ? `Job Description excerpt: ${jobDescription.substring(0, 500)}` : ""}

Generate one research prompt (to be used in a search engine or AI) that asks about:
1. Company's current AI/tech stack and recent product announcements
2. Company culture, engineering blog posts, and team values
3. Recent funding, business moves, acquisitions, or layoffs (last 12 months)
4. Main competitors and how this company differentiates
5. Typical interview process for this role type at this company
6. Any notable founders, leadership changes, or press coverage

Format: Write a single, detailed research prompt that someone could copy-paste into Perplexity AI to get comprehensive results. Start with "Research ${companyName}:" and make it specific and actionable.

Return ONLY the research prompt, no explanation.`;

    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const researchPrompt = (response.text || "").trim();

    // Save to job doc
    await db
      .collection("users")
      .doc(userId)
      .collection("jobTracker")
      .doc(jobId)
      .update({
        deepResearchPrompt: researchPrompt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(
      `[generateDeepResearch] Generated research prompt for job ${jobId}, user ${userId}`
    );

    return { success: true, researchPrompt };
  });

// ─────────────────────────────────────────────────────────────────────────────
// saveCareerProfile — stores the user's master CV markdown
// ─────────────────────────────────────────────────────────────────────────────
export const saveCareerProfile = functions
  .region("us-west1")
  .runWith({
    timeoutSeconds: 30,
    memory: "512MB",
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const userId = context.auth.uid;
    const {
      cvMarkdown,
      articleDigest,
      targetArchetypes,
      targetSalaryMin,
      targetSalaryMax,
      targetLocations,
      portalConfig,
    } = data;

    if (!cvMarkdown || typeof cvMarkdown !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "cvMarkdown is required"
      );
    }

    const profileData = {
      uid: userId,
      cvMarkdown,
      articleDigest: articleDigest || "",
      targetArchetypes: targetArchetypes || [],
      targetSalaryMin: targetSalaryMin || null,
      targetSalaryMax: targetSalaryMax || null,
      targetLocations: targetLocations || [],
      portalConfig: portalConfig || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db
      .collection("users")
      .doc(userId)
      .collection("careerProfile")
      .doc("profile")
      .set(profileData, { merge: true });

    console.log(`[saveCareerProfile] Saved career profile for user ${userId}`);

    return { success: true };
  });
