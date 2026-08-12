/**
 * What is actually wrong with this resume, ranked.
 *
 * The agent had exactly one thing it could offer a resume: `addResumeSkills`.
 * So every conversation about "what else should I do" ended at the same place —
 * a skill tag — while the summary was three words long and nine of ten bullets
 * had no number in them. The agent was not being unhelpful; it had nothing else
 * to see with.
 *
 * This is that missing sense. It reads the resume, the user's targets and their
 * last scored round, and returns concrete findings WITH the user's own text
 * attached, so the voice agent can say "your second bullet says 'Responsible for
 * the mobile app' — what did it do to the numbers?" instead of "consider adding
 * metrics".
 *
 * Deliberately deterministic rather than another model call. On a live voice
 * call the user is waiting through every millisecond, and these are rules, not
 * judgments: a bullet either contains a number or it does not. The judgment —
 * which gap matters for THIS person, and how to say it — is what the agent on
 * the call is for. This tool hands it the facts and gets out of the way.
 */

import * as admin from "firebase-admin";
import { type AgentTool } from "./types";
import { RESUME_SKILL_SCORE_FLOOR } from "./reportTools";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export type GapArea =
    | "contact"
    | "summary"
    | "experience"
    | "skills"
    | "education"
    | "targets"
    | "practice";

export interface ResumeGap {
    area: GapArea;
    /** high = costs them interviews. medium = costs them polish. low = worth a minute. */
    severity: "high" | "medium" | "low";
    /** What is wrong, in the words the agent can say out loud. */
    finding: string;
    /** What to do about it. */
    fix: string;
    /** The user's own text, so the agent can quote rather than generalise. */
    quote?: string;
    /** The tool that fixes this, when one does. */
    tool?: string;
}

const RANK = { high: 0, medium: 1, low: 2 } as const;

/** Bullets a reader gets through, and the point past which a resume is two pages. */
const LONG_BULLET_CHARS = 300;
const CROWDED_BULLET_COUNT = 26;
const THIN_SUMMARY_CHARS = 180;
const BLOATED_SUMMARY_CHARS = 900;
const THIN_SKILL_COUNT = 6;

/**
 * Openers that describe a job description rather than a person's work.
 *
 * "Responsible for the checkout flow" is what the role was. "Cut checkout
 * drop-off 18%" is what they did with it — same fact, and only one of them
 * survives a six-second skim.
 */
const WEAK_OPENERS =
    /^\s*[-•*•]?\s*(responsible for|worked on|helped (?:with|to)?|assisted (?:with|in)?|tasked with|duties included|participated in|involved in|in charge of)\b/i;

/**
 * Text a generator left behind that nobody replaced.
 *
 * Checked against the JOINED name as well as each field: "John" and "Doe" are
 * stored separately and neither is a placeholder on its own, which is how a
 * resume reading "John Doe · john.doe@email.com" sailed past a per-field test.
 */
const PLACEHOLDER = new RegExp(
    [
        "\\b(?:john|jane)[\\s.]?doe\\b",
        "\\byour name\\b",
        "\\blorem ipsum\\b",
        "\\bexample\\.com\\b",
        "\\b(?:123-456-7890|555-\\d{3}-\\d{4})\\b",
        "\\b123 innovation \\w+",
        "\\b(?:acme corp|anytown)\\b",
    ].join("|"),
    "i",
);

