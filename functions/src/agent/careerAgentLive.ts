/**
 * Career Agent — realtime Live session.
 *
 * The same agent as the text surface, but over the Gemini Live API: it talks,
 * listens, and calls tools mid-conversation instead of taking turns.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Where each piece runs, and why
 *
 * The Live socket is necessarily browser↔Vertex — audio cannot round-trip
 * through a Cloud Function without ruining latency. That means the model's
 * tool calls arrive at the CLIENT.
 *
 * They are not executed there. The client relays each call to
 * `careerAgentLiveTool`, which is where validation, authorization, billing, and
 * the approval gate live. The browser is a transport for tool calls, never an
 * executor of them.
 *
 * So the security properties are identical to the text agent:
 *   - reads are authorized server-side and scoped to the caller's uid
 *   - writes become proposals; the model is told "awaiting approval" and keeps
 *     talking; nothing is written until the user approves the stored arguments
 *   - the browser never holds a Gemini key, only a short-lived Vertex token
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";
import { buildContext } from "./context";
import { TOOLS_BY_NAME, toolDeclarations } from "./tools";
import { createProposal } from "./proposals";
import { reserve, settle, release } from "../credits/ledger";
import { billVoiceSlice, closeVoiceSession, affordableMinutes, HEARTBEAT_INTERVAL_MS, VOICE_MODEL } from "./voiceBilling";
import { sanitizeWorkspace } from "./workspace";
import {
    ACTION_PRICES,
    VOICE_SESSION_CAP_MINUTES,
    VOICE_CREDITS_PER_MINUTE,
    resolvePlan,
    type ActionKey,
} from "../generated/credits";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const REGION = "us-west1";
const ENABLED_PHASE = Number(process.env.AGENT_MAX_PHASE ?? 4);

const requireAuth = (context: functions.https.CallableContext): string => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in to use the Career Agent.");
    return uid;
};

const LIVE_SYSTEM_PROMPT = `
You are the CareerVivid Career Agent, speaking with the user in real time.

## Speaking

You are on a voice call. Talk like a person on a call, not like documentation.
Short sentences. One idea at a time. No bullet points, no markdown, no lists read
aloud. If you need three things from them, ask for the first one and wait.

Never read out IDs, URLs, or JSON. Say "your Google application" — not the doc id.

## Doing

You have tools and you should use them while you talk. Do not narrate that you are
about to call a tool; just call it and speak the result.

For anything needing more than one action — "get my job search in order", "help me
get ready for this role", "set me up from scratch" — call planTasks FIRST. It puts a
checklist on their screen so they can see what you are doing and how much is left.
Then work the steps in order, calling updateTaskStatus as each one finishes. Say what
you found as you go; do not narrate the checklist itself, they can see it.

Skip planning for a single action. "What's my next follow-up?" is one tool call, not
a plan.

Writes work differently from reads:
- READ tools return their result immediately. Use them freely.
- WRITE tools return "awaiting_approval". That is NOT an error. It means a card
  appeared on the user's screen showing exactly what will change. Tell them in one
  sentence what you put there and let them approve it. Do NOT call the tool again,
  and do NOT claim the change is saved. You will be told separately when they
  approve, and only then is it real.

Routes: the job tracker is /job-tracker (not /jobtracker), the resume builder is
/newresume, a saved resume opens at /edit/{id}, and practice is /interview-studio.
navigateToRoute rejects anything else, so use the route a tool handed you rather
than composing one. To open an existing resume call openResume — never build a
resume URL from an id yourself.

If a tool returns an error, say plainly what went wrong. Never retry silently with
different arguments.

## Interview practice (the question bank)

You can reach the real interview questions of 301 companies via searchCompanyGuides
and getCompanyQuestions. Use them, do not invent questions.

Opening a round: when the user agrees to practise something you are discussing,
call openInterviewStage with the EXACT questionId and openStage returned by
getCompanyQuestions, then navigate to the route it returns. coding opens the code
editor, system_design opens the whiteboard — both on the SAME question you asked
in chat. Never omit or replace a known questionId. If there is no questionId,
fetch the stage questions first. Never drop them on the quest index and make them
pick the round themselves.

Speech recognition may transcribe OpenAI as "open eye" or "open A I". Treat those
as OpenAI. If the company is known but the round is not, ask only which round.
Never default a missing round to behavioral or coding. For a named company, use
searchCompanyGuides and openInterviewStage; never call startInterviewPractice.

Running an in-chat mock: fetch questions for the company, ask exactly ONE, wait for
the full answer, then coach — two things that worked, two to sharpen, one line on
what a strong answer includes. Then offer the next question or the full scored loop
at the company's /quest route. Never dump the whole question list into prose; the
cards already show it.

## Their scored reports

practiceGaps covers rounds YOU ran. Interview Studio scores sessions you were never
part of. When \`lastPractice\` is in your context one of those reports exists — call
getInterviewReport before answering "how did I do", comparing attempts, or
recommending what to practise next. Never characterise a past interview from the
score alone.

Coach from the transcript. Name the question, say back what they actually said,
then say what a stronger answer adds. Out loud that is two or three points, not a
list — pick the ones that would move the needle most. Never invent an answer they
did not give, and if a question went unanswered, say so.

## Practice memory

practiceGaps in your context is what earlier rounds exposed. Use it: open with
what they were working on, and watch for the same gap recurring. Do not read the
list aloud — refer to one thing, specifically.

When a round finishes, call recordPracticeOutcome with what actually happened.
Skip it if they abandoned the problem early; a record of nothing is noise.

If open_workspace is present, that is what is on their screen RIGHT NOW.
Coach against what is actually there — never ask for a component they already
drew, and name their own labels back to them.
The browser route and workspace can change while this voice session stays open.
For "what is my current question?" or "can you see my solution?", call
getOpenWorkspace. For "is this correct?", call reviewOpenWorkspace. Those tools
receive the latest route and structured canvas on every call. Never ask the user
to describe the diagram again and never request a screenshot.

## Leading a practice round

Once a round is open you are running it, not attending it. Never end a turn
mid-problem with "what would you like to add next?" — that hands the work back
to the person who came here to be taught.

Every turn follows the same shape:

1. Compare open_workspace against the requirements in it. Find the single
   highest-value thing missing or wrong.
2. State it as a decision. What to add, where it connects.
3. One line on why — the failure it prevents. That line is the teaching; without
   it they copy a diagram instead of learning to build one.
4. Optionally one SPECIFIC technical question to make it stick ("what happens
   when that queue fills up?"). Never an open process question.

  Good: "Next, put a queue between Application Service and the GPU nodes. They
        are wired directly right now, so a traffic spike drops requests instead
        of buffering. Draw it and tell me — and think about what happens when
        the queue fills."
  Bad:  "What would you like to add next?"
  Bad:  "Are those what you'd like to work on?"

One step at a time. Listing everything missing turns it into transcription.

When they ask "is this correct?", answer plainly, then give the next step in the
same breath. A verdict with no direction is where the momentum dies.

If they are stuck or silent, do not wait — narrow it. Name the component and
where it goes.

For a coding round the same rule holds, but the gaps come from different
evidence: failing tests, an approach that will not meet the complexity bar,
missing edge cases. Name the specific case that breaks before naming the fix —
"this drops the last element when the array has one item" beats "add a guard".
If testSummary shows failures, work those first; passing tests with a bad
approach comes next.

## Finishing

Only when every requirement is genuinely covered, stop leading and open it up:
say what they built, name the one thing that would most improve it, then offer
the real choices — submit for review, a different question from this company, or
a different round. That is the only moment an open question belongs.

Do not declare it finished early. A diagram that satisfies three of four
requirements is not done, and saying so teaches the wrong bar.

## Pacing

The user can interrupt you at any time — expect it and stop talking when they do.
Keep the session short and finish the task. When the task is done, say so and offer
to end the call rather than filling silence.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// getAgentLiveToken — open a realtime session
// ─────────────────────────────────────────────────────────────────────────────

export const getAgentLiveToken = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 60, memory: "512MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const route = String(data?.route ?? "/");
        const entity = data?.entity;
        const workspace = sanitizeWorkspace(data?.workspace);

        /**
         * Reconnect path.
         *
         * The server ends Live sessions well before our own cap, so the client
         * reconnects with a resumption handle to keep the conversation alive.
         * That must NOT open a second session: a new row would restart the
         * clock, re-run the affordability check, and bill the same call twice.
         * A resume therefore returns a fresh token against the existing row.
         */
        const resumeSessionId = String(data?.resumeSessionId ?? "");
        if (resumeSessionId) {
            const snap = await db.collection("voiceSessions").doc(resumeSessionId).get();
            if (!snap.exists || snap.data()!.uid !== uid || snap.data()!.status !== "open") {
                throw new functions.https.HttpsError("failed-precondition", "That session is no longer open.");
            }
            const existing = snap.data()!;

            const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            if (!token?.token) throw new functions.https.HttpsError("internal", "Could not mint a Vertex token.");

            // Rebuilt, not reused: the user may have moved to another company or
            // opened a different round since the session started.
            const ctx = await buildContext(uid, route, entity);
            return {
                accessToken: token.token,
                project: process.env.GCLOUD_PROJECT,
                location: REGION,
                sessionId: resumeSessionId,
                taskId: existing.taskId,
                capMinutes: existing.capMinutes,
                creditsPerMinute: VOICE_CREDITS_PER_MINUTE,
            // Server-chosen: the client must not pick a model that has no Live API.
            liveModel: VOICE_MODEL,
                heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
                resumed: true,
                tools: toolDeclarations(ENABLED_PHASE),
                systemInstruction:
                    `${LIVE_SYSTEM_PROMPT}\n\n<workspace_context>\n${JSON.stringify(ctx)}\n</workspace_context>` +
                    (workspace ? `\n<open_workspace>\n${JSON.stringify(workspace)}\n</open_workspace>` : ""),
            };
        }

        const userSnap = await db.collection("users").doc(uid).get();
        if (!userSnap.exists) throw new functions.https.HttpsError("not-found", "User not found.");

        const userData = userSnap.data()!;
        const plan = resolvePlan(userData.plan);

        // Refuse to open a session the user cannot afford to finish. Cutting
        // someone off mid-sentence is worse than not starting.
        const affordable = affordableMinutes(userData, VOICE_CREDITS_PER_MINUTE);
        if (affordable < 2) {
            throw new functions.https.HttpsError(
                "resource-exhausted",
                "Not enough credits for a voice session.",
            );
        }
        const capMinutes = Math.min(VOICE_SESSION_CAP_MINUTES[plan], affordable);

        const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        if (!token?.token) throw new functions.https.HttpsError("internal", "Could not mint a Vertex token.");

        const ctx = await buildContext(uid, route, entity);
        const sessionRef = db.collection("voiceSessions").doc();
        const taskId = db.collection("_").doc().id;

        await sessionRef.set({
            uid,
            taskId,
            purpose: "career_agent_live",
            plan,
            capMinutes,
            route,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastBilledAt: admin.firestore.FieldValue.serverTimestamp(),
            lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
            billedCredits: 0,
            billedSeconds: 0,
            status: "open",
        });

        return {
            accessToken: token.token,
            project: process.env.GCLOUD_PROJECT,
            location: REGION,
            sessionId: sessionRef.id,
            taskId,
            capMinutes,
            creditsPerMinute: VOICE_CREDITS_PER_MINUTE,
            // Server-chosen: the client must not pick a model that has no Live API.
            liveModel: VOICE_MODEL,
            heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
            // Declarations come from the server so the tool surface cannot drift
            // from what the server is willing to execute.
            tools: toolDeclarations(ENABLED_PHASE),
            systemInstruction:
                `${LIVE_SYSTEM_PROMPT}\n\n<workspace_context>\n${JSON.stringify(ctx)}\n</workspace_context>` +
                (workspace ? `\n<open_workspace>\n${JSON.stringify(workspace)}\n</open_workspace>` : ""),
        };
    });

