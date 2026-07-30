import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

import { getAIClient } from "./utils/ai";
import { getLabelHash } from "./answerLibrary";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const SERVER_TIMESTAMP = admin.firestore.FieldValue.serverTimestamp;

type ApplyAgentStatus =
  | "draft"
  | "preparing"
  | "ready"
  | "approved"
  | "running"
  | "needs_user"
  | "submitted"
  | "failed"
  | "skipped";

type ApplyQuestionType =
  | "text"
  | "textarea"
  | "select"
  | "email"
  | "tel"
  | "url"
  | "date"
  | "radio"
  | "checkbox"
  | "unknown";

interface ApplyQuestion {
  label: string;
  type: ApplyQuestionType;
  existingValue?: string;
  options?: string[];
  required?: boolean;
}

interface ApplicationProfile {
  workAuthorization?: {
    legallyAuthorized?: boolean | null;
    needsSponsorshipNow?: boolean | null;
    needsSponsorshipFuture?: boolean | null;
  };
  identity?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    country?: string;
  };
  eeo?: {
    gender?: string;
    raceEthnicity?: string;
    disabilityStatus?: string;
    veteranStatus?: string;
  };
  compensation?: {
    targetSalary?: string;
    minimumSalary?: string;
    preferenceType?: "annual" | "hourly";
  };
  relocationRemote?: {
    willingToRelocate?: boolean | null;
    preferredLocations?: string[];
    workModelPreference?: "remote" | "hybrid" | "onsite" | "flexible";
  };
  availability?: {
    startDate?: string;
    workSchedule?: string;
    timezone?: string;
  };
  backgroundLegal?: {
    backgroundCheckConsent?: boolean | null;
    ageEligibilityAttested?: boolean | null;
  };
  autoApplyRules?: {
    enabled?: boolean;
    maxApplicationsPerDay?: number;
    maxApplicationsPerNight?: number;
    minimumMatchScore?: number;
    excludedCompanies?: string[];
    excludedJobTitles?: string[];
    requireApprovalForMissingSensitiveAnswers?: boolean;
  };
  consent?: {
    autoSubmitAuthorized?: boolean;
    receiptStorageAuthorized?: boolean;
  };
}

interface ApplicationAnswerPlanItem {
  label: string;
  answer: string;
  confidence: "high" | "medium" | "low";
  source:
    | "application_profile"
    | "resume"
    | "answer_library"
    | "ai_generated"
    | "manual"
    | "skipped";
  sensitive: boolean;
  requiresUser: boolean;
  reasoning?: string;
}

const SENSITIVE_LABEL_PATTERNS = [
  /sponsor(ship)?|visa|h-?1b|work authorization|authorized to work|legally authorized/i,
  /\beeo\b|equal employment|gender|sex\b|race|ethnicity|hispanic|latino/i,
  /disability|disabled/i,
  /veteran|military service/i,
  /salary|compensation|pay expectation|expected pay|desired pay/i,
  /relocat|remote|hybrid|on-?site|onsite/i,
  /background check|criminal|conviction/i,
  /age|over 18|older than 18|eligib(le|ility) to work/i,
];

function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }
  return context.auth.uid;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value?: string): string {
  return (value || "").trim().toLowerCase();
}