/** Names that are really JSON the model stringified. See coerceSkills. */
const BLOB = /[{}[\]"]/;

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const bulletsOf = (description: unknown): string[] =>
    text(description)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

/** A role the user can be reminded of without reading them an id. */
const roleLabel = (role: any): string => {
    const title = text(role?.jobTitle) || "that role";
    const employer = text(role?.employer);
    return employer ? `${title} at ${employer}` : title;
};

export interface GapInputs {
    resume: any;
    /** careerProfile/profile — targets are what "tailored" is measured against. */
    profile?: any;
    /** The most recent scored practice round, if there is one. */
    lastReport?: {
        role?: string;
        overallScore?: number;
        skills?: string[];
        areasForImprovement?: string;
        sessionId?: string;
    };
}

/**
 * Everything worth telling the user about this resume, worst first.
 *
 * Pure and exported so the rules are readable and testable on their own — the
 * whole product decision is in here, and it should not require a Firestore
 * emulator to check.
 */
export function findResumeGaps({ resume, profile, lastReport }: GapInputs): {
    gaps: ResumeGap[];
    strengths: string[];
    stats: Record<string, number>;
} {
    const gaps: ResumeGap[] = [];
    const strengths: string[] = [];

    const details = resume?.personalDetails ?? {};
    const summary = text(resume?.professionalSummary);
    const skills: any[] = Array.isArray(resume?.skills) ? resume.skills : [];
    const roles: any[] = Array.isArray(resume?.employmentHistory) ? resume.employmentHistory : [];
    const education: any[] = Array.isArray(resume?.education) ? resume.education : [];

    // ── Contact ──────────────────────────────────────────────────────────────
    if (!text(details.email)) {
        gaps.push({
            area: "contact",
            severity: "high",
            finding: "There is no email address on the resume, so nobody who likes it can reply.",
            fix: "Ask for their email and add it.",
            tool: "updateResumeSection",
        });
    }
    if (!text(details.phone)) {
        gaps.push({
            area: "contact",
            severity: "medium",
            finding: "No phone number. Recruiters call before they email.",
            fix: "Ask for a number they answer.",
            tool: "updateResumeSection",
        });
    }
    if (!text(details.jobTitle)) {
        gaps.push({
            area: "contact",
            severity: "medium",
            finding: "No headline title under their name — the first line that tells a reader what they are.",
            fix: "Set it to the role they are targeting, not the one they currently hold.",
            tool: "updateResumeSection",
        });
    }
    if (!text(details.city) && !text(details.country)) {
        gaps.push({
            area: "contact",
            severity: "low",
            finding: "No location. Most recruiter searches filter on it, so a blank one is a filter they fail.",
            fix: "Add at least a city, or 'Remote' with a country.",
            tool: "updateResumeSection",
        });
    }

    const fullName = [text(details.firstName), text(details.lastName)].filter(Boolean).join(" ");
    const placeholderField = [fullName, details.email, details.phone, details.address, details.city]
        .map(text)
        .find((v) => PLACEHOLDER.test(v));
    if (placeholderField) {
        gaps.push({
            area: "contact",
            severity: "high",
            finding: "Generated placeholder details are still on the resume.",
            fix: "Replace them with the user's real details before they send this anywhere.",
            quote: placeholderField,
            tool: "updateResumeSection",
        });
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    if (!summary) {
        gaps.push({
            area: "summary",
            severity: "high",
            finding: "There is no professional summary — the only part of the page a recruiter reliably reads.",
            fix: "Draft three lines: what they are, their strongest proof, and what they are aiming at.",
            tool: "updateResumeSection",
        });
    } else if (PLACEHOLDER.test(summary)) {
        gaps.push({
            area: "summary",
            severity: "high",
            finding: "The summary still contains generated placeholder text.",
            fix: "Rewrite it around their actual experience.",
            quote: summary.slice(0, 200),
            tool: "updateResumeSection",
        });
    } else if (summary.length < THIN_SUMMARY_CHARS) {
        gaps.push({
            area: "summary",
            severity: "medium",
            finding: "The summary is too short to say anything specific.",
            fix: "Take it to three lines with one number in it — scale, scope, or result.",
            quote: summary,
            tool: "updateResumeSection",
        });
    } else if (summary.length > BLOATED_SUMMARY_CHARS) {
        gaps.push({
            area: "summary",
            severity: "low",
            finding: "The summary runs long enough that it gets skimmed instead of read.",
            fix: "Cut it to three or four lines and move the detail into the bullets.",
            tool: "updateResumeSection",
        });
    } else if (!/\d/.test(summary)) {
        gaps.push({
            area: "summary",
            severity: "medium",
            finding: "The summary has no number in it, so it reads like every other summary.",
            fix: "Put their biggest concrete number in the first line — team size, users, revenue, latency.",
            quote: summary.slice(0, 200),
            tool: "updateResumeSection",
        });
    } else {
        strengths.push("The summary is specific and the right length.");
    }

    // ── Experience ───────────────────────────────────────────────────────────
    const allBullets = roles.flatMap((r) => bulletsOf(r?.description));
    const quantified = allBullets.filter((b) => /\d/.test(b));

    if (!roles.length) {
        gaps.push({
            area: "experience",
            severity: "high",
            finding: "There is no work history on the resume at all.",
            fix: "Walk them through their roles one at a time, most recent first.",
            tool: "updateResumeSection",
        });
    } else {
        const emptyRole = roles.find((r) => !bulletsOf(r?.description).length);
        if (emptyRole) {
            gaps.push({
                area: "experience",
                severity: "high",
                finding: `${roleLabel(emptyRole)} is listed with no bullets, so it counts as time passing rather than work done.`,
                fix: "Get two or three things they actually shipped there.",
                quote: roleLabel(emptyRole),
                tool: "updateResumeSection",
            });
        }

        if (allBullets.length) {
            const ratio = Math.round((quantified.length / allBullets.length) * 100);
            if (ratio < 40) {
                const example = allBullets.find((b) => !/\d/.test(b));
                gaps.push({
                    area: "experience",
                    severity: "high",
                    finding: `Only ${ratio}% of their bullets contain a number, so most of the resume states responsibilities instead of results.`,
                    fix: "Take one bullet at a time and ask what it changed — how much, how fast, for how many.",
                    quote: example?.slice(0, 200),
                    tool: "updateResumeSection",
                });
            } else if (ratio >= 70) {
                strengths.push(`${ratio}% of their bullets are quantified.`);
            }
        }

        const weak = allBullets.filter((b) => WEAK_OPENERS.test(b));
        if (weak.length) {
            gaps.push({
                area: "experience",
                severity: "medium",
                finding: `${weak.length} bullet${weak.length === 1 ? "" : "s"} open by describing the job rather than what they did with it.`,
                fix: "Start each with the verb for the outcome — 'Cut', 'Shipped', 'Grew' — and keep the number.",
                quote: weak[0].slice(0, 200),
                tool: "updateResumeSection",
            });
        }

        const long = allBullets.find((b) => b.length > LONG_BULLET_CHARS);
        if (long) {
            gaps.push({
                area: "experience",
                severity: "low",
                finding: "At least one bullet is a paragraph, and a paragraph in a bullet list does not get read.",
                fix: "Split it into two, or cut it to the one claim that matters.",
                quote: long.slice(0, 200),
                tool: "updateResumeSection",
            });
        }

        if (allBullets.length > CROWDED_BULLET_COUNT) {
            gaps.push({
                area: "experience",
                severity: "low",
                finding: `${allBullets.length} bullets is more than one page holds, and the oldest roles are diluting the recent ones.`,
                fix: "Trim the roles over ten years old to a line each.",
                tool: "updateResumeSection",
            });
        }

        const openEnded = roles.filter((r) => !text(r?.endDate) && !text(r?.startDate));
        if (openEnded.length) {
            gaps.push({
                area: "experience",
                severity: "low",
                finding: `${roleLabel(openEnded[0])} has no dates, which reads as a gap being hidden even when it is not.`,
                fix: "Add the months, or mark it Present.",
                quote: roleLabel(openEnded[0]),
                tool: "updateResumeSection",
            });
        }
    }

    // ── Skills ───────────────────────────────────────────────────────────────
    const skillNames = skills.map((s) => text(typeof s === "string" ? s : s?.name)).filter(Boolean);
    const blob = skillNames.find((n) => BLOB.test(n));
    if (blob) {
        gaps.push({
            area: "skills",
            severity: "high",
            finding: "One of the skills is raw JSON rather than a skill name.",
            fix: "Offer to remove it — this was written by a bug, not by them.",
            quote: blob.slice(0, 120),
            tool: "updateResumeSection",
        });
    }

    if (!skillNames.length) {
        gaps.push({
            area: "skills",
            severity: "high",
            finding: "There are no skills listed, which is what most keyword filters match on first.",
            fix: "Pull them out of their own bullets rather than asking them to brainstorm.",
            tool: "updateResumeSection",
        });
    } else if (skillNames.length < THIN_SKILL_COUNT) {
        gaps.push({
            area: "skills",
            severity: "medium",
            finding: `Only ${skillNames.length} skill${skillNames.length === 1 ? "" : "s"} listed — thin for keyword matching.`,
            fix: "Add the tools and domains their bullets already prove they used.",
            tool: "updateResumeSection",
        });
    } else {
        strengths.push(`${skillNames.length} skills listed.`);
    }

    // A scored round that demonstrated something the resume does not claim.
    if (lastReport?.skills?.length && (lastReport.overallScore ?? 0) >= RESUME_SKILL_SCORE_FLOOR) {
        const known = new Set(skillNames.map((n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "")));
        const proven = lastReport.skills.filter(
            (s) => s && !known.has(s.toLowerCase().replace(/[^a-z0-9]+/g, "")),
        );
        if (proven.length) {
            gaps.push({
                area: "skills",
                severity: "medium",
                finding: `They scored ${lastReport.overallScore} on ${lastReport.role ?? "their last round"} and demonstrated ${proven.slice(0, 4).join(", ")}, none of which is on the resume.`,
                fix: "Ask before adding — it is their resume, and the claim is theirs to make.",
                quote: proven.slice(0, 4).join(", "),
                tool: "addResumeSkills",
            });
        }
    }

    // ── Education ────────────────────────────────────────────────────────────
    if (!education.length) {
        gaps.push({
            area: "education",
            severity: "medium",
            finding: "No education section. Some applicant systems reject a resume without one outright.",
            fix: "Even a bootcamp or a self-taught line is better than an empty section.",
            tool: "updateResumeSection",
        });
    }

    // ── Targets ──────────────────────────────────────────────────────────────
    const targets: string[] = Array.isArray(profile?.targetArchetypes) ? profile.targetArchetypes : [];
    if (!targets.length) {
        gaps.push({
            area: "targets",
            severity: "medium",
            finding: "No target roles are set, so there is nothing to measure 'tailored' against.",
            fix: "Ask what they are actually applying for and save it.",
            tool: "setJobTargets",
        });
    }

    // ── Practice ─────────────────────────────────────────────────────────────
    if (!lastReport) {
        gaps.push({
            area: "practice",
            severity: "low",
            finding: "They have no scored practice round, so nothing on this resume has been pressure-tested in an interview.",
            fix: "Offer one round on the role they are targeting.",
            tool: "startInterviewPractice",
        });
    } else if (text(lastReport.areasForImprovement)) {
        gaps.push({
            area: "practice",
            severity: (lastReport.overallScore ?? 0) < RESUME_SKILL_SCORE_FLOOR ? "high" : "low",
            finding: `Their last round scored ${lastReport.overallScore ?? "unscored"} and flagged specific gaps.`,
            fix: "Open the report before coaching on it so you quote what they actually said.",
            quote: text(lastReport.areasForImprovement).slice(0, 300),
            tool: "getInterviewReport",
        });
    }

    gaps.sort((a, b) => RANK[a.severity] - RANK[b.severity]);

    return {
        gaps,
        strengths,
        stats: {
            roles: roles.length,
            bullets: allBullets.length,
            quantifiedBullets: quantified.length,
            quantifiedPercent: allBullets.length ? Math.round((quantified.length / allBullets.length) * 100) : 0,
            skills: skillNames.length,
            summaryChars: summary.length,
        },
    };
}

/** The last scored round, shaped down to what the gap rules need. */
async function loadLastReport(uid: string): Promise<GapInputs["lastReport"]> {
    const snap = await db
        .collection("users")
        .doc(uid)
        .collection("practiceHistory")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

    const doc = snap.docs[0];
    if (!doc) return undefined;

    const data = doc.data() ?? {};
    const history: any[] = Array.isArray(data.interviewHistory) ? data.interviewHistory : [];
    if (!history.length) return undefined;

    const latest = [...history].sort((x, y) => (y?.timestamp ?? 0) - (x?.timestamp ?? 0))[0];
    return {
        sessionId: doc.id,
        role: text(data.job?.title) || undefined,
        overallScore: typeof latest?.overallScore === "number" ? Math.round(latest.overallScore) : undefined,
        skills: Array.isArray(latest?.skills) ? latest.skills.slice(0, 8).map((s: any) => text(s)).filter(Boolean) : [],
        areasForImprovement: text(latest?.areasForImprovement).slice(0, 1_200),
    };
}

/**
 * The tool the agent runs before it opens its mouth about someone's resume.
 *
 * Read-only and phase 1: nothing it returns changes anything, so there is no
 * reason to make the user approve a look.
 */
export const reviewResumeGaps: AgentTool = {
    name: "reviewResumeGaps",
    description:
        "Review a resume end to end and return ranked, specific gaps — summary, bullets, quantification, skills, contact details, targets — each with the user's own text and the tool that fixes it. Call this BEFORE giving any resume advice, and before proposing skills: skills are one narrow fix and usually not the most valuable one. Read-only.",
    parameters: {
        type: "object",
        properties: {
            resumeId: { type: "string", description: "Omit for the most recently edited resume." },
        },
    },
    phase: 1,
    risk: "read",
    writes: false,
    action: "resume.analyze",
    execute: async (ctx, a) => {
        const col = db.collection("users").doc(ctx.uid).collection("resumes");
        const snap = a?.resumeId
            ? await col.doc(String(a.resumeId)).get()
            : (await col.orderBy("updatedAt", "desc").limit(1).get()).docs[0];
        if (!snap || !snap.exists) {
            throw new Error("No resume found. Offer to create one first — createResumeDraft.");
        }

        const [profileSnap, lastReport] = await Promise.all([
            db.collection("users").doc(ctx.uid).collection("careerProfile").doc("profile").get(),
            loadLastReport(ctx.uid),
        ]);

        const resume = snap.data() ?? {};
        const { gaps, strengths, stats } = findResumeGaps({
            resume,
            profile: profileSnap.exists ? profileSnap.data() : undefined,
            lastReport,
        });

        return {
            resumeId: snap.id,
            route: `/edit/${snap.id}`,
            title: text(resume.title) || "Untitled resume",
            stats,
            strengths,
            // Capped: a live call has room for two or three of these, not twelve.
            // Ranked worst-first, so the cut only ever drops the least urgent.
            gaps: gaps.slice(0, 8),
            totalGaps: gaps.length,
            note:
                gaps.length === 0
                    ? "Nothing is failing. Say so plainly, name one strength, and ask what they want to sharpen."
                    : "Say the top gap out loud, quote their own line back, and offer ONE fix. Do not read the list.",
        };
    },
};
