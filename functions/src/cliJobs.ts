/**
 * CLI Jobs API — Backend for `cv jobs hunt` and `cv jobs update`
 *
 * Authentication: x-api-key header (same pattern as verifyAuth / publishPost)
 * Firestore path: users/{uid}/jobTracker  (ApplicationStatus type)
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

import { getAIClient } from "./utils/ai";
import { secureCorsHandler } from "./utils/corsUtils.js";
import { resolveAuth } from "./utils/authUtils.js";
import { findValidatedScrapedJobMatches, type ValidatedScrapedJobMatch } from "./scrapedJobs";
import { createResumeFromBaseContent } from "./resumeGeneration";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const corsHandler = secureCorsHandler;

// ── Types ─────────────────────────────────────────────────────────────────────

type ApplicationStatus = "To Apply" | "Applied" | "Interviewing" | "Offered" | "Rejected";

interface RawJob {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    url: string;
    salary?: string;
}

interface ScoredJob extends RawJob {
    score: number;   // 0–100
    scoreLabel: "Excellent" | "Good" | "Fair" | "Low";
    aiSummary: string;
    missingSkills: string[];
}

interface JobTrackerEntry {
    id: string;
    jobTitle: string;
    companyName: string;
    location: string;
    jobPostURL: string;
    jobDescription: string;
    applicationStatus: ApplicationStatus;
    createdAt: admin.firestore.FieldValue;
    updatedAt: admin.firestore.FieldValue;
    portalSource: string;
    aiScore?: number;
    aiSummary?: string;
    userId: string;
    dateSaved?: string;
}

// ── Auth Helper ───────────────────────────────────────────────────────────────
// Auth logic moved to shared utils/authUtils.js

// ──────────────────────────────────────────────────────────────────────────────
// POST /cliJobsHunt
// Body: { resumeContent: string, role: string, location: string, count?: number, minScore?: number }
// Returns: { jobs: ScoredJob[] }
// ──────────────────────────────────────────────────────────────────────────────

export const cliJobsHunt = functions.region("us-west1").runWith({
    timeoutSeconds: 120,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized. Invalid API key or missing authentication." }); return; }

        const { resumeContent, role = "", location = "", count = 10, minScore = 0, targetOrgs } = req.body as {
            resumeContent?: string;
            role?: string;
            location?: string;
            count?: number;
            minScore?: number;
            targetOrgs?: string[];
        };

        try {
            const jobs = await findValidatedScrapedJobMatches({
                resumeContent,
                role,
                location,
                count,
                minScore,
                targetOrgs,
            });

            // Save to user's jobSearchHistory (async). These records are safe to
            // reuse because the URL is the validated ATS final URL, not AI output.
            const historyBatch = db.batch();
            jobs.forEach((job: ValidatedScrapedJobMatch) => {
                const ref = db.collection("users").doc(user.uid).collection("jobSearchHistory").doc(job.id);
                historyBatch.set(ref, {
                    ...job,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    searchedAt: FieldValue.serverTimestamp(),
                    source: "cli_validated_scraped_feed",
                    portalSource: "cli_validated_scraped_feed",
                }, { merge: true });
            });
            if (jobs.length > 0) {
                historyBatch.commit().catch(e => console.warn("[cliJobsHunt] History save failed:", e));
            }

            console.log(`[cliJobsHunt] User ${user.uid} — returned ${jobs.length} validated scraped jobs for "${role}"`);
            res.json({
                jobs,
                total: jobs.length,
                source: "validated_scraped_feed",
                message: jobs.length
                    ? "Showing validated ATS listings only. Each URL was checked before being returned."
                    : "No validated jobs matched this search yet. Broaden the role/location or refresh the scraped jobs feed.",
            });

        } catch (err: any) {
            console.error("[cliJobsHunt] Validated scraped job search failed:", err.message);
            res.status(500).json({ error: `Validated job search failed: ${err.message}` });
            return;
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /cliJobsCreate
// Body: { jobTitle, companyName, location, jobPostURL, jobDescription, aiScore?, aiSummary? }
// Returns: { id, success }
// ──────────────────────────────────────────────────────────────────────────────

export const cliJobsCreate = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized. Invalid API key or missing authentication." }); return; }

        const {
            jobTitle,
            companyName,
            location = "",
            jobPostURL = "",
            jobDescription = "",
            aiScore,
            aiSummary,
            notes = "",
        } = req.body as {
            jobTitle?: string;
            companyName?: string;
            location?: string;
            jobPostURL?: string;
            jobDescription?: string;
            aiScore?: number;
            aiSummary?: string;
            notes?: string;
        };

        if (!jobTitle || !companyName) {
            res.status(400).json({ error: "jobTitle and companyName are required." });
            return;
        }

        const entry: Omit<JobTrackerEntry, "id"> = {
            jobTitle,
            companyName,
            location,
            jobPostURL,
            jobDescription,
            applicationStatus: "To Apply",
            portalSource: "cli_hunt",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            userId: user.uid,
            dateSaved: new Date().toISOString().split("T")[0],
            ...(aiScore !== undefined && { aiScore }),
            ...(aiSummary && { aiSummary }),
            ...(notes && { notes }),
        };

        try {
            const ref = await db.collection("users").doc(user.uid).collection("jobTracker").add(entry);
            console.log(`[cliJobsCreate] User ${user.uid} — created job tracker entry ${ref.id}: ${jobTitle} @ ${companyName}`);
            res.json({ success: true, id: ref.id, message: `Added "${jobTitle}" at ${companyName} to your tracker.` });
        } catch (err: any) {
            console.error("[cliJobsCreate] Error:", err.message);
            res.status(500).json({ error: `Failed to create job entry: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /cliJobsUpdate
// Body: { jobId, status: ApplicationStatus, notes? }
// Returns: { success, jobId, newStatus }
// ──────────────────────────────────────────────────────────────────────────────

const VALID_STATUSES: ApplicationStatus[] = ["To Apply", "Applied", "Interviewing", "Offered", "Rejected"];

export const cliJobsUpdate = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "POST" && req.method !== "PATCH") {
            res.status(405).json({ error: "Method Not Allowed" });
            return;
        }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized. Invalid API key or missing authentication." }); return; }

        const { jobId, status, notes } = req.body as {
            jobId?: string;
            status?: string;
            notes?: string;
        };

        if (!jobId || !status) {
            res.status(400).json({ error: "jobId and status are required." });
            return;
        }

        if (!VALID_STATUSES.includes(status as ApplicationStatus)) {
            res.status(400).json({ error: `Invalid status. Valid values: ${VALID_STATUSES.join(", ")}` });
            return;
        }

        try {
            const docRef = db.collection("users").doc(user.uid).collection("jobTracker").doc(jobId);
            const snap = await docRef.get();

            if (!snap.exists) {
                res.status(404).json({ error: `Job ${jobId} not found in your tracker.` });
                return;
            }

            const updateData: Record<string, any> = {
                applicationStatus: status as ApplicationStatus,
                updatedAt: FieldValue.serverTimestamp(),
            };

            if (notes) updateData.notes = notes;

            await docRef.update(updateData);

            const jobData = snap.data();
            console.log(`[cliJobsUpdate] User ${user.uid} — updated ${jobId} status to "${status}"`);
            res.json({
                success: true,
                jobId,
                newStatus: status,
                jobTitle: jobData?.jobTitle || "Unknown",
                companyName: jobData?.companyName || "Unknown",
                message: `Updated "${jobData?.jobTitle || jobId}" → ${status}`,
            });
        } catch (err: any) {
            console.error("[cliJobsUpdate] Error:", err.message);
            res.status(500).json({ error: `Failed to update job: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /cliJobsList
// Query: ?status=Applied (optional filter)
// Returns: { jobs: [{ id, jobTitle, companyName, applicationStatus, location, updatedAt }] }
// ──────────────────────────────────────────────────────────────────────────────

export const cliJobsList = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "GET") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized. Invalid API key or missing authentication." }); return; }

        const statusFilter = req.query.status as string | undefined;
        const PAGE_LIMIT = 50;

        try {
            let query: admin.firestore.Query = db
                .collection("users").doc(user.uid)
                .collection("jobTracker")
                .orderBy("updatedAt", "desc")
                .limit(PAGE_LIMIT);

            if (statusFilter && VALID_STATUSES.includes(statusFilter as ApplicationStatus)) {
                query = db.collection("users").doc(user.uid)
                    .collection("jobTracker")
                    .where("applicationStatus", "==", statusFilter)
                    .orderBy("updatedAt", "desc")
                    .limit(PAGE_LIMIT);
            }

            const snap = await query.get();
            const jobs = snap.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    jobTitle: d.jobTitle || "Unknown",
                    companyName: d.companyName || "Unknown",
                    location: d.location || "",
                    applicationStatus: d.applicationStatus || "To Apply",
                    aiScore: d.aiScore ?? null,
                    jobPostURL: d.jobPostURL || "",
                    updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
                    notes: d.notes || "",
                };
            });

            // `total` used to be jobs.length, which is capped by the limit above —
            // a tracker with 200 entries reported "50 total". Report the page size
            // and say plainly whether more exist.
            res.json({
                jobs,
                total: jobs.length,
                limit: PAGE_LIMIT,
                hasMore: jobs.length === PAGE_LIMIT,
            });
        } catch (err: any) {
            console.error("[cliJobsList] Error:", err.message);
            res.status(500).json({ error: `Failed to list jobs: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /cliResumeGet
// Returns the latest resume markdown from users/{uid}/resumes (cvMarkdown field)
// ──────────────────────────────────────────────────────────────────────────────

export const cliResumeGet = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "GET") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized. Invalid API key or missing authentication." }); return; }

        // Optional: ?resumeId=<docId> to pick a specific resume
        const resumeId = req.query.resumeId as string | undefined;

        try {
            let resumeDoc: admin.firestore.DocumentSnapshot | null = null;

            if (resumeId) {
                resumeDoc = await db.collection("users").doc(user.uid).collection("resumes").doc(resumeId).get();
            } else {
                // Get most recently updated resume
                const snap = await db.collection("users").doc(user.uid)
                    .collection("resumes")
                    .orderBy("updatedAt", "desc")
                    .limit(1)
                    .get();
                resumeDoc = snap.empty ? null : snap.docs[0];
            }

            if (!resumeDoc || !resumeDoc.exists) {
                res.status(404).json({ error: "No resume found. Please upload one to CareerVivid first." });
                return;
            }

            const data = resumeDoc.data()!;

            // Build text representation from structured resume data
            const personal = data.personalDetails || {};
            const name = `${personal.firstName || ""}${personal.lastName ? " " + personal.lastName : ""}`.trim();
            const jobTitle = personal.jobTitle || "";

            const lines: string[] = [];
            if (name) lines.push(`# ${name}`);
            if (jobTitle) lines.push(jobTitle);
            if (personal.email) lines.push(`Email: ${personal.email}`);
            if (personal.city) lines.push(`Location: ${personal.city}${personal.country ? ", " + personal.country : ""}`);

            if (data.sections) {
                for (const section of data.sections) {
                    if (!section?.title) continue;
                    lines.push(`\n## ${section.title}`);
                    lines.push(section.content || section.description || "");
                }
            }

            // Skills
            if (Array.isArray(data.skills) && data.skills.length > 0) {
                lines.push("\n## Skills");
                lines.push(data.skills.map((s: any) => s.name || s).join(", "));
            }

            // Employment
            if (Array.isArray(data.employmentHistory) && data.employmentHistory.length > 0) {
                lines.push("\n## Experience");
                for (const job of data.employmentHistory) {
                    lines.push(`**${job.jobTitle || ""}** at ${job.employer || ""} (${job.startDate || ""}–${job.endDate || "Present"})`);
                    if (job.description) lines.push(job.description);
                }
            }

            // Education
            if (Array.isArray(data.education) && data.education.length > 0) {
                lines.push("\n## Education");
                for (const edu of data.education) {
                    lines.push(`${edu.degree || ""} — ${edu.school || ""} (${edu.endDate || ""})`);
                }
            }

            const cvMarkdown = lines.join("\n");

            res.json({
                resumeId: resumeDoc.id,
                title: data.title || `${name}'s Resume`,
                cvMarkdown,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
            });

        } catch (err: any) {
            console.error("[cliResumeGet] Error:", err.message);
            res.status(500).json({ error: `Failed to fetch resume: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /cliResumesList
// Returns a lightweight list of the user's resumes (id, title, updatedAt)
// ──────────────────────────────────────────────────────────────────────────────

export const cliResumesList = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "GET") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized. Invalid API key or missing authentication." }); return; }

        try {
            const snap = await db.collection("users").doc(user.uid)
                .collection("resumes")
                .select("title", "updatedAt") // Only fetch lightweight fields
                .orderBy("updatedAt", "desc")
                .limit(50)
                .get();

            const resumes = snap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || "Untitled Resume",
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
                };
            });

            res.json({ resumes, total: resumes.length });
        } catch (err: any) {
            console.error("[cliResumesList] Error:", err.message);
            res.status(500).json({ error: `Failed to list resumes: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /cliResumeCreate
// Body: { title?: string, baseContent: string }
// Generates a structured Resume JSON from free-form text and saves it.
// ──────────────────────────────────────────────────────────────────────────────

export const cliResumeCreate = functions.region("us-west1").runWith({
    secrets: [],
    timeoutSeconds: 60,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized." }); return; }

        const { title = "CLI Generated Resume", baseContent } = req.body as { title?: string, baseContent: string };
        if (!baseContent) { res.status(400).json({ error: "baseContent is required to generate a resume." }); return; }

        try {
            const result = await createResumeFromBaseContent({
                uid: user.uid,
                title,
                baseContent,
                creationSource: "cli",
            });
            res.json({ success: true, resumeId: result.resumeId, message: "Resume generated successfully." });
        } catch (err: any) {
            console.error("[cliResumeCreate] Error:", err.message);
            res.status(500).json({ error: `Generation failed: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /cliResumeUpdate
// Body: { resumeId: string, action: 'tailor'|'refine', jobDescription?: string, instruction?: string, newTitle?: string }
// Applies AI tailoring to an existing resume and optionally saves as a new copy.
// ──────────────────────────────────────────────────────────────────────────────

export const cliResumeUpdate = functions.region("us-west1").runWith({
    secrets: [],
    timeoutSeconds: 120,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized." }); return; }

        const { resumeId, action = 'tailor', jobDescription, instruction, newTitle, copy = true } = req.body as { resumeId: string, action?: 'tailor'|'refine', jobDescription?: string, instruction?: string, newTitle?: string, copy?: boolean };
        
        if (!resumeId) { res.status(400).json({ error: "resumeId is required." }); return; }

        try {
            const docRef = db.collection("users").doc(user.uid).collection("resumes").doc(resumeId);
            const snap = await docRef.get();
            if (!snap.exists) { res.status(404).json({ error: "Resume not found." }); return; }
            
            const resumeJson = snap.data()!;
            let prompt = "";

            const jobDescContext = jobDescription ? `JOB DESCRIPTION CONTEXT:\n${jobDescription}` : '';
            if (action === 'refine') {
                prompt = `You are a resume writing assistant. REFINE this resume JSON per instructions.
INSTRUCTION: ${instruction || 'Improve phrasing and grammar'}
${jobDescContext}
CURRENT RESUME JSON:
${JSON.stringify(resumeJson)}`;
            } else {
                prompt = `You are an expert resume writer. REWRITE the experience descriptions and summary in this resume JSON to align with the given Job Description.
TARGET JOB DESCRIPTION:
${jobDescription || 'Make it sound professional.'}
CURRENT RESUME JSON:
${JSON.stringify(resumeJson)}`;
            }
            prompt += `\nRETURN ONLY VALID JSON mirroring the current resume structure exactly, applying the refinements requested.`;

            const ai = getAIClient();
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
            const cleaned = (response.text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
            const tailoredData = JSON.parse(cleaned);

            tailoredData.updatedAt = FieldValue.serverTimestamp();
            if (newTitle) { tailoredData.title = newTitle; }
            
            if (copy) {
                tailoredData.createdAt = FieldValue.serverTimestamp();
                const newRef = await db.collection("users").doc(user.uid).collection("resumes").add(tailoredData);
                res.json({ success: true, resumeId: newRef.id, message: "Tailored resume created successfully." });
            } else {
                await docRef.update(tailoredData);
                res.json({ success: true, resumeId: docRef.id, message: "Resume updated successfully." });
            }
        } catch (err: any) {
            console.error("[cliResumeUpdate] Error:", err.message);
            res.status(500).json({ error: `Update failed: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /cliResumeDelete
// Body: { resumeId: string }
// ──────────────────────────────────────────────────────────────────────────────

export const cliResumeDelete = functions.region("us-west1").runWith({
    timeoutSeconds: 15,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "POST" && req.method !== "DELETE") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized." }); return; }

        const { resumeId } = req.body as { resumeId: string };
        if (!resumeId) { res.status(400).json({ error: "resumeId is required." }); return; }

        try {
            await db.collection("users").doc(user.uid).collection("resumes").doc(resumeId).delete();
            res.json({ success: true, message: "Resume deleted successfully." });
        } catch (err: any) {
            console.error("[cliResumeDelete] Error:", err.message);
            res.status(500).json({ error: `Delete failed: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /cliCoverLetterCreate
// Body: { resumeId: string, jobTitle: string, companyName: string, jobDescription: string }
// Generates and saves a cover letter.
// ──────────────────────────────────────────────────────────────────────────────

export const cliCoverLetterCreate = functions.region("us-west1").runWith({
    secrets: [],
    timeoutSeconds: 60,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized." }); return; }

        const { resumeId, jobTitle = "Untitled Position", companyName = "Unknown Company", jobDescription } = req.body as { resumeId: string, jobTitle?: string, companyName?: string, jobDescription: string };
        if (!resumeId || !jobDescription) { res.status(400).json({ error: "resumeId and jobDescription are required." }); return; }

        try {
            const resumeDoc = await db.collection("users").doc(user.uid).collection("resumes").doc(resumeId).get();
            if (!resumeDoc.exists) { res.status(404).json({ error: "Resume not found" }); return; }

            const resumeData = resumeDoc.data()!;
            const contact = resumeData.personalDetails;
            const work = resumeData.employmentHistory || [];
            const skills = resumeData.skills || [];

            const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || '[Your Name]';
            const email = contact?.email || '[Your Email Address]';
            const phone = contact?.phone || '[Your Phone Number]';
            const location = contact?.city ? `${contact.city}${contact.state ? ', ' + contact.state : ''}` : '[Your City, State]';

            const socialLinks = contact?.socialLinks || [];
            const linkedInLink = socialLinks.find((link: any) => link.label?.toLowerCase().includes('linkedin') || link.url?.toLowerCase().includes('linkedin'));
            const linkedIn = linkedInLink?.url || '[Your LinkedIn Profile URL]';

            const prompt = `You are an expert career coach and professional resume writer.
Write a compelling, professional cover letter for ${fullName}.

THE JOB:
Role: ${jobTitle}
Company: ${companyName}
Description: ${jobDescription.substring(0, 3000)}

THE CANDIDATE'S CONTACT INFO (use these EXACT values in the header):
- Full Name: ${fullName}
- Location: ${location}
- Phone: ${phone}
- Email: ${email}
- LinkedIn: ${linkedIn}

THE CANDIDATE'S PROFILE:
- Current Role: ${contact?.jobTitle || 'Professional'}
- Key Skills: ${skills.map((s: any) => s.name || s).join(", ")}
- Experience Highlights: ${work.map((w: any) => `${w.jobTitle} at ${w.employer}`).join("; ")}
- Summary: ${resumeData.professionalSummary || ''}

INSTRUCTIONS:
1. Use a professional, confident tone.
2. Tailor strictly to the "${jobTitle}" role at "${companyName}".
3. Highlight relevant skills and experience matching the job description.
4. Address to "Hiring Manager" at ${companyName} if no name is provided.
5. Format nicely with paragraphs.
6. CRITICAL: Use the candidate's REAL contact info from above in the header.
7. Keep it under 400 words.
8. CRITICAL: Do NOT invent fake experiences, companies, or dates. Only use facts from the candidate's profile.`;

            const ai = getAIClient();
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
            const generatedText = response.text || "";

            const coverLetterRef = db.collection("users").doc(user.uid).collection("coverLetters").doc();
            const coverLetter = {
                id: coverLetterRef.id,
                userId: user.uid,
                resumeId,
                jobTitle,
                companyName,
                jobDescription,
                content: generatedText,
                createdAt: FieldValue.serverTimestamp(),
            };

            await coverLetterRef.set(coverLetter);

            res.json({ success: true, coverLetter });
        } catch (err: any) {
            console.error("[cliCoverLetterCreate] Error:", err.message);
            res.status(500).json({ error: `Generation failed: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /cliCoverLettersList
// Returns lightweight list of user's cover letters
// ──────────────────────────────────────────────────────────────────────────────

export const cliCoverLettersList = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "GET") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized." }); return; }

        const jobId = req.query.jobId as string | undefined;

        try {
            let query = db.collection("users").doc(user.uid).collection("coverLetters").orderBy("createdAt", "desc").limit(50);
            if (jobId) {
                query = db.collection("users").doc(user.uid).collection("coverLetters").where("jobId", "==", jobId).orderBy("createdAt", "desc").limit(50);
            }

            const snap = await query.get();
            const coverLetters = snap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    jobTitle: data.jobTitle || "Untitled",
                    companyName: data.companyName || "Unknown",
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                };
            });

            res.json({ coverLetters, total: coverLetters.length });
        } catch (err: any) {
            console.error("[cliCoverLettersList] Error:", err.message);
            res.status(500).json({ error: `Failed to list cover letters: ${err.message}` });
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /cliJobsDelete
// Body: { jobId: string }
// ──────────────────────────────────────────────────────────────────────────────

export const cliJobsDelete = functions.region("us-west1").runWith({
    timeoutSeconds: 15,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST" && req.method !== "DELETE") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized." }); return; }

        const { jobId } = req.body as { jobId: string };
        if (!jobId) { res.status(400).json({ error: "jobId is required." }); return; }

        try {
            await db.collection("users").doc(user.uid).collection("jobTracker").doc(jobId).delete();
            res.json({ success: true, message: "Job entry deleted successfully." });
        } catch (err: any) {
            console.error("[cliJobsDelete] Error:", err.message);
            res.status(500).json({ error: `Delete failed: ${err.message}` });
        }
    });
});