function boolAnswer(value?: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function formatEeo(value?: string): string {
  if (!value || value === "not_provided") return "";
  if (value === "prefer_not_to_answer") return "Prefer not to answer";
  return value;
}

function isSensitiveApplicationField(label: string): boolean {
  return SENSITIVE_LABEL_PATTERNS.some((pattern) => pattern.test(label));
}

function salaryAnswer(profile: ApplicationProfile): string {
  const compensation = profile.compensation || {};
  const target = text(compensation.targetSalary);
  const minimum = text(compensation.minimumSalary);
  const unit = compensation.preferenceType === "hourly" ? "hourly" : "annual";
  if (target && minimum) return `${target} target, ${minimum} minimum ${unit}`;
  if (target) return `${target} ${unit}`;
  if (minimum) return `${minimum} minimum ${unit}`;
  return "";
}

function workModelLabel(value?: string): string {
  if (!value) return "";
  if (value === "onsite") return "On-site";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function answerFromApplicationProfile(label: string, profile: ApplicationProfile | null): string {
  if (!profile) return "";
  const normalized = label.toLowerCase();

  if (/sponsor|visa/.test(normalized)) {
    if (/future/.test(normalized)) return boolAnswer(profile.workAuthorization?.needsSponsorshipFuture);
    return boolAnswer(profile.workAuthorization?.needsSponsorshipNow);
  }
  if (/authorized|work authorization|legally authorized|eligible to work/.test(normalized)) {
    return boolAnswer(profile.workAuthorization?.legallyAuthorized);
  }
  if (/gender|sex\b/.test(normalized)) return formatEeo(profile.eeo?.gender);
  if (/race|ethnicity|hispanic|latino/.test(normalized)) return formatEeo(profile.eeo?.raceEthnicity);
  if (/disability|disabled/.test(normalized)) return formatEeo(profile.eeo?.disabilityStatus);
  if (/veteran|military/.test(normalized)) return formatEeo(profile.eeo?.veteranStatus);
  if (/salary|compensation|pay/.test(normalized)) return salaryAnswer(profile);
  if (/relocat/.test(normalized)) return boolAnswer(profile.relocationRemote?.willingToRelocate);
  if (/remote|hybrid|on-?site|onsite/.test(normalized)) {
    return workModelLabel(profile.relocationRemote?.workModelPreference);
  }
  if (/background check|criminal|conviction/.test(normalized)) {
    return boolAnswer(profile.backgroundLegal?.backgroundCheckConsent);
  }
  if (/age|over 18|older than 18/.test(normalized)) {
    return boolAnswer(profile.backgroundLegal?.ageEligibilityAttested);
  }
  return "";
}

function sensitiveAnswerPlanItem(
  question: ApplyQuestion,
  profile: ApplicationProfile | null
): ApplicationAnswerPlanItem | null {
  if (!isSensitiveApplicationField(question.label)) return null;
  const answer = answerFromApplicationProfile(question.label, profile);
  return {
    label: question.label,
    answer,
    confidence: answer ? "high" : "low",
    source: answer ? "application_profile" : "skipped",
    sensitive: true,
    requiresUser: !answer,
    reasoning: answer
      ? "Resolved from saved Application Profile."
      : "Sensitive application field requires an explicit saved user answer.",
  };
}

function validateApplicationProfile(profile: ApplicationProfile | null): {
  requiredReady: boolean;
  missingRequiredFields: string[];
} {
  if (!profile) {
    return { requiredReady: false, missingRequiredFields: ["Application Profile"] };
  }

  const missing: string[] = [];
  const requireText = (label: string, value?: string) => {
    if (!text(value)) missing.push(label);
  };
  const requireBoolean = (label: string, value?: boolean | null) => {
    if (value === null || value === undefined) missing.push(label);
  };
  const requireTrue = (label: string, value?: boolean | null) => {
    if (value !== true) missing.push(label);
  };

  requireText("First name", profile.identity?.firstName);
  requireText("Last name", profile.identity?.lastName);
  requireText("Email", profile.identity?.email);
  requireText("Phone", profile.identity?.phone);
  requireText("Country", profile.identity?.country);
  requireBoolean("Legally authorized to work", profile.workAuthorization?.legallyAuthorized);
  requireBoolean("Sponsorship needed now", profile.workAuthorization?.needsSponsorshipNow);
  requireBoolean("Sponsorship needed in the future", profile.workAuthorization?.needsSponsorshipFuture);
  requireBoolean("Open to relocation", profile.relocationRemote?.willingToRelocate);
  requireTrue("I am 18 years of age or older", profile.backgroundLegal?.ageEligibilityAttested);

  if (!profile.eeo?.gender) missing.push("EEO gender answer");
  if (!profile.eeo?.raceEthnicity) missing.push("EEO race/ethnicity answer");
  if (!profile.eeo?.disabilityStatus) missing.push("Disability status answer");
  if (!profile.eeo?.veteranStatus) missing.push("Veteran status answer");
  if (!profile.consent?.autoSubmitAuthorized) missing.push("Auto-submit authorization");

  return {
    requiredReady: missing.length === 0,
    missingRequiredFields: missing,
  };
}

async function getApplicationProfile(userId: string): Promise<ApplicationProfile | null> {
  const snap = await db.collection("users").doc(userId).collection("applicationProfile").doc("profile").get();
  return snap.exists ? (snap.data() as ApplicationProfile) : null;
}

async function getResumeContext(
  userRef: FirebaseFirestore.DocumentReference,
  resumeId?: string
): Promise<{ resumeId: string | null; context: string; exists: boolean }> {
  let resumeSnap: FirebaseFirestore.DocumentSnapshot | null = null;
  let resolvedResumeId = text(resumeId) || null;

  if (resolvedResumeId) {
    resumeSnap = await userRef.collection("resumes").doc(resolvedResumeId).get();
  }

  if (!resumeSnap?.exists) {
    const latest = await userRef.collection("resumes").orderBy("updatedAt", "desc").limit(1).get();
    resumeSnap = latest.docs[0] || null;
    resolvedResumeId = resumeSnap?.id || null;
  }

  if (!resumeSnap?.exists) {
    return { resumeId: resolvedResumeId, context: "", exists: false };
  }

  const resume = resumeSnap.data() || {};
  const personal = resume.personalDetails || {};
  const lines: string[] = [];
  const name = [personal.firstName, personal.lastName].filter(Boolean).join(" ");

  if (name) lines.push(`Name: ${name}`);
  if (personal.jobTitle) lines.push(`Target title: ${personal.jobTitle}`);
  if (resume.professionalSummary) lines.push(`Summary: ${resume.professionalSummary}`);
  if (Array.isArray(resume.skills)) {
    lines.push(`Skills: ${resume.skills.map((skill: any) => skill?.name || skill).filter(Boolean).join(", ")}`);
  }
  if (Array.isArray(resume.employmentHistory)) {
    resume.employmentHistory.forEach((job: any) => {
      lines.push(`Experience: ${job.jobTitle || ""} at ${job.employer || ""} (${job.startDate || ""} - ${job.endDate || ""}) ${job.description || ""}`);
    });
  }
  if (Array.isArray(resume.education)) {
    resume.education.forEach((school: any) => {
      lines.push(`Education: ${school.degree || ""}, ${school.school || ""}`);
    });
  }

  return { resumeId: resolvedResumeId, context: lines.join("\n"), exists: true };
}

function detectAtsPlatform(applyUrl: string): string | null {
  if (!applyUrl) return null;
  try {
    const host = new URL(applyUrl).hostname.toLowerCase();
    if (host.includes("greenhouse")) return "Greenhouse";
    if (host.includes("lever.co")) return "Lever";
    if (host.includes("ashby")) return "Ashby";
    if (host.includes("workday") || host.includes("myworkdayjobs")) return "Workday";
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("indeed")) return "Indeed";
    if (host.includes("smartrecruiters")) return "SmartRecruiters";
    if (host.includes("jobvite")) return "Jobvite";
    return null;
  } catch (_) {
    return null;
  }
}

function getMatchScore(job: Record<string, any>, resumeId?: string | null): number | null {
  const rawScore = job.aiEvaluation?.score;
  if (typeof rawScore === "number") {
    return Math.round(rawScore <= 5 ? rawScore * 20 : rawScore);
  }

  const analyses = job.matchAnalyses || {};
  const preferred = resumeId ? analyses[resumeId] : null;
  const analysis = preferred || Object.values(analyses)[0] as any;
  const matchPercentage = analysis?.matchPercentage;
  return typeof matchPercentage === "number" ? Math.round(matchPercentage) : null;
}

function getApplyUrl(job: Record<string, any>): string {
  return text(job.applicationURL) || text(job.jobPostURL);
}

function getAutoApplyRules(profile: ApplicationProfile | null): Required<NonNullable<ApplicationProfile["autoApplyRules"]>> {
  return {
    enabled: profile?.autoApplyRules?.enabled === true,
    maxApplicationsPerDay: Number(profile?.autoApplyRules?.maxApplicationsPerDay || 10),
    maxApplicationsPerNight: Number(profile?.autoApplyRules?.maxApplicationsPerNight || 5),
    minimumMatchScore: Number(profile?.autoApplyRules?.minimumMatchScore || 70),
    excludedCompanies: profile?.autoApplyRules?.excludedCompanies || [],
    excludedJobTitles: profile?.autoApplyRules?.excludedJobTitles || [],
    requireApprovalForMissingSensitiveAnswers:
      profile?.autoApplyRules?.requireApprovalForMissingSensitiveAnswers !== false,
  };
}

function getRuleFlags(job: Record<string, any>, profile: ApplicationProfile | null, matchScore: number | null): {
  blockers: string[];
  hardSkips: string[];
} {
  const rules = getAutoApplyRules(profile);
  const blockers: string[] = [];
  const hardSkips: string[] = [];
  const company = normalize(job.companyName);
  const title = normalize(job.jobTitle);

  if (!rules.enabled) blockers.push("Apply Agent is not enabled");
  if (matchScore !== null && matchScore < rules.minimumMatchScore) {
    hardSkips.push(`Below ${rules.minimumMatchScore}% minimum match score`);
  }
  if (rules.excludedCompanies.some((excluded) => company.includes(normalize(excluded)))) {
    hardSkips.push("Company is excluded by auto-apply rules");
  }
  if (rules.excludedJobTitles.some((excluded) => title.includes(normalize(excluded)))) {
    hardSkips.push("Job title is excluded by auto-apply rules");
  }

  return { blockers, hardSkips };
}

function callableOptions() {
  return {
    secrets: [],
    timeoutSeconds: 120,
    memory: "512MB" as const,
  };
}

export const prepareApplicationQueueItem = functions
  .region("us-west1")
  .runWith(callableOptions())
  .https.onCall(async (data, context) => {
    const userId = requireAuth(context);
    const jobId = text(data?.jobId);
    const requestedResumeId = text(data?.resumeId) || undefined;

    if (!jobId) {
      throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    const userRef = db.collection("users").doc(userId);
    const [jobSnap, profile, resumeContext] = await Promise.all([
      userRef.collection("jobTracker").doc(jobId).get(),
      getApplicationProfile(userId),
      getResumeContext(userRef, requestedResumeId),
    ]);

    if (!jobSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Job tracker item not found");
    }

    const job = jobSnap.data() || {};
    const resumeId = requestedResumeId || text(job.resumeId) || resumeContext.resumeId || undefined;
    const applyUrl = getApplyUrl(job);
    const matchScore = getMatchScore(job, resumeId);
    const profileValidation = validateApplicationProfile(profile);
    const ruleFlags = getRuleFlags(job, profile, matchScore);
    const blockers: string[] = [...ruleFlags.blockers];

    if (!applyUrl) blockers.push("Missing apply URL");
    if (!resumeContext.exists) blockers.push("Resume not found");
    if (!profileValidation.requiredReady) {
      blockers.push(...profileValidation.missingRequiredFields.slice(0, 6).map((field) => `Missing ${field}`));
    }

    const riskFlags = [...ruleFlags.hardSkips, ...blockers];
    let status: ApplyAgentStatus = "ready";
    if (ruleFlags.hardSkips.length > 0) status = "skipped";
    else if (blockers.length > 0) status = "needs_user";

    const queueRef = userRef.collection("applicationQueue").doc(jobId);
    const queueItem = {
      id: queueRef.id,
      userId,
      jobId,
      resumeId: resumeId || null,
      jobTitle: text(job.jobTitle) || "Untitled job",
      companyName: text(job.companyName) || "Unknown company",
      applyUrl,
      atsPlatform: detectAtsPlatform(applyUrl),
      status,
      matchScore,
      riskFlags,
      answerPlan: {
        answers: [],
        missingRequiredLabels: [],
        sensitiveBlockedLabels: [],
        generatedAt: SERVER_TIMESTAMP(),
      },
      tailoredResumeId: resumeId || null,
      coverLetterId: null,
      lock: null,
      lastError: null,
      createdAt: SERVER_TIMESTAMP(),
      updatedAt: SERVER_TIMESTAMP(),
    };

    await queueRef.set(queueItem, { merge: true });
    await jobSnap.ref.set({
      applyAgentStatus: status,
      applyQueueId: queueRef.id,
      updatedAt: SERVER_TIMESTAMP(),
    }, { merge: true });

    return { success: true, queueItem: { ...queueItem, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } };
  });

async function resolveLibraryAnswers(
  userRef: FirebaseFirestore.DocumentReference,
  questions: ApplyQuestion[]
): Promise<{ libraryAnswers: ApplicationAnswerPlanItem[]; remaining: ApplyQuestion[]; matchedKeys: string[] }> {
  const libraryRef = userRef.collection("answerLibrary");
  const keys = questions.map((question) => getLabelHash(question.label));
  if (keys.length === 0) return { libraryAnswers: [], remaining: [], matchedKeys: [] };

  const snaps = await db.getAll(...keys.map((key) => libraryRef.doc(key)));
  const libraryAnswers: ApplicationAnswerPlanItem[] = [];
  const remaining: ApplyQuestion[] = [];
  const matchedKeys: string[] = [];

  questions.forEach((question, idx) => {
    const snap = snaps[idx];
    const docData = snap.exists ? snap.data() : null;
    if (docData?.answer && docData.confidence === "high") {
      libraryAnswers.push({
        label: question.label,
        answer: docData.answer,
        confidence: "high",
        source: "answer_library",
        sensitive: false,
        requiresUser: false,
        reasoning: "Retrieved from the saved Answer Library.",
      });
      matchedKeys.push(keys[idx]);
    } else {
      remaining.push(question);
    }
  });

  return { libraryAnswers, remaining, matchedKeys };
}

async function generateNarrativeAnswers(params: {
  questions: ApplyQuestion[];
  resumeContext: string;
  companyName: string;
  jobTitle: string;
  jobDescription?: string;
}): Promise<ApplicationAnswerPlanItem[]> {
  if (params.questions.length === 0) return [];

  const questionBlock = params.questions
    .map((question, index) => {
      const optionLine = question.options?.length ? `\nOptions: ${question.options.join(", ")}` : "";
      return `${index + 1}. ${question.label}${optionLine}`;
    })
    .join("\n");

  const prompt = `Generate concise job application answers using only the candidate resume context and target job context.

Do not answer sponsorship, work authorization, EEO, disability, veteran, legal, background-check, salary, relocation, remote/hybrid/on-site, or age eligibility questions. Those have already been removed and must never be inferred.

Candidate resume context:
${params.resumeContext || "(No resume context found)"}

Target job:
Company: ${params.companyName}
Role: ${params.jobTitle}
${params.jobDescription ? `Job description excerpt:\n${params.jobDescription.substring(0, 1800)}` : ""}

Questions:
${questionBlock}

Return only JSON:
[
  {
    "label": "exact label",
    "answer": "answer text",
    "confidence": "high|medium|low",
    "reasoning": "one sentence"
  }
]`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const textResponse = (response.text || "")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(textResponse) as Array<Record<string, any>>;

    return params.questions.map((question, index) => {
      const item = parsed.find((entry) => entry.label === question.label) || parsed[index] || {};
      const confidence = ["high", "medium", "low"].includes(item.confidence) ? item.confidence : "low";
      return {
        label: question.label,
        answer: text(item.answer),
        confidence,
        source: text(item.answer) ? "ai_generated" : "skipped",
        sensitive: false,
        requiresUser: !text(item.answer) || confidence === "low",
        reasoning: text(item.reasoning) || "Generated from resume and job context.",
      } as ApplicationAnswerPlanItem;
    });
  } catch (error) {
    console.error("[autoApplyAgent] Narrative answer generation failed:", error);
    return params.questions.map((question) => ({
      label: question.label,
      answer: "",
      confidence: "low",
      source: "skipped",
      sensitive: false,
      requiresUser: true,
      reasoning: "AI generation failed; user must answer manually.",
    }));
  }
}

export const resolveApplicationAnswers = functions
  .region("us-west1")
  .runWith(callableOptions())
  .https.onCall(async (data, context) => {
    const userId = requireAuth(context);
    const queueId = text(data?.queueId);
    const questions = Array.isArray(data?.questions)
      ? (data.questions as ApplyQuestion[]).filter((question) => text(question?.label))
      : [];

    if (!queueId) {
      throw new functions.https.HttpsError("invalid-argument", "queueId is required");
    }
    if (questions.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "questions array is required");
    }

    const userRef = db.collection("users").doc(userId);
    const queueRef = userRef.collection("applicationQueue").doc(queueId);
    const [queueSnap, profile] = await Promise.all([
      queueRef.get(),
      getApplicationProfile(userId),
    ]);

    if (!queueSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Application queue item not found");
    }

    const queueItem = queueSnap.data() || {};
    const resumeContext = await getResumeContext(userRef, text(queueItem.resumeId) || undefined);
    const answerItems: ApplicationAnswerPlanItem[] = [];
    const nonSensitiveWithoutExisting: ApplyQuestion[] = [];

    questions.forEach((question) => {
      const sensitive = sensitiveAnswerPlanItem(question, profile);
      if (sensitive) {
        answerItems.push(sensitive);
        return;
      }
      if (text(question.existingValue)) {
        answerItems.push({
          label: question.label,
          answer: text(question.existingValue),
          confidence: "high",
          source: "resume",
          sensitive: false,
          requiresUser: false,
          reasoning: "Resolved from structured resume/profile data.",
        });
        return;
      }
      nonSensitiveWithoutExisting.push(question);
    });

    const { libraryAnswers, remaining, matchedKeys } = await resolveLibraryAnswers(userRef, nonSensitiveWithoutExisting);
    answerItems.push(...libraryAnswers);

    const aiAnswers = await generateNarrativeAnswers({
      questions: remaining,
      resumeContext: resumeContext.context,
      companyName: text(data?.companyName) || text(queueItem.companyName),
      jobTitle: text(data?.jobTitle) || text(queueItem.jobTitle),
      jobDescription: text(data?.jobDescription),
    });
    answerItems.push(...aiAnswers);

    if (matchedKeys.length > 0) {
      const batch = db.batch();
      matchedKeys.forEach((key) => {
        batch.set(userRef.collection("answerLibrary").doc(key), {
          usageCount: admin.firestore.FieldValue.increment(1),
          updatedAt: SERVER_TIMESTAMP(),
        }, { merge: true });
      });
      await batch.commit();
    }

    const orderedAnswers = questions.map((question) => (
      answerItems.find((item) => item.label === question.label) || {
        label: question.label,
        answer: "",
        confidence: "low",
        source: "skipped",
        sensitive: isSensitiveApplicationField(question.label),
        requiresUser: true,
        reasoning: "No answer was resolved.",
      } as ApplicationAnswerPlanItem
    ));
    const missingRequiredLabels = orderedAnswers
      .filter((answer) => answer.requiresUser)
      .map((answer) => answer.label);
    const sensitiveBlockedLabels = orderedAnswers
      .filter((answer) => answer.sensitive && answer.requiresUser)
      .map((answer) => answer.label);
    const nextStatus: ApplyAgentStatus = sensitiveBlockedLabels.length > 0 ? "needs_user" : "ready";

    const answerPlan = {
      answers: orderedAnswers,
      missingRequiredLabels,
      sensitiveBlockedLabels,
      generatedAt: new Date().toISOString(),
    };

    await queueRef.set({
      answerPlan: {
        ...answerPlan,
        generatedAt: SERVER_TIMESTAMP(),
      },
      status: nextStatus,
      updatedAt: SERVER_TIMESTAMP(),
    }, { merge: true });

    return { success: true, answers: orderedAnswers, answerPlan };
  });