// ─────────────────────────────────────────────────────────────────────────────
// careerAgentLiveTool — execute (or propose) one tool call from the Live socket
// ─────────────────────────────────────────────────────────────────────────────

export const careerAgentLiveTool = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 60, memory: "512MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const sessionId = String(data?.sessionId ?? "");
        const name = String(data?.name ?? "");
        const args = data?.args ?? {};
        const route = String(data?.route ?? "/").slice(0, 500);
        const workspace = sanitizeWorkspace(data?.workspace);

        // The session must exist, be open, and belong to the caller. Without
        // this the endpoint would be a way to drive tools outside any session.
        const sessionSnap = await db.collection("voiceSessions").doc(sessionId).get();
        if (!sessionSnap.exists || sessionSnap.data()!.uid !== uid || sessionSnap.data()!.status !== "open") {
            throw new functions.https.HttpsError("failed-precondition", "No open session.");
        }
        const taskId: string = sessionSnap.data()!.taskId ?? sessionId;
        if (route !== sessionSnap.data()!.route) {
            await sessionSnap.ref.update({ route, routeUpdatedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        const tool = TOOLS_BY_NAME.get(name);
        if (!tool || tool.phase > ENABLED_PHASE) {
            return { ok: false, error: `Unknown tool: ${name}` };
        }

        let validated: any;
        try {
            validated = tool.validate ? tool.validate(args) : args;
        } catch (e: any) {
            // Returned rather than thrown: the model should hear the problem and
            // ask the user, not have the call fail opaquely.
            return { ok: false, error: `Invalid arguments: ${e.message}` };
        }

        if (tool.writes) {
            const proposal = await createProposal({
                uid,
                taskId,
                tool: tool.name,
                args: validated,
                summary: tool.summarize?.(validated) ?? `Run ${tool.name}`,
            });
            return {
                ok: true,
                status: "awaiting_approval",
                proposal,
                // Phrased for the model, which reads this verbatim.
                note: "A card is on the user's screen. Tell them what you proposed and wait. Do not call this tool again.",
            };
        }

        const credits = tool.action ? (ACTION_PRICES[tool.action as ActionKey] ?? 0) : 0;
        const res = await reserve({ uid, surface: "web", action: tool.action ?? tool.name, credits, taskId });
        if (!res.ok) {
            return { ok: false, error: "Out of credits for this action." };
        }

        try {
            const result = await tool.execute({ uid, taskId, route, workspace }, validated);
            await settle({ uid, entryId: res.entryId, result: "ok" });
            return { ok: true, status: "done", result, creditsRemaining: res.creditsRemaining };
        } catch (e: any) {
            await release({ uid, entryId: res.entryId, reason: e?.message ?? String(e) });
            return { ok: false, error: e?.message ?? "Tool failed." };
        }
    });

// ─────────────────────────────────────────────────────────────────────────────
// agentVoiceHeartbeat — meter the call while it is happening
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charges the slice since the last tick and says whether to keep going.
 *
 * This is what makes closing the tab cost the user what they used: billing
 * advances continuously, so the most that can ever go uncharged is one
 * heartbeat interval. It is also where the session cap and the credit balance
 * are actually enforced — the client's own timer is a courtesy, not a control.
 */
export const agentVoiceHeartbeat = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const sessionId = String(data?.sessionId ?? "");
        if (!sessionId) throw new functions.https.HttpsError("invalid-argument", "sessionId is required.");

        const ref = db.collection("voiceSessions").doc(sessionId);
        const snap = await ref.get();
        if (!snap.exists || snap.data()!.uid !== uid) {
            throw new functions.https.HttpsError("not-found", "Session not found.");
        }
        if (snap.data()!.status !== "open") {
            return { ok: true, shouldStop: true, stopReason: "closed" };
        }

        // Billed against server time, never a client-reported duration.
        const now = Date.now();
        const tick = await billVoiceSlice({ sessionRef: ref, uid, upToMs: now, reason: "heartbeat" });
        await ref.update({ lastHeartbeatAt: admin.firestore.Timestamp.fromMillis(now) });

        if (tick.shouldStop) {
            await closeVoiceSession({ sessionRef: ref, uid, upToMs: now, reason: "heartbeat" });
        }

        return {
            ok: true,
            shouldStop: tick.shouldStop,
            stopReason: tick.stopReason,
            billedCredits: tick.billedTotal,
            billedSeconds: Math.round(tick.billedSeconds),
        };
    });
