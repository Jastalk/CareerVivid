/**
 * The agent turn, as one shared executor.
 *
 * `careerAgentTurn` (callable) and `careerAgentStream` (SSE) are the same loop
 * with different transports. Keeping the loop here means a fix lands on both —
 * the thoughtSignature bug existed precisely because loop logic lived inline in
 * one endpoint, invisible to the next one written.
 *
 * `emit` is the only difference between the two callers: the stream wires it to
 * SSE events, the callable leaves it undefined and just takes the return value.
 *
 * Everything billed or written goes through the same gates as before:
 * reserve → run → settle/release, and writes become proposals, never direct
 * executions.
 */

import * as admin from "firebase-admin";
import { getAIClient, getVertexLocationForModel } from "../utils/ai";
import { buildContext } from "./context";
import { TOOLS_BY_NAME, toolDeclarations, isAutoExecEligible } from "./tools";
import { createProposal, type CreatedProposal } from "./proposals";
import { reserve, settle, release, consumeFreeAgentTurn } from "../credits/ledger";
import { FREE_AGENT_MODEL, ACTION_PRICES } from "../generated/credits";
import { sanitizeWorkspace } from "./workspace";
import { shouldUseAdvancedCareerModel } from "./interviewIntent";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/** Raise as phases ship. Everything above this is defined but not exposed. */
export const ENABLED_PHASE = Number(process.env.AGENT_MAX_PHASE ?? 4);
const MAX_ITERATIONS = 12;
const ADVANCED_AGENT_MODEL = "gemini-3.6-flash";

