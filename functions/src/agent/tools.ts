/**
 * Career Agent tool registry.
 *
 * Every tool is a narrow, server-side operation scoped to the calling uid.
 * The model requests; the application executes. There is deliberately no
 * "run a query" or "read a document" tool — a general data-access tool is
 * indistinguishable from unrestricted database access once the model can
 * choose its arguments.
 *
 * Read tools run inline during the loop. Write tools produce a proposal and
 * execute only after the user approves (see ./types.ts).
 *
 * Adding a tool: define it here, add it to REGISTRY. Nothing else changes —
 * the loop, the approval flow, and billing are all driven off these fields.
 */

import * as admin from "firebase-admin";
import { type AgentTool, type ToolContext } from "./types";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const APPLICATION_STATUSES = ["To Apply", "Applied", "Interviewing", "Offered", "Rejected"] as const;
type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Must match `Skill['level']` in src/types.ts — it is a closed union, not free text. */
const SKILL_LEVELS = ["Novice", "Intermediate", "Advanced", "Expert"] as const;

/**
 * Accepts either `["React", "Go"]` or `[{name, level}]`.
 *
 * The model reaches for a bare string array often enough that rejecting it
 * wastes a whole turn on a retry, so normalise instead — defaulting the level
 * rather than writing an empty string the editor's select cannot render.
 */
const normalizeSkills = (raw: unknown): Array<{ id: string; name: string; level: string }> => {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 40).flatMap((s, i) => {
        const name = typeof s === "string" ? s.trim() : String((s as any)?.name ?? "").trim();
        if (!name) return [];
        const level = String((s as any)?.level ?? "");
        return [{
            id: `s${i}`,
            name: name.slice(0, 80),
            level: (SKILL_LEVELS as readonly string[]).includes(level) ? level : "Intermediate",
        }];
    });
};

const S = (v: unknown, field: string, max = 2_000): string => {
    if (typeof v !== "string" || !v.trim()) throw new Error(`${field} is required.`);
    return v.trim().slice(0, max);
};
const optS = (v: unknown, max = 2_000): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

const userRef = (uid: string) => db.collection("users").doc(uid);

/**
 * Routes the agent may send a user to.
 *
 * Checked against the real switch in src/App.tsx. An allowlist rather than a
 * "starts with /" check because the model will confidently invent plausible
 * paths — it emitted /jobtracker for a route that is actually /job-tracker —
 * and a bad path lands the user on a blank page with no error to explain it.
 *
 * Adding a route here is the deliberate act of exposing it to the agent.
 */
const NAV_ROUTES: ReadonlySet<string> = new Set([
    "/dashboard",
    "/job-tracker",
    // NOT "/jobs" or "/quest": App.tsx matches those only with a further
    // segment (path.startsWith('/jobs/')), so the bare path renders nothing.
    "/job-market",
    "/newresume",
    "/interview-studio",
    "/learning",
    "/community",
    "/quick-start",
    "/portfolio",
    "/profile",
    "/subscription",
    "/pricing",
]);

/** Routes carrying an id, e.g. /edit/{resumeId}. */
const NAV_PREFIXES: readonly string[] = ["/edit/", "/quest/", "/learning/", "/jobs/"];

const isNavigableRoute = (route: string): boolean => {
    const path = route.split("?")[0].replace(/\/$/, "") || "/";
    return NAV_ROUTES.has(path) || NAV_PREFIXES.some((p) => path.startsWith(p) && path.length > p.length);
};



/**
 * The user's application tracker.
 *
 * NOT the top-level `jobApplications` collection — that is the B2B/HR side
 * (`JobApplication` in src/types.ts, gated on `applicantUserId`, written only by
 * applicationService.ts). The tracker the user actually sees is this
 * subcollection: src/hooks/useJobTracker.ts subscribes to it, and every other
 * server writer agrees (cliJobs.ts, careerOps.ts, lifecycleEmails.ts).
 *
 * Scoping by path also makes ownership structural rather than a field check.
 */
const jobTrackerCol = (uid: string) => db.collection("users").doc(uid).collection("jobTracker");

// ═════════════════════════════════════════════════════════════════════════════
// Phase 1 — Onboarding: profile, resume creation, navigation
// ═════════════════════════════════════════════════════════════════════════════

const getCareerProfile: AgentTool = {
    name: "getCareerProfile",
    description:
        "Read the user's saved career profile: master CV, target role archetypes, target locations, and salary band. Call before recommending roles or drafting a resume.",
    parameters: { type: "object", properties: {} },
    phase: 1,
    risk: "read",
    writes: false,
    execute: async (ctx) => {
        const snap = await userRef(ctx.uid).collection("careerProfile").doc("profile").get();
        if (!snap.exists) return { hasProfile: false };
        const p = snap.data()!;
        return {
            hasProfile: true,
            cvMarkdown: String(p.cvMarkdown ?? "").slice(0, 8_000),
            targetArchetypes: p.targetArchetypes ?? [],
            targetLocations: p.targetLocations ?? [],
            targetSalaryMin: p.targetSalaryMin,
            targetSalaryMax: p.targetSalaryMax,
        };
    },
};