export const claimApplicationQueueItem = functions
  .region("us-west1")
  .runWith({ secrets: [], timeoutSeconds: 60, memory: "512MB" })
  .https.onCall(async (data, context) => {
    const userId = requireAuth(context);
    const queueId = text(data?.queueId);
    const executorId = text(data?.executorId);
    const executorType = data?.executorType === "desktop" ? "desktop" : "extension";

    if (!queueId || !executorId) {
      throw new functions.https.HttpsError("invalid-argument", "queueId and executorId are required");
    }

    const queueRef = db.collection("users").doc(userId).collection("applicationQueue").doc(queueId);
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);
    let claimedItem: Record<string, any> | null = null;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(queueRef);
      if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", "Application queue item not found");
      }

      const item = snap.data() || {};
      const currentStatus = item.status as ApplyAgentStatus;
      const lock = item.lock || null;
      const lockExpiresAt = lock?.expiresAt?.toMillis ? lock.expiresAt.toMillis() : 0;
      const lockIsActive = lock?.executorId && lock.executorId !== executorId && lockExpiresAt > Date.now();

      if (lockIsActive) {
        throw new functions.https.HttpsError("failed-precondition", "Queue item is already claimed");
      }
      if (!["ready", "approved", "running"].includes(currentStatus)) {
        throw new functions.https.HttpsError("failed-precondition", `Queue item is not runnable: ${currentStatus}`);
      }

      const update = {
        status: "running" as ApplyAgentStatus,
        lock: { executorId, executorType, expiresAt },
        updatedAt: SERVER_TIMESTAMP(),
      };
      tx.set(queueRef, update, { merge: true });
      claimedItem = { id: snap.id, ...item, ...update, updatedAt: new Date().toISOString() };
    });

    return { success: true, queueItem: claimedItem };
  });