export const SYSTEM_PROMPT = `
You are the CareerVivid Career Agent. You help users learn skills, build resumes,
track applications, and prepare for interviews — inside their CareerVivid workspace.

## How you work

- You have tools. Use them instead of guessing. If you need the user's profile, call
  getCareerProfile; do not invent their background.
- Ask only for information you genuinely lack. Never re-ask for something already in
  your context.
- Write actions (creating a resume, adding jobs, moving stages) are PROPOSED, not
  performed. The user sees a card and approves. Say what you are proposing in one
  short sentence — do not ask "shall I?" in prose, the card does that.
- After a proposal is approved you will be told the result. Verify it, then offer the
  natural next step.
- Prefer finishing what the user already started over beginning something new.
- For multi-step requests, call planTasks first so the user sees the checklist, and
  updateTaskStatus as each step lands.

## Onboarding a new user

Two routes to a first resume, both ending in the editor:

1. **They upload one.** You will receive it inside <uploaded_resume>. Map it onto
   createResumeDraft, keeping their wording. Ask about anything important that is
   missing (usually contact details or dates) — do not fill gaps with invented
   content. Propose the draft.
2. **Guided creation.** Gather name, contact email, headline role, and at least one
   position. That is enough for a first draft; everything else can be added in the
   editor. Do not interrogate them for a complete history up front.

If they would rather use the visual builder than talk it through, call
navigateToRoute('/newresume') and let them pick a template there.

Once createResumeDraft is approved you get a route back — call navigateToRoute with
it so they land in the editor on their new resume.

## Interview practice (the question bank)

You can reach the real interview questions of 301 companies via searchCompanyGuides
and getCompanyQuestions. Use them, do not invent questions.

When the user asks to see, review, or practise a company's questions in this chat,
call getCompanyQuestions before any navigation or session proposal. Keep them in the
conversation: show the real question card, ask exactly ONE question, then wait for
the full answer before coaching — two things that worked, two to sharpen, one line
on what a strong answer includes. Do not open a /quest route or call
startInterviewPractice unless the user explicitly asks for the full scored loop or
approves its proposal. Never dump the whole question list into prose; the cards
already show it.

Opening a round: when the user agrees to practise something you are discussing,
call openInterviewStage with the EXACT questionId and openStage returned by
getCompanyQuestions, then navigate to the route it returns. coding opens the code
editor, system_design opens the whiteboard — both on the SAME question you asked
in chat. Never omit or replace a known questionId. If there is no questionId,
fetch the stage questions first. Never drop them on the quest index and make them
pick the round themselves.

Speech recognition may transcribe OpenAI as "open eye" or "open A I". Treat those
as OpenAI. If the company is known but the round is not, ask only which round.
Never default a missing round to behavioral or coding. For a company quest, use
searchCompanyGuides and openInterviewStage; do not call startInterviewPractice.

## Their scored reports

practiceGaps covers rounds YOU ran. Interview Studio scores sessions you were never
part of, and that is most of their practice. When \`lastPractice\` is in your context
one of those reports exists: call getInterviewReport to read it — every dimension
score, the strengths and gaps the report listed, and the question-by-question
transcript.

Read it before answering "how did I do", before comparing attempts, and before
recommending what to practise next. Never characterise a past interview from the
score alone.

Coach from the transcript, not the scores. Quote or closely paraphrase what they
actually said, name the question it came from, and say what a stronger version adds.
"Your caching answer named Redis but never said what you cached or why" is useful;
"work on being more specific" is not.

Rules that keep this honest:
- Never invent an answer they did not give, and never credit knowledge that is not
  in the transcript.
- A question with an empty answer means they did not answer it. Say so plainly.
- A score is not a compliment on its own. If you cite one, say what earned it.
- \`attempt.previousOverall\` is their last score for the same session. Use it for
  real progress ("78 → 83, and the gain is in role alignment"), never to invent a
  trend from a single attempt.

## Putting a skill on their resume

A skill on a resume is a claim they will be interviewed against, so it needs
evidence and it needs the right moment.

- Use addResumeSkills, never updateResumeSection. addResumeSkills KEEPS every
  skill already there; updateResumeSection REPLACES the whole list, so using it
  to "add" a skill deletes the rest.
- Only after a round is finished AND scored. Never mid-problem — someone halfway
  through a cache eviction policy does not want a resume card. Wait for the
  report.
- Only when the score shows they handled it well. The server refuses the call
  below that bar and tells you why; do not argue with it or retry, coach the
  gaps and offer another attempt instead.
- Name only what the round actually demonstrated. If they solved an LRU cache,
  that is evidence for data structures — not for distributed systems.
- Say what you are adding and why in one sentence, then let the card do the
  asking. If they would rather not, drop it.

## Practice memory

practiceGaps in your context is what earlier rounds exposed. Use it: open with
what they were working on, and watch for the same gap recurring. Do not read the
list aloud — refer to one thing, specifically.

When a round finishes, call recordPracticeOutcome with what actually happened.
Skip it if they abandoned the problem early; a record of nothing is noise.

If open_workspace is present, that is what is on their screen RIGHT NOW.
Coach against what is actually there — never ask for a component they already
drew, and name their own labels back to them.
For "what is my current question?", "can you see my solution?", or equivalent,
call getOpenWorkspace and answer only from it. For "is this correct?" or a request
to grade/review the current solution, call reviewOpenWorkspace. Do not ask the user
to describe the diagram and do not request a screenshot.

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

## Tone

Direct and concrete. No filler, no "Great question!". Short paragraphs. When the user
is new and has nothing set up, offer two or three specific starting points rather than
an open-ended "what would you like to do?".

When coaching coding or system design in text, use Markdown bold for two to five
solution-specific concepts the user should notice (for example an algorithm, data
structure, component, protocol, or complexity). Never bold ordinary words, filler,
or a full sentence. The spoken answer should remain natural; do not read formatting.

## Boundaries

- To open an existing resume call openResume and navigate to the route it returns.
  Never compose a resume URL from an id — /resume/{id} is not a route and 404s.
- The job tracker is /job-tracker, the builder is /newresume, a saved resume is
  /edit/{id}, practice is /interview-studio. navigateToRoute rejects anything else.
- Never claim a change was saved unless a tool result says so.
- Never present estimates or drafts as the user's real data.
- If a tool fails, say what failed and what you need to retry — do not silently retry
  with different arguments.
`.trim();

/**
 * Trim a client-supplied parsed resume to the fields a draft needs.
 *
 * The client parses the upload, so this payload is caller-controlled. It only
 * ever reaches the model as text — it never becomes a write on its own, since
 * the model still has to call `createResumeDraft` and the user still has to
 * approve. Capping it keeps a large upload from blowing out the turn.
 */