const updateCareerProfile: AgentTool = {
    name: "updateCareerProfile",
    description:
        "Save or update the user's structured career profile. Use after gathering target roles, locations, seniority, and salary expectations in conversation.",
    parameters: {
        type: "object",
        properties: {
            cvMarkdown: { type: "string", description: "Master CV as markdown." },
            targetArchetypes: {
                type: "array",
                items: { type: "string" },
                description: 'Target role families, e.g. ["AI Platform / LLMOps", "Solutions Architect"].',
            },
            targetLocations: { type: "array", items: { type: "string" } },
            targetSalaryMin: { type: "number" },
            targetSalaryMax: { type: "number" },
        },
    },
    phase: 1,
    risk: "low_write",
    writes: true,
    validate: (a) => ({
        cvMarkdown: optS(a.cvMarkdown, 40_000),
        targetArchetypes: Array.isArray(a.targetArchetypes) ? a.targetArchetypes.slice(0, 8).map(String) : undefined,
        targetLocations: Array.isArray(a.targetLocations) ? a.targetLocations.slice(0, 10).map(String) : undefined,
        targetSalaryMin: typeof a.targetSalaryMin === "number" ? a.targetSalaryMin : undefined,
        targetSalaryMax: typeof a.targetSalaryMax === "number" ? a.targetSalaryMax : undefined,
    }),
    summarize: () => "Update your career profile",
    execute: async (ctx, a) => {
        const clean = Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined));
        await userRef(ctx.uid)
            .collection("careerProfile")
            .doc("profile")
            .set({ ...clean, uid: ctx.uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return { saved: true, fields: Object.keys(clean) };
    },
};

const analyzeResume: AgentTool = {
    name: "analyzeResume",
    description:
        "Analyze one of the user's resumes for completeness, ATS readiness, and gaps against their target roles. Read-only.",
    parameters: {
        type: "object",
        properties: { resumeId: { type: "string", description: "Resume to analyze. Omit for the most recent." } },
    },
    phase: 1,
    risk: "read",
    writes: false,
    action: "resume.analyze",
    execute: async (ctx, a) => {
        const col = userRef(ctx.uid).collection("resumes");
        const snap = a.resumeId
            ? await col.doc(String(a.resumeId)).get()
            : (await col.orderBy("updatedAt", "desc").limit(1).get()).docs[0];
        if (!snap || !("exists" in snap ? snap.exists : false)) throw new Error("No resume found.");

        const r: any = snap.data();
        const missing: string[] = [];
        if (!r.professionalSummary?.trim()) missing.push("professional summary");
        if (!r.skills?.length) missing.push("skills");
        if (!r.employmentHistory?.length) missing.push("employment history");
        if (!r.education?.length) missing.push("education");
        if (!r.personalDetails?.email) missing.push("contact email");

        const bullets = (r.employmentHistory ?? []).flatMap((e: any) =>
            String(e.description ?? "").split("\n").filter((l: string) => l.trim()),
        );
        const quantified = bullets.filter((b: string) => /\d/.test(b)).length;

        return {
            resumeId: snap.id,
            title: r.title,
            missingSections: missing,
            employmentCount: r.employmentHistory?.length ?? 0,
            skillCount: r.skills?.length ?? 0,
            bulletCount: bullets.length,
            quantifiedBullets: quantified,
            quantifiedRatio: bullets.length ? Math.round((quantified / bullets.length) * 100) : 0,
        };
    },
};