export const reportApplicationRunStep = functions
  .region("us-west1")
  .runWith({ secrets: [], timeoutSeconds: 60, memory: "512MB" })
  .https.onCall(async (data, context) => {
    const userId = requireAuth(context);
    const queueId = text(data?.queueId);
    const step = data?.step || {};

    if (!queueId || !text(step.type) || !text(step.status)) {
      throw new functions.https.HttpsError("invalid-argument", "queueId and step type/status are required");
    }

    const userRef = db.collection("users").doc(userId);
    const queueSnap = await userRef.collection("applicationQueue").doc(queueId).get();
    if (!queueSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Application queue item not found");
    }

    const queueItem = queueSnap.data() || {};
    const runRef = text(data?.runId)
      ? userRef.collection("applicationRuns").doc(text(data.runId))
      : userRef.collection("applicationRuns").doc();
    const stepRef = runRef.collection("steps").doc();
    const normalizedStep = {
      type: text(step.type),
      label: text(step.label) || null,
      value: text(step.value) || null,
      status: text(step.status),
      message: text(step.message) || null,
      screenshotUrl: text(step.screenshotUrl) || null,
      createdAt: SERVER_TIMESTAMP(),
    };

    await db.runTransaction(async (tx) => {
      tx.set(runRef, {
        id: runRef.id,
        queueId,
        jobId: queueItem.jobId || null,
        userId,
        executor: queueItem.lock?.executorType || "extension",
        status: queueItem.status || "running",
        applyUrl: queueItem.applyUrl || "",
        atsPlatform: queueItem.atsPlatform || null,
        lastStep: normalizedStep,
        createdAt: SERVER_TIMESTAMP(),
        updatedAt: SERVER_TIMESTAMP(),
      }, { merge: true });
      tx.set(stepRef, normalizedStep);
      tx.set(userRef.collection("applicationQueue").doc(queueId), {
        updatedAt: SERVER_TIMESTAMP(),
      }, { merge: true });
    });

    return { success: true, runId: runRef.id };
  });