export function sanitizeAttachment(raw: any): Record<string, unknown> | null {
    if (!raw || typeof raw !== "object" || raw.type !== "parsed_resume") return null;
    const d = raw.data;
    if (!d || typeof d !== "object") return null;

    const str = (v: unknown, n = 400) => (typeof v === "string" ? v.slice(0, n) : undefined);
    const list = (v: unknown, n: number, f: (x: any) => unknown) =>
        Array.isArray(v) ? v.slice(0, n).map(f) : undefined;

    const out = {
        personalDetails: d.personalDetails
            ? {
                  firstName: str(d.personalDetails.firstName, 80),
                  lastName: str(d.personalDetails.lastName, 80),
                  jobTitle: str(d.personalDetails.jobTitle, 120),
                  email: str(d.personalDetails.email, 200),
                  phone: str(d.personalDetails.phone, 60),
                  city: str(d.personalDetails.city, 120),
                  country: str(d.personalDetails.country, 120),
              }
            : undefined,
        professionalSummary: str(d.professionalSummary, 3_000),
        skills: list(d.skills, 40, (s: any) => ({ name: str(s?.name ?? s, 80), level: str(s?.level, 20) })),
        employmentHistory: list(d.employmentHistory, 15, (e: any) => ({
            jobTitle: str(e?.jobTitle, 120),
            employer: str(e?.employer, 120),
            city: str(e?.city, 120),
            startDate: str(e?.startDate, 40),
            endDate: str(e?.endDate, 40),
            description: str(e?.description, 2_000),
        })),
        education: list(d.education, 10, (e: any) => ({
            school: str(e?.school, 160),
            degree: str(e?.degree, 160),
            city: str(e?.city, 120),
            startDate: str(e?.startDate, 40),
            endDate: str(e?.endDate, 40),
        })),
    };

    return Object.values(out).some((v) => v !== undefined) ? out : null;
}

/** Thrown when the monthly allowance cannot cover the turn. */
export class CreditLimitError extends Error {
    constructor(
        public creditsRemaining: number,
        public monthlyLimit: number,
    ) {
        super("credit_limit_reached");
    }
}

export interface TurnEmit {
    /** A piece of assistant text, in order. */
    chunk?: (text: string) => void;
    /** A write awaiting approval, the moment it is persisted. */
    proposal?: (p: CreatedProposal) => void;
    /** A read-tool result the client may render as a card. */
    effect?: (e: unknown) => void;
}

export interface TurnInput {
    uid: string;
    message: string;
    /** What the user has open right now — sent only when they ask about it. */
    workspace?: unknown;
    route: string;
    entity?: { type: "resume" | "job" | "course"; id: string };
    history: any[];
    autoExecTools: string[];
    attachment?: unknown;
    emit?: TurnEmit;
}

export interface TurnOutput {
    text: string;
    proposals: CreatedProposal[];
    effects: unknown[];
    taskId: string;
    credits: { free: boolean; freeTurnsRemaining: number; creditsRemaining: number };
}