const createResumeDraft: AgentTool = {
    name: "createResumeDraft",
    description:
        "Create a new resume for the user. Gather the details in conversation first — only call this once you have at least their name, contact email, and one role. The user must approve before it is saved.",
    parameters: {
        type: "object",
        properties: {
            title: { type: "string", description: 'Resume name, e.g. "Backend Engineer — 2026".' },
            firstName: { type: "string" },
            lastName: { type: "string" },
            jobTitle: { type: "string", description: "Headline role, e.g. 'Senior Backend Engineer'." },
            email: { type: "string" },
            phone: { type: "string" },
            city: { type: "string" },
            country: { type: "string" },
            professionalSummary: { type: "string" },
            skills: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        level: { type: "string", enum: [...SKILL_LEVELS] },
                    },
                },
            },
            employmentHistory: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        jobTitle: { type: "string" },
                        employer: { type: "string" },
                        city: { type: "string" },
                        startDate: { type: "string" },
                        endDate: { type: "string" },
                        description: { type: "string" },
                    },
                },
            },
            education: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        school: { type: "string" },
                        degree: { type: "string" },
                        city: { type: "string" },
                        startDate: { type: "string" },
                        endDate: { type: "string" },
                    },
                },
            },
        },
        required: ["title", "firstName", "email"],
    },
    phase: 1,
    risk: "high_write",
    writes: true,
    action: "resume.generate",
    validate: (a) => ({
        title: S(a.title, "title", 120),
        firstName: S(a.firstName, "firstName", 80),
        lastName: optS(a.lastName, 80) ?? "",
        jobTitle: optS(a.jobTitle, 120) ?? "",
        email: S(a.email, "email", 200),
        phone: optS(a.phone, 60) ?? "",
        city: optS(a.city, 120) ?? "",
        country: optS(a.country, 120) ?? "",
        professionalSummary: optS(a.professionalSummary, 3_000) ?? "",
        skills: normalizeSkills(a.skills),
        employmentHistory: Array.isArray(a.employmentHistory) ? a.employmentHistory.slice(0, 15) : [],
        education: Array.isArray(a.education) ? a.education.slice(0, 10) : [],
    }),
    summarize: (a) => `Create resume "${a.title}"`,
    execute: async (ctx, a) => {
        // serverTimestamp, matching useResumes.ts and every other writer — an ISO
        // string sorts differently and breaks orderBy("updatedAt").
        const stamp = admin.firestore.FieldValue.serverTimestamp();
        const doc = await userRef(ctx.uid).collection("resumes").add({
            title: a.title,
            section: "resumes",
            templateId: "modern",
            // Shape must match PersonalDetails in src/types.ts exactly — the
            // editor and every template read these field names directly.
            personalDetails: {
                jobTitle: a.jobTitle,
                photo: "",
                firstName: a.firstName,
                lastName: a.lastName,
                email: a.email,
                phone: a.phone,
                address: "",
                city: a.city,
                postalCode: "",
                country: a.country,
            },
            professionalSummary: a.professionalSummary,
            websites: [],
            skills: a.skills,
            employmentHistory: a.employmentHistory.map((e: any, i: number) => ({
                id: `e${i}`,
                jobTitle: String(e.jobTitle ?? ""),
                employer: String(e.employer ?? ""),
                city: String(e.city ?? ""),
                startDate: String(e.startDate ?? ""),
                endDate: String(e.endDate ?? ""),
                description: String(e.description ?? ""),
            })),
            education: a.education.map((e: any, i: number) => ({
                id: `d${i}`,
                school: String(e.school ?? ""),
                degree: String(e.degree ?? ""),
                city: String(e.city ?? ""),
                startDate: String(e.startDate ?? ""),
                endDate: String(e.endDate ?? ""),
            })),
            languages: [],
            themeColor: "#2563eb",
            titleFont: "Inter",
            bodyFont: "Inter",
            language: "English",
            createdAt: stamp,
            updatedAt: stamp,
        });
        // The agent's job ends at a saved draft; the editor owns refinement.
        return { resumeId: doc.id, route: `/edit/${doc.id}` };
    },
};