export const completeApplicationRun = functions
  .region("us-west1")
  .runWith({ secrets: [], timeoutSeconds: 60, memory: "512MB" })
  .https.onCall(async (data, context) => {
    const userId = requireAuth(context);
    const queueId = text(data?.queueId);
    const status = text(data?.status) as ApplyAgentStatus;
    const allowedStatuses: ApplyAgentStatus[] = ["submitted", "failed", "needs_user", "skipped"];

    if (!queueId || !allowedStatuses.includes(status)) {
      throw new functions.https.HttpsError("invalid-argument", "queueId and final status are required");
    }

    const userRef = db.collection("users").doc(userId);
    const queueRef = userRef.collection("applicationQueue").doc(queueId);
    const queueSnap = await queueRef.get();
    if (!queueSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Application queue item not found");
    }

    const queueItem = queueSnap.data() || {};
    const runRef = text(data?.runId)
      ? userRef.collection("applicationRuns").doc(text(data.runId))
      : userRef.collection("applicationRuns").doc();
    const batch = db.batch();
    const submittedAt = status === "submitted" ? SERVER_TIMESTAMP() : null;

    batch.set(queueRef, {
      status,
      lock: null,
      lastError: text(data?.error) || null,
      updatedAt: SERVER_TIMESTAMP(),
    }, { merge: true });
    batch.set(runRef, {
      id: runRef.id,
      queueId,
      jobId: queueItem.jobId || null,
      userId,
      executor: queueItem.lock?.executorType || "extension",
      status,
      applyUrl: queueItem.applyUrl || "",
      atsPlatform: queueItem.atsPlatform || null,
      confirmationText: text(data?.confirmationText) || null,
      lastError: text(data?.error) || null,
      submittedAt,
      createdAt: SERVER_TIMESTAMP(),
      updatedAt: SERVER_TIMESTAMP(),
    }, { merge: true });

    if (status === "submitted" && queueItem.jobId) {
      batch.set(userRef.collection("jobTracker").doc(queueItem.jobId), {
        applicationStatus: "Applied",
        applyAgentStatus: "submitted",
        dateApplied: SERVER_TIMESTAMP(),
        updatedAt: SERVER_TIMESTAMP(),
      }, { merge: true });
    }

    await batch.commit();
    return { success: true, runId: runRef.id };
  });