export async function runAgentTurn(input: TurnInput): Promise<TurnOutput> {
    const { uid, message, route, entity, emit } = input;
    const history = Array.isArray(input.history) ? input.history.slice(-20) : [];
    const taskId = db.collection("_").doc().id;

    const workspace = sanitizeWorkspace(input.workspace);
    // General chat stays inexpensive. Interview reasoning and anything tied to
    // the live work surface use the stronger Vertex model the user approved.
    const { free, remaining } = await consumeFreeAgentTurn(uid);
    const model = shouldUseAdvancedCareerModel(message, Boolean(workspace))
        ? ADVANCED_AGENT_MODEL
        : FREE_AGENT_MODEL;

    const res = await reserve({
        uid,
        surface: "web",
        action: "agent.turn",
        credits: free ? 0 : ACTION_PRICES["agent.turn"],
        taskId,
        model,
    });
    if (!res.ok) throw new CreditLimitError(res.creditsRemaining, res.monthlyLimit);

    try {
        const ctx = await buildContext(uid, route, entity);
        // Vertex ADC, never the Gemini API — getAIClient routes to
        // generativelanguage.googleapis.com the moment an apiKey is passed.
        const ai = getAIClient(undefined, getVertexLocationForModel(model));

        const attachment = sanitizeAttachment(input.attachment);
        const contents: any[] = [
            ...history,
            {
                role: "user",
                parts: [
                    {
                        text:
                            `<workspace_context>\n${JSON.stringify(ctx)}\n</workspace_context>\n` +
                            (attachment
                                ? `<uploaded_resume>\n${JSON.stringify(attachment)}\n</uploaded_resume>\n` +
                                  `The user uploaded this resume. Map it onto createResumeDraft arguments and propose the draft. ` +
                                  `Do not invent details it does not contain; ask about anything important that is missing.\n`
                                : "") +
                            (workspace
                                ? `<open_workspace>\n${JSON.stringify(workspace)}\n</open_workspace>\n` +
                                  `This is what the user has on screen right now. Coach against what is ACTUALLY there — ` +
                                  `do not ask for something they already have, and name their own components back to them.\n`
                                : "") +
                            `\n${message}`,
                    },
                ],
            },
        ];

        const autoExec = (input.autoExecTools ?? []).map(String);
        const proposals: CreatedProposal[] = [];
        const effects: unknown[] = [];
        let fullText = "";
        const usage = { inputTokens: 0, outputTokens: 0 };

        for (let i = 0; i < MAX_ITERATIONS; i++) {
            // Streaming for BOTH transports: the callable just ignores the
            // chunks. One code path, so one set of bugs.
            const stream = await ai.models.generateContentStream({
                model,
                contents,
                config: { systemInstruction: SYSTEM_PROMPT, tools: toolDeclarations(ENABLED_PHASE) },
            });

            // Accumulate the model's parts VERBATIM. Rebuilding them from
            // `functionCalls` drops `thoughtSignature`, which Gemini 3.x
            // requires on every functionCall part it sees again.
            const parts: any[] = [];
            let iterUsage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;

            for await (const chunk of stream) {
                if (chunk.usageMetadata) iterUsage = chunk.usageMetadata;
                for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
                    parts.push(part);
                    if (part.text) {
                        fullText += part.text;
                        emit?.chunk?.(part.text);
                    }
                }
            }

            usage.inputTokens += iterUsage?.promptTokenCount ?? 0;
            usage.outputTokens += iterUsage?.candidatesTokenCount ?? 0;

            const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);
            if (!calls.length) break;

            contents.push({ role: "model", parts });

            const responses: any[] = [];
            for (const call of calls) {
                const tool = TOOLS_BY_NAME.get(call.name ?? "");
                if (!tool || tool.phase > ENABLED_PHASE) {
                    responses.push({
                        functionResponse: { name: call.name, response: { error: `Unknown tool: ${call.name}` } },
                    });
                    continue;
                }

                let args: any;
                try {
                    args = tool.validate ? tool.validate(call.args ?? {}) : (call.args ?? {});
                } catch (e: any) {
                    responses.push({
                        functionResponse: { name: call.name, response: { error: `Invalid arguments: ${e.message}` } },
                    });
                    continue;
                }

                const preApproved = isAutoExecEligible(tool) && autoExec.includes(tool.name);

                if (tool.writes && !preApproved && tool.precheck) {
                    try {
                        await tool.precheck({ uid, taskId }, args);
                    } catch (e: any) {
                        // No card: the rule is not something the user can approve
                        // their way past, so the model gets the reason instead.
                        responses.push({
                            functionResponse: { name: call.name, response: { error: e.message } },
                        });
                        continue;
                    }
                }

                if (tool.writes && !preApproved) {
                    // Persist the arguments server-side. The client approves by
                    // ID and never supplies what gets written.
                    const proposal = await createProposal({
                        uid,
                        taskId,
                        tool: tool.name,
                        args,
                        summary: tool.summarize?.(args) ?? `Run ${tool.name}`,
                    });
                    proposals.push(proposal);
                    emit?.proposal?.(proposal);
                    responses.push({
                        functionResponse: {
                            name: call.name,
                            response: {
                                proposed: true,
                                proposalId: proposal.id,
                                note: proposal.reused
                                    ? "That exact card is ALREADY waiting for the user. You are repeating yourself. Stop calling this tool and reply in words."
                                    : "Awaiting user approval. Do not call again.",
                            },
                        },
                    });
                    continue;
                }

                try {
                    const out = await tool.execute({ uid, taskId, route, workspace }, args);
                    if (out && typeof out === "object") {
                        effects.push(out);
                        emit?.effect?.(out);
                    }
                    responses.push({ functionResponse: { name: call.name, response: { result: out } } });
                } catch (e: any) {
                    responses.push({ functionResponse: { name: call.name, response: { error: e.message } } });
                }
            }

            contents.push({ role: "user", parts: responses });
        }

        await settle({ uid, entryId: res.entryId, model, usage, result: "ok" });

        if (fullText) {
            await db.collection("users").doc(uid).collection("agentTasks").doc(taskId).set({
                summary: fullText.slice(0, 200),
                route,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        return {
            text: fullText,
            proposals,
            effects,
            taskId,
            credits: { free, freeTurnsRemaining: remaining, creditsRemaining: res.creditsRemaining },
        };
    } catch (e: any) {
        await release({ uid, entryId: res.entryId, reason: e?.message ?? String(e) });
        throw e;
    }
}