const updateResumeSection: AgentTool = {
    name: "updateResumeSection",
    description:
        "Replace one section of an existing resume. Use for targeted edits like rewriting the summary or adding skills. The user approves the change before it is written.",
    parameters: {
        type: "object",
        properties: {
            resumeId: { type: "string" },
            section: {
                type: "string",
                enum: ["professionalSummary", "skills", "employmentHistory", "education", "title"],
            },
            value: { type: "string", description: "New value. JSON-encoded array for list sections." },
        },
        required: ["resumeId", "section", "value"],
    },
    phase: 1,
    risk: "high_write",
    writes: true,
    action: "resume.bullet_edit",
    validate: (a) => {
        const allowed = ["professionalSummary", "skills", "employmentHistory", "education", "title"];
        const section = S(a.section, "section", 40);
        if (!allowed.includes(section)) throw new Error(`Unknown section: ${section}`);
        return { resumeId: S(a.resumeId, "resumeId", 60), section, value: S(a.value, "value", 20_000) };
    },
    summarize: (a) => `Update the ${a.section} on your resume`,
    execute: async (ctx, a) => {
        const ref = userRef(ctx.uid).collection("resumes").doc(a.resumeId);
        if (!(await ref.get()).exists) throw new Error("Resume not found.");

        const listSections = ["skills", "employmentHistory", "education"];
        let value: unknown = a.value;
        if (listSections.includes(a.section)) {
            try {
                value = JSON.parse(a.value);
            } catch {
                throw new Error(`${a.section} must be a JSON array.`);
            }
            if (!Array.isArray(value)) throw new Error(`${a.section} must be a JSON array.`);
        }

        await ref.update({ [a.section]: value, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { resumeId: a.resumeId, section: a.section, updated: true };
    },
};


/**
 * Open one of the user's existing resumes.
 *
 * Without this the model has resume ids in its context envelope and no way to
 * act on them, so it composes a path — it produced /resume/{id}, which 404s,
 * while telling the user it had opened their resume. A tool that returns the
 * real route removes the guess.
 */
const openResume: AgentTool = {
    name: "openResume",
    description:
        "Open one of the user's saved resumes in the editor. Use the id from your context; omit it to open the most recently edited one. Never compose a resume URL yourself.",
    parameters: {
        type: "object",
        properties: { resumeId: { type: "string", description: "Omit for the most recent." } },
    },
    phase: 1,
    risk: "read",
    writes: false,
    execute: async (ctx, a) => {
        const col = userRef(ctx.uid).collection("resumes");
        const snap = a.resumeId
            ? await col.doc(String(a.resumeId)).get()
            : (await col.orderBy("updatedAt", "desc").limit(1).get()).docs[0];
        // Scoped by path, so an id belonging to someone else simply is not here.
        if (!snap || !snap.exists) throw new Error("Resume not found.");

        const r: any = snap.data();
        return {
            resumeId: snap.id,
            title: r.title ?? "Untitled",
            route: `/edit/${snap.id}`,
            note: "Call navigateToRoute with this exact route.",
        };
    },
};

const navigateToRoute: AgentTool = {
    name: "navigateToRoute",
    description:
        "Move the user to a page in the app. Use to hand off after finishing a task, e.g. to the resume editor after creating a draft.",
    parameters: {
        type: "object",
        properties: {
            route: {
                type: "string",
                description:
                    'One of: /dashboard, /job-tracker, /jobs, /job-market, /newresume, /interview-studio, ' +
                    '/learning, /community, /quick-start, /portfolio, /profile, /subscription, /pricing, ' +
                    'or an id route like /edit/{resumeId}.',
            },
            reason: { type: "string", description: "One short sentence shown to the user." },
        },
        required: ["route"],
    },
    phase: 1,
    risk: "read",
    writes: false,
    execute: async (_ctx, a) => {
        const route = S(a.route, "route", 200);
        // Same-origin app paths only: an agent that can send the user to an
        // arbitrary URL is an open redirect.
        if (!route.startsWith("/") || route.startsWith("//")) {
            throw new Error("route must be an app-relative path beginning with a single '/'.");
        }
        if (!isNavigableRoute(route)) {
            throw new Error(
                `Unknown route: ${route}. Valid routes: ${[...NAV_ROUTES].join(", ")}, or /edit/{resumeId}.`,
            );
        }
        return { navigate: route, reason: optS(a.reason, 200) };
    },
};

// ═════════════════════════════════════════════════════════════════════════════
// Phase 2 — Job tracker
// ═════════════════════════════════════════════════════════════════════════════

const getJobTracker: AgentTool = {
    name: "getJobTracker",
    description: "Read the user's application pipeline: stage counts and recent jobs.",
    parameters: {
        type: "object",
        properties: { status: { type: "string", enum: [...APPLICATION_STATUSES] } },
    },
    phase: 2,
    risk: "read",
    writes: false,
    execute: async (ctx, a) => {
        let q: FirebaseFirestore.Query = jobTrackerCol(ctx.uid);
        if (a.status && APPLICATION_STATUSES.includes(a.status)) {
            q = q.where("applicationStatus", "==", a.status);
        }
        const snap = await q.limit(100).get();
        const counts: Record<string, number> = {};
        const jobs = snap.docs.map((d) => {
            const j: any = d.data();
            counts[j.applicationStatus ?? "To Apply"] = (counts[j.applicationStatus ?? "To Apply"] ?? 0) + 1;
            return {
                id: d.id,
                jobTitle: j.jobTitle,
                companyName: j.companyName,
                applicationStatus: j.applicationStatus,
                nextAction: j.nextAction,
                location: j.location,
            };
        });
        return { total: snap.size, counts, jobs };
    },
};

const addTrackedJob: AgentTool = {
    name: "addTrackedJob",
    description:
        "Add one or more jobs to the user's tracker. Always requires approval, including for a single job.",
    parameters: {
        type: "object",
        properties: {
            jobs: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        jobTitle: { type: "string" },
                        companyName: { type: "string" },
                        jobPostURL: { type: "string" },
                        location: { type: "string" },
                        applicationStatus: { type: "string", enum: [...APPLICATION_STATUSES] },
                        notes: { type: "string" },
                    },
                    required: ["jobTitle", "companyName"],
                },
            },
        },
        required: ["jobs"],
    },
    phase: 2,
    risk: "high_write",
    writes: true,
    validate: (a) => {
        if (!Array.isArray(a.jobs) || !a.jobs.length) throw new Error("jobs must be a non-empty array.");
        if (a.jobs.length > 25) throw new Error("At most 25 jobs per batch.");
        return {
            jobs: a.jobs.map((j: any) => {
                const url = optS(j.jobPostURL, 1_000);
                // Only http(s). A javascript:/data: URL becomes a clickable link in the tracker.
                if (url && !/^https?:\/\//i.test(url)) throw new Error(`Invalid job URL: ${url}`);
                return {
                    jobTitle: S(j.jobTitle, "jobTitle", 200),
                    companyName: S(j.companyName, "companyName", 200),
                    jobPostURL: url ?? "",
                    location: optS(j.location, 200) ?? "",
                    applicationStatus: APPLICATION_STATUSES.includes(j.applicationStatus)
                        ? (j.applicationStatus as ApplicationStatus)
                        : ("To Apply" as ApplicationStatus),
                    notes: optS(j.notes, 2_000) ?? "",
                };
            }),
        };
    },
    summarize: (a) =>
        a.jobs.length === 1
            ? `Add ${a.jobs[0].jobTitle} at ${a.jobs[0].companyName} to your tracker`
            : `Add ${a.jobs.length} jobs to your tracker`,
    execute: async (ctx, a) => {
        const batch = db.batch();
        const ids: string[] = [];
        for (const j of a.jobs) {
            const ref = jobTrackerCol(ctx.uid).doc();
            ids.push(ref.id);
            batch.set(ref, {
                ...j,
                userId: ctx.uid,
                section: "jobs",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
        return { added: ids.length, jobIds: ids };
    },
};

const moveJobToStage: AgentTool = {
    name: "moveJobToStage",
    description: "Move a tracked job to a different pipeline stage.",
    parameters: {
        type: "object",
        properties: {
            jobId: { type: "string" },
            status: { type: "string", enum: [...APPLICATION_STATUSES] },
            note: { type: "string", description: "Optional note about the change." },
        },
        required: ["jobId", "status"],
    },
    phase: 2,
    risk: "low_write",
    writes: true,
    validate: (a) => {
        const status = S(a.status, "status", 40);
        if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
            throw new Error(`status must be one of: ${APPLICATION_STATUSES.join(", ")}`);
        }
        return { jobId: S(a.jobId, "jobId", 60), status, note: optS(a.note, 1_000) };
    },
    summarize: (a) => `Move job to "${a.status}"`,
    execute: async (ctx, a) => {
        // Scoping by path is the ownership check: a job id from another user
        // simply does not exist under this uid.
        const ref = jobTrackerCol(ctx.uid).doc(a.jobId);
        const snap = await ref.get();
        if (!snap.exists) throw new Error("Job not found.");

        const update: Record<string, unknown> = {
            applicationStatus: a.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (a.status === "Applied" && !snap.data()!.dateApplied) {
            update.dateApplied = admin.firestore.FieldValue.serverTimestamp();
        }
        if (a.note) update.notes = `${snap.data()!.notes ?? ""}\n${a.note}`.trim();

        await ref.update(update);
        return { jobId: a.jobId, status: a.status };
    },
};

const setJobTargets: AgentTool = {
    name: "setJobTargets",
    description:
        "Set the user's job search targets — roles, locations, seniority, work model, and salary band. This is what makes recommendations relevant.",
    parameters: {
        type: "object",
        properties: {
            targetArchetypes: { type: "array", items: { type: "string" } },
            targetLocations: { type: "array", items: { type: "string" } },
            seniority: { type: "string", description: 'e.g. "Senior", "Staff", "Entry".' },
            workModel: { type: "string", enum: ["On-site", "Hybrid", "Remote"] },
            targetSalaryMin: { type: "number" },
            targetSalaryMax: { type: "number" },
        },
    },
    phase: 2,
    risk: "low_write",
    writes: true,
    validate: (a) => ({
        targetArchetypes: Array.isArray(a.targetArchetypes) ? a.targetArchetypes.slice(0, 8).map(String) : undefined,
        targetLocations: Array.isArray(a.targetLocations) ? a.targetLocations.slice(0, 10).map(String) : undefined,
        seniority: optS(a.seniority, 40),
        workModel: ["On-site", "Hybrid", "Remote"].includes(a.workModel) ? a.workModel : undefined,
        targetSalaryMin: typeof a.targetSalaryMin === "number" ? a.targetSalaryMin : undefined,
        targetSalaryMax: typeof a.targetSalaryMax === "number" ? a.targetSalaryMax : undefined,
    }),
    summarize: (a) =>
        `Set search targets${a.targetArchetypes?.length ? `: ${a.targetArchetypes.join(", ")}` : ""}`,
    execute: async (ctx, a) => {
        const clean = Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined));
        await userRef(ctx.uid)
            .collection("careerProfile")
            .doc("profile")
            .set({ ...clean, uid: ctx.uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return { saved: true, targets: clean };
    },
};

const generateNextActions: AgentTool = {
    name: "generateNextActions",
    description:
        "Compute what the user should do next across their pipeline: stale applications, missing follow-ups, jobs with no tailored resume. Read-only.",
    parameters: { type: "object", properties: {} },
    phase: 2,
    risk: "read",
    writes: false,
    execute: async (ctx) => {
        const snap = await jobTrackerCol(ctx.uid).limit(200).get();
        const now = Date.now();
        const STALE_DAYS = 10;

        const actions: Array<{ jobId: string; title: string; company: string; action: string; urgency: string }> = [];
        for (const d of snap.docs) {
            const j: any = d.data();
            const applied = j.dateApplied?.toMillis?.();
            const ageDays = applied ? (now - applied) / 86_400_000 : null;

            if (j.applicationStatus === "To Apply" && !j.resumeId) {
                actions.push({ jobId: d.id, title: j.jobTitle, company: j.companyName, action: "Tailor a resume before applying", urgency: "medium" });
            } else if (j.applicationStatus === "Applied" && ageDays !== null && ageDays > STALE_DAYS) {
                actions.push({ jobId: d.id, title: j.jobTitle, company: j.companyName, action: `Follow up — applied ${Math.round(ageDays)} days ago`, urgency: "high" });
            } else if (j.applicationStatus === "Interviewing" && !j.prep_InterviewPrep) {
                actions.push({ jobId: d.id, title: j.jobTitle, company: j.companyName, action: "Prepare for the interview", urgency: "high" });
            }
        }
        actions.sort((a, b) => (a.urgency === "high" ? -1 : 1) - (b.urgency === "high" ? -1 : 1));
        return { count: actions.length, actions: actions.slice(0, 15) };
    },
};

// ═════════════════════════════════════════════════════════════════════════════
// Phase 3 — Cross-product
// ═════════════════════════════════════════════════════════════════════════════

const tailorResume: AgentTool = {
    name: "tailorResume",
    description:
        "Produce a tailored copy of a resume for a specific tracked job. Creates a new resume; the original is never modified.",
    parameters: {
        type: "object",
        properties: {
            resumeId: { type: "string" },
            jobId: { type: "string", description: "A job already in the tracker." },
            summary: { type: "string", description: "Rewritten professional summary targeting this role." },
            skills: { type: "array", items: { type: "string" }, description: "Reordered//filtered skills." },
        },
        required: ["resumeId", "jobId", "summary"],
    },
    phase: 3,
    risk: "high_write",
    writes: true,
    action: "resume.tailor",
    validate: (a) => ({
        resumeId: S(a.resumeId, "resumeId", 60),
        jobId: S(a.jobId, "jobId", 60),
        summary: S(a.summary, "summary", 3_000),
        skills: Array.isArray(a.skills) ? a.skills.slice(0, 40).map(String) : undefined,
    }),
    summarize: () => "Create a tailored resume for this role",
    execute: async (ctx, a) => {
        const [resumeSnap, jobSnap] = await Promise.all([
            userRef(ctx.uid).collection("resumes").doc(a.resumeId).get(),
            jobTrackerCol(ctx.uid).doc(a.jobId).get(),
        ]);
        if (!resumeSnap.exists) throw new Error("Resume not found.");
        if (!jobSnap.exists) throw new Error("Job not found.");

        const base: any = resumeSnap.data();
        const job: any = jobSnap.data();
        const stamp = admin.firestore.FieldValue.serverTimestamp();

        const copy = {
            ...base,
            title: `${base.title} — ${job.companyName}`,
            professionalSummary: a.summary,
            ...(a.skills ? { skills: normalizeSkills(a.skills) } : {}),
            isDefault: false,
            createdAt: stamp,
            updatedAt: stamp,
        };
        delete copy.id;

        const doc = await userRef(ctx.uid).collection("resumes").add(copy);
        await jobSnap.ref.update({ resumeId: doc.id, resumeTitle: copy.title, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { resumeId: doc.id, jobId: a.jobId, route: `/edit/${doc.id}` };
    },
};

const recommendLearningPath: AgentTool = {
    name: "recommendLearningPath",
    description:
        "Recommend courses based on the gap between the user's profile and their target roles. Returns course IDs and reasons. Read-only.",
    parameters: {
        type: "object",
        properties: { focus: { type: "string", description: 'Optional area, e.g. "system design".' } },
    },
    phase: 3,
    risk: "read",
    writes: false,
    execute: async (ctx, a) => {
        const [progressSnap, profileSnap] = await Promise.all([
            userRef(ctx.uid).collection("courseProgress").limit(30).get(),
            userRef(ctx.uid).collection("careerProfile").doc("profile").get(),
        ]);
        const completed = progressSnap.docs
            .filter((d) => (d.data().percentComplete ?? 0) >= 90)
            .map((d) => d.id);
        const inProgress = progressSnap.docs
            .filter((d) => { const p = d.data().percentComplete ?? 0; return p > 0 && p < 90; })
            .map((d) => ({ courseId: d.id, percentComplete: Math.round(d.data().percentComplete ?? 0) }));

        // The catalog ships with the tool result, not the per-turn envelope:
        // only this tool needs it, and it would otherwise cost tokens on every turn.
        const { COURSE_CATALOG } = await import("../generated/courseCatalog");
        const completedSet = new Set(completed);

        return {
            catalog: COURSE_CATALOG.filter((c) => !completedSet.has(c.id)),
            completed,
            inProgress,
            targetArchetypes: profileSnap.data()?.targetArchetypes ?? [],
            focus: optS(a.focus, 100),
            note: "Recommend only courses listed in `catalog`. Prefer finishing anything in `inProgress` before starting something new.",
        };
    },
};

const startInterviewPractice: AgentTool = {
    name: "startInterviewPractice",
    description:
        "Open Interview Studio for the user. It opens unconfigured — they pick the company and round there — so tell them what to choose. Spends credits, so it always requires approval.",
    parameters: {
        type: "object",
        properties: {
            role: { type: "string", description: "Role to practise for." },
            jobId: { type: "string", description: "Optional tracked job to draw context from." },
            resumeId: { type: "string", description: "Optional resume to load into the session." },
            mode: { type: "string", enum: ["behavioral", "coding", "system_design"] },
        },
        required: ["role"],
    },
    phase: 3,
    risk: "high_write",
    writes: true,
    action: "interview.question_gen",
    validate: (a) => ({
        role: S(a.role, "role", 200),
        jobId: optS(a.jobId, 60),
        mode: ["behavioral", "coding", "system_design"].includes(a.mode) ? a.mode : "behavioral",
    }),
    summarize: (a) => `Start a ${a.mode.replace("_", " ")} practice interview for ${a.role}`,
    execute: async (ctx, a) => {
        if (a.jobId) {
            const snap = await jobTrackerCol(ctx.uid).doc(a.jobId).get();
            if (!snap.exists) throw new Error("Job not found.");
        }
        // InterviewStudio reads source/scrapeId/resumeId from the query string and
        // nothing else — role and mode were being emitted into a void, so the user
        // landed on an unconfigured page while the agent said it had set one up.
        // Pass only what the page honours, and let the model say the rest aloud.
        const params = new URLSearchParams(a.resumeId ? { resumeId: a.resumeId } : {});
        const qs = params.toString();
        return {
            route: qs ? `/interview-studio?${qs}` : "/interview-studio",
            role: a.role,
            mode: a.mode,
            note: "Interview Studio opens unconfigured. Tell the user which role and round to pick.",
        };
    },
};

const summarizeProgress: AgentTool = {
    name: "summarizeProgress",
    description:
        'Summarize the user\'s overall state across resumes, pipeline, and learning. Use for dashboard summaries and "continue where I left off".',
    parameters: { type: "object", properties: {} },
    phase: 3,
    risk: "read",
    writes: false,
    execute: async (ctx) => {
        const [resumes, jobs, progress, tasks] = await Promise.all([
            userRef(ctx.uid).collection("resumes").orderBy("updatedAt", "desc").limit(5).get(),
            jobTrackerCol(ctx.uid).limit(200).get(),
            userRef(ctx.uid).collection("courseProgress").limit(20).get(),
            userRef(ctx.uid).collection("agentTasks").orderBy("createdAt", "desc").limit(3).get(),
        ]);

        const counts: Record<string, number> = {};
        for (const d of jobs.docs) {
            const s = d.data().applicationStatus ?? "To Apply";
            counts[s] = (counts[s] ?? 0) + 1;
        }

        return {
            resumeCount: resumes.size,
            mostRecentResume: resumes.docs[0]
                ? { id: resumes.docs[0].id, title: resumes.docs[0].data().title }
                : null,
            pipeline: counts,
            totalJobs: jobs.size,
            coursesInProgress: progress.docs
                .filter((d) => { const p = d.data().percentComplete ?? 0; return p > 0 && p < 90; })
                .map((d) => ({ courseId: d.id, percentComplete: Math.round(d.data().percentComplete ?? 0) })),
            lastAgentTasks: tasks.docs.map((d) => String(d.data().summary ?? "").slice(0, 140)),
        };
    },
};

// ═════════════════════════════════════════════════════════════════════════════
// Phase 4 — Live voice
// ═════════════════════════════════════════════════════════════════════════════

const startVoiceSession: AgentTool = {
    name: "startVoiceSession",
    description:
        "Open a short, task-scoped live voice session. Metered per minute, so it always requires approval. Only for interview practice or a guided profile interview.",
    parameters: {
        type: "object",
        properties: {
            purpose: { type: "string", enum: ["interview_practice", "profile_intake"] },
            role: { type: "string" },
            estimatedMinutes: { type: "number", description: "Expected length, used for the credit estimate." },
        },
        required: ["purpose"],
    },
    phase: 4,
    risk: "high_write",
    writes: true,
    validate: (a) => {
        const purpose = S(a.purpose, "purpose", 40);
        if (!["interview_practice", "profile_intake"].includes(purpose)) {
            throw new Error("purpose must be interview_practice or profile_intake.");
        }
        const est = typeof a.estimatedMinutes === "number" ? Math.min(60, Math.max(1, a.estimatedMinutes)) : 15;
        return { purpose, role: optS(a.role, 200), estimatedMinutes: est };
    },
    summarize: (a) =>
        `Start a ~${a.estimatedMinutes} min voice session${a.role ? ` for ${a.role}` : ""}`,
    // Returns the intent only. The client then calls `getAgentVoiceToken`, which
    // issues a short-lived server-side Vertex token — no key ever reaches the browser.
    execute: async (_ctx, a) => ({
        startVoice: true,
        purpose: a.purpose,
        role: a.role,
        estimatedMinutes: a.estimatedMinutes,
    }),
};


// ═════════════════════════════════════════════════════════════════════════════
// Planning — the agent decomposes a request into visible, executable steps
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Turn a spoken request into a checklist the user can watch.
 *
 * Without this, a multi-step request ("get my job search in order") is an opaque
 * run of tool calls: the user hears talking and has no idea what is happening or
 * how much is left. The plan makes the work legible before it starts.
 *
 * It is a READ tool on purpose — writing a plan changes nothing on its own. Each
 * step still goes through its own tool, and every write in those steps still
 * needs approval. A plan is not consent.
 */
const planTasks: AgentTool = {
    name: "planTasks",
    description:
        "Break the user's request into an ordered checklist of steps before doing them. Call this FIRST for anything needing more than one action — reviewing their job search, setting up from scratch, preparing for a role. Then work the steps in order. Skip it for single actions.",
    parameters: {
        type: "object",
        properties: {
            goal: { type: "string", description: "What the user is trying to achieve, in their words." },
            steps: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "Short imperative phrase, e.g. 'Check which jobs need follow-up'." },
                        tool: { type: "string", description: "The tool that will carry out this step, if known." },
                    },
                    required: ["title"],
                },
            },
        },
        required: ["goal", "steps"],
    },
    phase: 1,
    risk: "read",
    writes: false,
    validate: (a) => {
        const steps = Array.isArray(a.steps) ? a.steps : [];
        if (!steps.length) throw new Error("steps must contain at least one step.");
        return {
            goal: S(a.goal, "goal", 400),
            steps: steps.slice(0, 10).map((st: any) => ({
                title: S(st?.title, "step.title", 160),
                tool: optS(st?.tool, 60),
            })),
        };
    },
    execute: async (ctx, a) => {
        const ref = userRef(ctx.uid).collection("agentPlans").doc(ctx.taskId);
        await ref.set({
            uid: ctx.uid,
            goal: a.goal,
            steps: a.steps.map((s: any, i: number) => ({ ...s, index: i, status: "pending" })),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            planId: ctx.taskId,
            goal: a.goal,
            steps: a.steps,
            note: "The user can now see this checklist. Work the steps in order and call updateTaskStatus as each finishes.",
        };
    },
};

/** Mark a step done or blocked so the checklist tracks reality rather than intent. */
const updateTaskStatus: AgentTool = {
    name: "updateTaskStatus",
    description:
        "Mark a planned step as running, done, or blocked. Call this as you work through a plan so the user sees progress.",
    parameters: {
        type: "object",
        properties: {
            stepIndex: { type: "number", description: "0-based index from the plan." },
            status: { type: "string", enum: ["running", "done", "blocked"] },
            note: { type: "string", description: "One short line, shown under the step." },
        },
        required: ["stepIndex", "status"],
    },
    phase: 1,
    risk: "read",
    writes: false,
    validate: (a) => {
        const status = S(a.status, "status", 20);
        if (!["running", "done", "blocked"].includes(status)) {
            throw new Error("status must be running, done, or blocked.");
        }
        const idx = Number(a.stepIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx > 9) throw new Error("stepIndex out of range.");
        return { stepIndex: idx, status, note: optS(a.note, 200) };
    },
    execute: async (ctx, a) => {
        const ref = userRef(ctx.uid).collection("agentPlans").doc(ctx.taskId);
        const snap = await ref.get();
        if (!snap.exists) return { updated: false, reason: "No plan for this task." };

        const steps = (snap.data()!.steps ?? []) as any[];
        if (!steps[a.stepIndex]) return { updated: false, reason: "No such step." };

        steps[a.stepIndex] = {
            ...steps[a.stepIndex],
            status: a.status,
            ...(a.note ? { note: a.note } : {}),
        };
        await ref.update({ steps });
        return {
            updated: true,
            stepIndex: a.stepIndex,
            status: a.status,
            remaining: steps.filter((s) => s.status !== "done").length,
        };
    },
};

// ═════════════════════════════════════════════════════════════════════════════

export const REGISTRY: AgentTool[] = [
    // Planning
    planTasks,
    updateTaskStatus,
    // Phase 1
    getCareerProfile,
    updateCareerProfile,
    analyzeResume,
    openResume,
    createResumeDraft,
    updateResumeSection,
    navigateToRoute,
    // Phase 2
    getJobTracker,
    addTrackedJob,
    moveJobToStage,
    setJobTargets,
    generateNextActions,
    // Phase 3
    tailorResume,
    recommendLearningPath,
    startInterviewPractice,
    summarizeProgress,
    // Phase 4
    startVoiceSession,
];

export const TOOLS_BY_NAME = new Map(REGISTRY.map((t) => [t.name, t]));

/** Tools available at or below the phase currently enabled. */
export const toolsForPhase = (maxPhase: number): AgentTool[] =>
    REGISTRY.filter((t) => t.phase <= maxPhase);

/**
 * Gemini function declarations for the enabled tools.
 *
 * Cast because the SDK types `parameters.type` as its own `Type` enum, while
 * these schemas use the plain OpenAPI strings the REST API accepts. Writing
 * `Type.OBJECT` throughout would mean importing the SDK into every tool
 * definition for no behavioural gain.
 */
export const toolDeclarations = (maxPhase: number): any[] => [
    {
        functionDeclarations: toolsForPhase(maxPhase).map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        })),
    },
];

/**
 * Tools a user may auto-execute without a per-call prompt.
 *
 * `high_write` is never eligible, whatever the user's preference — batch
 * writes and credit-spending actions are exactly the ones where a wrong
 * inference is expensive to undo.
 */
export const isAutoExecEligible = (tool: AgentTool): boolean => tool.risk === "low_write";

export type { AgentTool, ToolContext };
