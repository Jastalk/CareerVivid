/**
 * Builds the per-turn context envelope.
 *
 * Everything here is an explicit allowlist. The rule is that adding a field
 * costs tokens on EVERY turn for EVERY user, so a field earns its place only
 * if the model needs it to decide what to do next. Detail that only one tool
 * needs belongs in that tool's return value, not in the envelope.
 */

import * as admin from "firebase-admin";
import { type AgentContext, MAX_CONTEXT_BYTES } from "./types";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const CV_EXCERPT_CHARS = 1_200;
const RECENT_JOBS = 8;
const RECENT_TASKS = 5;

const truncate = (s: string | undefined, n: number): string | undefined =>
    !s ? undefined : s.length <= n ? s : `${s.slice(0, n)}…[truncated]`;

export async function buildContext(
    uid: string,
    route: string,
    entity?: { type: "resume" | "job" | "course"; id: string },
): Promise<AgentContext> {
    const userRef = db.collection("users").doc(uid);

    const [profileSnap, resumesSnap, jobsSnap, progressSnap, tasksSnap] = await Promise.all([
        userRef.collection("careerProfile").doc("profile").get(),
        userRef.collection("resumes").orderBy("updatedAt", "desc").limit(10).get(),
        userRef.collection("jobTracker").limit(200).get(),
        userRef.collection("courseProgress").limit(20).get(),
        userRef.collection("agentTasks").orderBy("createdAt", "desc").limit(RECENT_TASKS).get(),
    ]);

    const profile = profileSnap.exists ? profileSnap.data()! : null;

    const resumes = resumesSnap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "Untitled",
        updatedAt: String(d.data().updatedAt ?? ""),
    }));

    // Stage counts come from the full set; the detail list does not.
    const counts: Record<string, number> = {};
    for (const d of jobsSnap.docs) {
        const s = d.data().applicationStatus || "To Apply";
        counts[s] = (counts[s] ?? 0) + 1;
    }

    const recent = jobsSnap.docs
        .sort((a, b) => (b.data().updatedAt?.toMillis?.() ?? 0) - (a.data().updatedAt?.toMillis?.() ?? 0))
        .slice(0, RECENT_JOBS)
        .map((d) => ({
            id: d.id,
            title: d.data().jobTitle || "",
            company: d.data().companyName || "",
            status: d.data().applicationStatus || "To Apply",
        }));

    const ctx: AgentContext = {
        route,
        ...(entity ? { entity } : {}),
        activeResumeId: resumes[0]?.id,
        profile: {
            hasProfile: Boolean(profile?.cvMarkdown && profile.cvMarkdown.trim().length > 100),
            targetArchetypes: profile?.targetArchetypes ?? [],
            targetLocations: profile?.targetLocations ?? [],
            salaryRange:
                profile?.targetSalaryMin || profile?.targetSalaryMax
                    ? `${profile?.targetSalaryMin ?? "?"}–${profile?.targetSalaryMax ?? "?"}`
                    : undefined,
            cvExcerpt: truncate(profile?.cvMarkdown, CV_EXCERPT_CHARS),
        },
        resumes,
        tracker: { counts, recent },
        learning: progressSnap.docs.map((d) => ({
            courseId: d.id,
            title: d.data().title || d.id,
            percentComplete: Math.round(d.data().percentComplete ?? 0),
        })),
        recentTasks: tasksSnap.docs.map((d) => ({
            taskId: d.id,
            summary: String(d.data().summary ?? "").slice(0, 140),
            at: d.data().createdAt?.toDate?.().toISOString() ?? "",
        })),
    };

    return enforceBudget(ctx);
}

/**
 * Drop the least-load-bearing fields until the envelope fits.
 *
 * Order matters: history goes first, then the CV excerpt, then list detail.
 * Stage counts and the profile targets are kept longest because the model
 * cannot make a sensible plan without them.
 */
function enforceBudget(ctx: AgentContext): AgentContext {
    const size = () => Buffer.byteLength(JSON.stringify(ctx), "utf8");
    if (size() <= MAX_CONTEXT_BYTES) return ctx;

    ctx.recentTasks = [];
    if (size() <= MAX_CONTEXT_BYTES) return ctx;

    ctx.profile.cvExcerpt = truncate(ctx.profile.cvExcerpt, 400);
    if (size() <= MAX_CONTEXT_BYTES) return ctx;

    ctx.learning = ctx.learning.slice(0, 5);
    ctx.tracker.recent = ctx.tracker.recent.slice(0, 3);
    if (size() <= MAX_CONTEXT_BYTES) return ctx;

    ctx.resumes = ctx.resumes.slice(0, 3);
    delete ctx.profile.cvExcerpt;
    return ctx;
}
