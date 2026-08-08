/**
 * Shot scripts for the CCA-F course videos — the production outline, not app code.
 *
 * Lives beside the generation scripts on purpose: the app itself only needs to
 * know which video file belongs to which domain (see src/lib/ccafVideoLessons.ts).
 * Keeping ~1,100 lines of narration and shot prompts out of src/ keeps them out
 * of the browser bundle, where no user would ever read them.
 *
 * Consumed by generate-narration.mjs, generate-backplates.mjs and
 * generate-veo-clips.mjs.
 */

import type { LocalizedText } from '../../src/lib/ccafMissions';

/** What the renderer draws for a beat. Seven kinds cover all 45 lessons. */
export type BeatKind = 'veo' | 'city' | 'diagram' | 'code' | 'compare' | 'quiz' | 'card' | 'rows';

/**
 * The teaching layer, drawn in code over the backplate.
 *
 * This is deliberately structured rather than free text: a flow diagram has to
 * render with the arrows pointing the right way and a code line has to say the
 * real field name. Those are exactly the things an image model gets wrong, so
 * they are data here and never part of an image prompt.
 */
export type BeatVisual =
    /** Boxes joined left to right; `loop` draws the return arrow underneath. */
    | { type: 'flow'; nodes: string[]; loop?: boolean; loopLabel?: LocalizedText }
    /** Code with per-line emphasis. `mark` lines are highlighted in sequence. */
    | { type: 'code'; lines: { text: string; mark?: boolean; dim?: boolean }[] }
    /** Side-by-side options, each judged. Reveals one at a time. */
    | { type: 'columns'; items: { label: LocalizedText; verdict: 'bad' | 'good'; note?: LocalizedText }[] }
    /** Closing statement — the one line to remember. */
    | { type: 'card'; headline: LocalizedText }
    /** Labelled rows that appear one by one. Good for cause → fix tables. */
    | { type: 'rows'; rows: { term: string; detail: LocalizedText; verdict?: 'bad' | 'good' }[] }
    /**
     * A term explained in plain language, then the consequence of getting it
     * wrong. The teaching surface for jargon: `plain` must contain no API
     * names at all, so a viewer meeting the word for the first time still
     * follows the sentence.
     */
    /**
     * 问题 → 解法 → 本质. Three panels, in that order, because that order has a
     * shape: it builds a pain, releases it, then collapses the whole thing into
     * something small.
     *
     * `essence` is the one that does the teaching. It is the "it is really just
     * X" line — SubAgent is *just context partitioning*; stop_reason is *just a
     * label on an envelope*. A reference-style definition leaves a viewer able
     * to recite the term; an essence line is the moment they stop needing to.
     *
     * Wrap the words that matter in **double asterisks** and the renderer marks
     * them. One phrase per panel, not five — the point is where the eye goes.
     */
    | {
        type: 'define';
        entries: {
            term: string;
            /** 问题 — what hurts without this. State the pain, not the topic. */
            problem: LocalizedText;
            /** 解法 — what you actually do about it. */
            solution: LocalizedText;
            /** 本质 — "it is really just …". The line that makes it collapse. */
            essence: LocalizedText;
        }[];
    };

export interface LessonBeat {
    id: string;
    kind: BeatKind;
    /** Empty for `veo` beats — they run to a fixed length with no voice. */
    narration?: LocalizedText;
    /** Fixed duration in seconds. Only `veo` beats set this; the rest are
     *  sized by how long their narration actually takes to speak. */
    fixedSeconds?: number;
    /** Prompt for the Gemini backplate. No text may appear in the image. */
    imagePrompt?: string;
    /** How Veo should move the camera over that backplate. */
    motion?: string;
    /** Author's note for the overlay layer — not rendered to the player. */
    overlay?: string;
    /** The teaching graphic drawn over the backplate. */
    visual?: BeatVisual;
}

export interface VideoLesson {
    /** Matches the mission id in ccafMissions.ts. */
    missionId: string;
    domainOrder: number;
    title: LocalizedText;
    /** One line under the title, shown on the opening card. */
    subtitle?: LocalizedText;
    beats: LessonBeat[];
}

/**
 * The domain-opening films sit alongside the per-mission lessons so the
 * generators can address them the same way: `LESSONS=domain-1-overview`.
 * domain1Script.ts imports only *types* from here, so this is not a runtime
 * cycle — the type import is erased at compile time.
 */
import { DOMAIN_1_FILM } from './domain1Script';

export const VIDEO_LESSONS: VideoLesson[] = [
    DOMAIN_1_FILM,
    {
        missionId: 'read-the-signal',
        domainOrder: 1,
        title: { en: 'Read the Signal', zh: '看信号' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A funny stick figure operator wearing a giant headset running frantically on a hamster wheel ' +
                    'powering a glowing stoplight. Bold black hand-drawn ink lines, flat color fills, clean white background. No text.',
                motion: '2D hand-drawn cartoon animation. The stick figure runs frantically inside the hamster wheel while the stoplight wiggles. Slow push in with handheld camera drift.',
                overlay: 'Lesson title card fades up.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: "You've written an agent that calls tools. It loops over and over. The question is — how does it know when to stop?",
                    zh: '你写了一个会调用工具的 agent。它像仓鼠跑圈一样不停循环。问题是——它怎么知道该停？',
                },
                overlay: 'Loop diagram: model → tool → result → back to model, turning.',
                visual: {
                    type: 'flow',
                    nodes: ['messages', 'model', 'tool_use?', 'execute tool', 'tool_result'],
                    loop: true,
                    loopLabel: { en: 'and round again — until what?', zh: '然后再来一圈——直到什么时候？' },
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure referee waving a bright green checkered flag while pointing aggressively at a giant digital clock. ' +
                    'Bold black ink outlines, flat color, white background. No text.',
                motion: '2D cartoon motion. The referee stick figure rhythmically waves the green flag while bouncing. Locked-off wide shot.',
            },
            {
                id: 'three-ways',
                kind: 'compare',
                narration: {
                    en: 'Three approaches. Reading text wording fails because LLMs rephrase every run. Counting loops fails because caps truncate work. The real signal is right in the API payload!',
                    zh: '三种做法。分析文本措辞肯定不行，因为模型每次说得都不一样。限定最大轮数也不行，那只是盲目截断。真正的判据是 API 响应自带的那个状态位！',
                },
                overlay: 'Three columns: parse text ✗ · iteration cap ✗ · stop_reason ✓',
                visual: {
                    type: 'columns',
                    items: [
                        {
                            label: { en: 'Read text output', zh: '读取生成的文本' },
                            verdict: 'bad',
                            note: { en: 'Wording changes every run', zh: '措辞每次运行都不同' },
                        },
                        {
                            label: { en: 'Count loop turns', zh: '盲目设定最大轮数' },
                            verdict: 'bad',
                            note: { en: 'A safety net, not a signal', zh: '那是安全网，不是判据' },
                        },
                        {
                            label: { en: 'Branch on stop_reason', zh: '根据 stop_reason 分支' },
                            verdict: 'good',
                            note: { en: 'Returned directly by API', zh: 'API 本来就告诉你了' },
                        },
                    ],
                },
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'tool_use means execute and loop again. end_turn means you are done! Keep the iteration cap strictly as a guardrail.',
                    zh: 'tool_use 就执行工具、继续循环。end_turn 就立马收工。最大轮数只是防止无限循环的熔断器。',
                },
                overlay: 'Loop code with stop_reason === "tool_use" highlighted.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: 'while (turns < MAX_TURNS) {', dim: true },
                        { text: '  const res = await messages.create({ ... });' },
                        { text: '' },
                        { text: '  if (res.stop_reason === "end_turn") break;', mark: true },
                        { text: '  if (res.stop_reason === "tool_use") {', mark: true },
                        { text: '    messages.push(...runTools(res));' },
                        { text: '    continue;' },
                        { text: '  }' },
                        { text: '}', dim: true },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'tool_use -> keep going. end_turn -> stop. Domain 1 is 27% of the exam, and this is the foundation!',
                    zh: 'tool_use 就继续，end_turn 就收工。Domain 1 占考试 27%，这是最基础的奠基石！',
                },
                overlay: 'Takeaway card',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'tool_use → keep going.  end_turn → stop.',
                        zh: 'tool_use 就继续。end_turn 就收工。',
                    },
                },
            },
        ],
    },

    {
        missionId: 'two-truncations',
        domainOrder: 1,
        title: { en: 'Three Output Failure Types', zh: '三种「输出异常」原因' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure scientist holding a giant pair of scissors snipping a impossibly long paper receipt in half. ' +
                    'Bold black hand-drawn lines, simple flat color fill, clean white background. No text.',
                motion: '2D hand-drawn animation, 24fps. The stick figure makes a giant snip motion while receipt paper flies into the air.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Your logs show "incomplete output". Three different causes get lumped together, and your generic error handler retries all of them blindly!',
                    zh: '日志报错“输出不完整”。三种完全不同的原因混在一起，而你的通用错误处理机制却对它们全做盲目重试！',
                },
                overlay: 'Three log lines collapsing into one identical-looking error.',
                visual: {
                    type: 'flow',
                    nodes: ['max_tokens', 'context_exceeded', 'refusal'],
                    loop: true,
                    loopLabel: { en: 'all logged as "incomplete output"', zh: '全被记成「输出不完整」' },
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure doctor examining a computer monitor with a stethoscope while sweating nervously. ' +
                    'Bold black outlines, flat colors, clean white background. No text.',
                motion: '2D cartoon animation. The stick figure doctor taps the monitor with the stethoscope in rhythm. Locked wide shot.',
            },
            {
                id: 'three-ways',
                kind: 'compare',
                narration: {
                    en: 'max_tokens is your output budget limit. context_exceeded means input overflowed. Refusal is an intentional safety guardrail, not a system failure!',
                    zh: 'max_tokens 是你自己设的输出上限；context_exceeded 是上下文窗口塞爆了；而 refusal 根本不是系统故障，是安全拦截规范！',
                },
                overlay: 'Three columns, each with its own cause and its own fix.',
                visual: {
                    type: 'rows',
                    rows: [
                        {
                            term: 'max_tokens',
                            detail: {
                                en: 'Output budget hit -> Increase max_tokens or stream output',
                                zh: '输出预算超限 -> 调高 max_tokens 或改用流式',
                            },
                        },
                        {
                            term: 'context_exceeded',
                            detail: {
                                en: 'Input tokens overflowed -> Compress context or prune history',
                                zh: '输入上下文溢出 -> 压缩上下文或裁剪历史',
                            },
                        },
                        {
                            term: 'refusal',
                            detail: {
                                en: 'Safety trigger -> Surface decision to user or human review',
                                zh: '安全策略拦截 -> 告知用户或转人工审核',
                            },
                        },
                    ],
                },
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'None of these fix themselves with a naive retry! Exponential backoff is for rate limits, not for structural token cut-offs.',
                    zh: '盲目重试这三种错误永远无法成功！指数退避重试是给网络限流用的，不是用来解决 Token 结构性截断的。',
                },
                overlay: 'Error handler switching on stop_reason, three branches.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: '// WRONG: blind retry on all failures', dim: true },
                        { text: 'if (incomplete) await retryWithBackoff(req);', mark: true },
                        { text: '' },
                        { text: '// RIGHT: branch by exact stop_reason', dim: true },
                        { text: 'switch (res.stop_reason) {' },
                        { text: '  case "max_tokens":     return splitTask(req);' },
                        { text: '  case "context_exceeded": return compactContext(req);' },
                        { text: '  case "refusal":        return sendToReview(res);' },
                        { text: '}' },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'Log the precise stop_reason. Retrying a truncated context just burns money!',
                    zh: '务必精确记录 stop_reason！对截断错误原样重试只会白白浪费 Token 钱！',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Three causes. Three fixes. Zero naive retries.',
                        zh: '三种原因，三种解法，没有一种该盲目重试。',
                    },
                },
            },
        ],
    },
    {
        missionId: 'contract-breakdown',
        domainOrder: 1,
        title: { en: 'Contract Breakdown', zh: '拆解合约' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A funny stick figure bureaucrat in an oversized suit sweating nervously in front of ' +
                    'a giant mountain of paperwork on a tiny wooden desk. Bold black ink hand-drawn outlines, ' +
                    'flat color fill, clean white background, high contrast vector graphic. No text.',
                motion: '2D hand-drawn animation, 24fps comic motion. The stick figure frantically waves arms in distress. Slow push in with subtle handheld camera drift.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Every pull request needs three strict checks: code style, security vulnerability, and doc accuracy. Every single one, every time.',
                    zh: '每个 PR 都必须过三道关：代码风格、安全漏洞、文档准确性。每一个都要，每次都要。',
                },
                overlay: 'One PR fanning into three review lenses.',
                visual: {
                    type: 'flow',
                    nodes: ['Pull Request', 'Style Check', 'Security Audit', 'Doc Review'],
                },
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Routing fails because it picks only ONE specialist. A single giant prompt fails because security gets silently ignored while the model hyper-focuses on code style!',
                    zh: '路由模式不行，因为它只选一个专家；单次巨型 Prompt 也不行，模型盯着代码风格看，安全检查就悄悄漏掉了！',
                },
                overlay: 'Routing ✗ · giant prompt ✗',
                visual: {
                    type: 'columns',
                    items: [
                        { label: { en: 'Routing', zh: '路由模式' }, verdict: 'bad', note: { en: 'Only runs 1 pass', zh: '只跑单个专家' } },
                        { label: { en: 'Giant Prompt', zh: '巨型 Prompt' }, verdict: 'bad', note: { en: 'Attention diluted', zh: '注意力被稀释' } },
                        { label: { en: 'Prompt Chaining', zh: '顺序串联' }, verdict: 'good', note: { en: 'Isolated passes', zh: '独立视角落实' } },
                    ],
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'Three identical stick figure inspectors wearing magnifying glasses standing in a neat assembly line row, ' +
                    'a conveyor belt carrying documents beneath them. Bold black hand-drawn lines, flat color, clean white background. No text.',
                motion: '2D cartoon animation. The three stick figure inspectors alternate bouncing up and down rhythmically while looking through magnifying glasses. Locked wide shot.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Prompt chaining! Three isolated passes in sequence: Style -> Security -> Docs, then a final step synthesizes the complete report.',
                    zh: 'Prompt chaining！拆成三个隔离步骤链式顺序执行：风格 -> 安全 -> 文档，最后一步汇总生成综合报告。',
                },
                overlay: 'Chain: style → security → docs → synthesis.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: 'const step1 = await checkStyle(prCode);', mark: true },
                        { text: 'const step2 = await checkSecurity(prCode);', mark: true },
                        { text: 'const step3 = await checkDocs(prCode);', mark: true },
                        { text: 'return synthesize([step1, step2, step3]);', mark: true },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'Use Prompt Chaining for fixed, deterministic multi-step workflows.',
                    zh: '对于固定、可预测的多步骤流程，首选 Prompt Chaining。',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Fixed steps + isolated focus = Prompt Chaining',
                        zh: '固定步骤 + 独立视角 = Prompt Chaining',
                    },
                },
            },
        ],
    },
    {
        missionId: 'recruit-agents',
        domainOrder: 1,
        title: { en: 'Recruiting Agents', zh: '招募 Agent' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure boss wearing a tiny crown trying to walk a stick figure employee on a dog leash. ' +
                    'Bold black hand-drawn lines, flat color, clean white background. No text.',
                motion: '2D cartoon animation. The employee stick figure trips over while being yanked by the leash. Slow push in shot.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'You hand a subagent exact micro-instructions: search query A, site B, date C. It returns "zero results" and gives up completely instead of trying anything else!',
                    zh: '你给 subagent 交付了过于死板的步骤指令：必须搜关键词 A、网站 B、日期 C。结果它一查没有结果，就原地瘫痪彻底放弃！',
                },
                overlay: 'Coordinator handing down a rigid step list.',
                visual: {
                    type: 'flow',
                    nodes: ['Step-by-step Script', 'Dead End', 'Agent Freezes'],
                },
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Micromanaging subagents with hardcoded script steps destroys their reasoning power. You wrote an agent, but treated it like a bash script!',
                    zh: '用固定脚本去微操 subagent 抹杀了它的推理能力。你明明写的是 Agent，却把它当成简单的脚本在跑！',
                },
                overlay: 'Longer query list, still hitting a dead end.',
                visual: {
                    type: 'columns',
                    items: [
                        { label: { en: 'Micro-managing steps', zh: '微操具体步骤' }, verdict: 'bad', note: { en: 'Fails on first bump', zh: '卡住就无法自行调整' } },
                        { label: { en: 'Goal + Criteria', zh: '目标 + 质量标准' }, verdict: 'good', note: { en: 'Agent adapts dynamically', zh: 'Agent 自行找路调整' } },
                    ],
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'The employee stick figure cuts the leash with scissors, puts on sunglasses and flies off with a jetpack. ' +
                    'Bold black lines, flat color, white background. No text.',
                motion: '2D cartoon animation. The stick figure launches into the air with jetpack smoke trails.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Give it the GOAL and QUALITY CRITERIA instead! What to research, what counts as a valid source, and how many items to return. Let IT decide the queries.',
                    zh: '给它明确的【目标】和【质量判据】！告诉它研究主题是什么、合规来源长什么样、需要多少条证据。让它自己决定搜索策略！',
                },
                overlay: 'Procedural prompt vs goal + quality criteria.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: '// BAD: prescribing exact search terms', dim: true },
                        { text: 'prompt: "Search Google for \\"AI 2026 sales\\" on site X"', mark: true },
                        { text: '' },
                        { text: '// GOOD: goal + completion criteria', dim: true },
                        { text: 'prompt: "Find 3 peer-reviewed market size numbers for AI 2026"', mark: true },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'A script tells an agent what to do. A goal tells it what DONE looks like!',
                    zh: '脚本只教它怎么做，目标才能教会它怎样才算做完！',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Scripts break on unexpected data. Goals adapt.',
                        zh: '死板脚本遇阻即崩溃，目标导向方能应对万变。',
                    },
                },
            },
        ],
    },
    {
        missionId: 'order-of-ops',
        domainOrder: 1,
        title: { en: 'Order of Operations', zh: '行动顺序' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure chef attempting to bake a cake by putting raw unpeeled eggs straight into a roaring oven. ' +
                    'Bold black ink lines, flat colors, clean white background. No text.',
                motion: '2D cartoon motion. Smoke billows from the oven while the chef scratches his head in confusion. Locked wide shot.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Tool B needs the paper DOI returned by Tool A. But the LLM keeps invoking Tool B first, crashing the whole workflow!',
                    zh: '工具 B 必须依赖工具 A 拿到的论文 DOI。但大模型偏偏先调用了工具 B，导致整个工作流爆错！',
                },
                overlay: 'Dependency graph with the arrow going the wrong way.',
                visual: {
                    type: 'flow',
                    nodes: ['Tool A (Get DOI)', 'Tool B (Fetch Abstract)', 'Tool C (Summarize)'],
                },
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Writing "Please call Tool A first" in the prompt prompt has a non-zero failure rate. Prompt suggestions are hints, not guarantees!',
                    zh: '在 Prompt 里哀求“请先调用工具 A”总有一定失败率。提示词里的礼貌叮嘱只是建议，绝不是硬约束！',
                },
                overlay: 'Prompt instruction ✗ · merged mega-tool ✗',
                visual: {
                    type: 'columns',
                    items: [
                        { label: { en: 'Prompt instruction', zh: 'Prompt 文本叮嘱' }, verdict: 'bad', note: { en: 'Non-zero failure rate', zh: '无法 100% 保证顺序' } },
                        { label: { en: 'Forced tool_choice', zh: 'API 层强制 tool_choice' }, verdict: 'good', note: { en: '100% deterministic execution', zh: '100% 确定性顺序保证' } },
                    ],
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure traffic cop holding up a giant stop sign in front of a line of cars. ' +
                    'Bold black ink outlines, flat color fill, white background. No text.',
                motion: '2D cartoon animation. The traffic cop blows a whistle with animated sound waves radiating outwards.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Force it! On turn 1, set tool_choice to Tool A explicitly in code. On turn 2, switch tool_choice back to "auto"!',
                    zh: '用 API 硬约束！第 1 轮在代码中硬性将 tool_choice 设为 Tool A。拿到结果后，第 2 轮再放回 auto 让它自主运行！',
                },
                overlay: 'tool_choice forced → auto on turn two.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: '// Turn 1: Force exact first tool call', dim: true },
                        { text: 'const res1 = await api.create({ tool_choice: { name: "get_doi" } });', mark: true },
                        { text: '' },
                        { text: '// Turn 2: Switch back to normal auto mode', dim: true },
                        { text: 'const res2 = await api.create({ tool_choice: "auto" });', mark: true },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'When execution sequence is mandatory, API code constraints beat prompt suggestions every time!',
                    zh: '当执行顺序是硬性刚需时，API 代码级约束永远胜过 Prompt 里的好言相劝！',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Hard ordering requirements belong in code, not prompts.',
                        zh: '硬性依赖进 API 代码，软性偏好留系统 Prompt。',
                    },
                },
            },
        ],
    },
    {
        missionId: 'parallel-strike',
        domainOrder: 1,
        title: { en: 'Parallel Strike', zh: '同步突袭' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A single stick figure delivery worker carrying a massive tower of 20 boxes on his head, wobbling wildly. ' +
                    'Bold black hand-drawn lines, flat color, clean white background. No text.',
                motion: '2D cartoon animation. The stick figure wobbles left and right violently trying not to drop the stack.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Processing 10 independent files one after another sequentially takes over 3 minutes! None of them depend on each other, yet they queue up like traffic.',
                    zh: '串行处理 10 个互不相关的分析文件整整花了 3 分钟！明明它们之间毫无依赖，却在队列里傻傻排队！',
                },
                overlay: 'Twelve tasks in a single serial queue.',
                visual: {
                    type: 'flow',
                    nodes: ['File 1 (30s)', 'File 2 (30s)', 'File 3 (30s)', 'Total = 90s'],
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'Ten identical stick figure clones running out of a door simultaneously in a parallel fleet. ' +
                    'Bold black lines, flat color, white background. No text.',
                motion: '2D cartoon motion. Ten stick figure clones dash across the screen in unison.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Emit multiple tool calls in ONE SINGLE response turn! Total elapsed time drops from sum of all tasks to just the single slowest task.',
                    zh: '在【单次】模型响应中直接同时发出一排 Tool Call！总耗时瞬间从“全部相加”缩短为“仅取决于最慢的那一个”！',
                },
                overlay: 'One response, several Task calls, fanning out.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: '// Fan out multiple parallel tool invocations in 1 turn', dim: true },
                        { text: 'return {', mark: true },
                        { text: '  tool_calls: [analyzeFile(f1), analyzeFile(f2), analyzeFile(f3)]', mark: true },
                        { text: '};' },
                    ],
                },
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Not Batch API — that has a 24-hour SLA. Not session forks — those explore alternate branches. Parallel tool calls give instant speedups.',
                    zh: '不是 Batch API（那是 24 小时离线异步的）；也不是 session fork（那是做分支发散的）。同轮次多项 Tool Call 才是实时并行的正解！',
                },
                overlay: 'Batch ✗ · fork_session ✗ · parallel Task ✓',
                visual: {
                    type: 'columns',
                    items: [
                        { label: { en: 'Batch API', zh: 'Batch API' }, verdict: 'bad', note: { en: '24h latency SLA', zh: '24小时离线延迟' } },
                        { label: { en: 'Session Forking', zh: 'Session Forking' }, verdict: 'bad', note: { en: 'For exploring options', zh: '用来发散分支' } },
                        { label: { en: 'Multi Tool-Call', zh: '同轮多项 Tool Call' }, verdict: 'good', note: { en: 'Realtime parallel execution', zh: '实时并行并发' } },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'Independent tasks should launch together. Serial execution of parallelizable work is wasted latency!',
                    zh: '独立无依赖的任务必须齐头发射！能并行却串行跑就是在白白浪费延迟！',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Parallelizable tasks run sequentially = wasted user latency.',
                        zh: '互不依赖的任务串行执行，就是在白白浪费用户等待时间。',
                    },
                },
            },
        ],
    },
    {
        missionId: 'intel-handoff',
        domainOrder: 1,
        title: { en: 'Intel Handoff', zh: '情报交接' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure runner handing a baton to another stick figure, but the baton turns into a puff of smoke. ' +
                    'Bold black hand-drawn lines, simple flat colors, white background. No text.',
                motion: '2D cartoon animation. The baton vanishes mid-handoff while both stick figures stare in shock.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Subagent A and Subagent B finished gathering info. Now you spawn Synthesis Subagent C. What context does Subagent C actually inherit?',
                    zh: 'Subagent A 和 B 都搜集好了情报。现在你启动负责总结的 Subagent C。那么，C 究竟继承到了什么上下文？',
                },
                overlay: 'Two agents finished, a third about to spawn.',
                visual: {
                    type: 'flow',
                    nodes: ['Subagent A Output', 'Subagent B Output', 'Synthesis Subagent C (?)'],
                },
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Subagents do NOT inherit parent context automatically! Expecting context to magically teleport into a child agent is an architectural delusion.',
                    zh: 'Subagent 绝不会自动继承父级的上下文！幻想子 Agent 能神仙感知到它没参与过的历史对话，是致命的架构误区！',
                },
                overlay: 'Inherited context ✗ · prose summary ✗',
                visual: {
                    type: 'columns',
                    items: [
                        { label: { en: 'Magic Context Drift', zh: '幻想自动继承' }, verdict: 'bad', note: { en: 'Child starts with blank slate', zh: '子 Agent 上下文完全隔离' } },
                        { label: { en: 'Structured Handoff Prompt', zh: '显式结构化 Prompt 注入' }, verdict: 'good', note: { en: 'Explicit payload in prompt', zh: '通过 Prompt 显式传入数据' } },
                    ],
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure spy handing over a sealed briefcase marked with a giant glowing checkmark. ' +
                    'Bold black ink outlines, flat color, white clean background. No text.',
                motion: '2D cartoon motion. The briefcase is opened to reveal neatly organized illuminated files.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Pass everything explicitly in the system prompt! Use structured JSON schema (claim, source, metric) so critical details don\'t get lost in prose summaries.',
                    zh: '必须在 System Prompt 中显式传入结构化数据！用 JSON 列表清晰标注（论断、出处、指标），切忌只传糊成一团的模糊纯文本摘要。',
                },
                overlay: 'Structured findings block passed into the prompt.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: '// EXPLICIT structured payload in child agent prompt', dim: true },
                        { text: 'const childPrompt = `Synthesize these exact facts:', mark: true },
                        { text: '  - Fact 1: ${dataA.claim} (Source: ${dataA.source})', mark: true },
                        { text: '  - Fact 2: ${dataB.claim} (Source: ${dataB.source})`;', mark: true },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'Brief a subagent like an external contractor. Assume ZERO implicit context carries over!',
                    zh: '给 Subagent 派活就像给外包团队发指令：假设它对你的历史项目一无所知！',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Zero implicit context carries over to subagents.',
                        zh: '子 Agent 的上下文完全隔离，必须显式结构化透传。',
                    },
                },
            },
        ],
    },
    {
        missionId: 'follow-thread',
        domainOrder: 1,
        title: { en: 'Follow the Thread', zh: '深挖线索' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure sitting at a desk with a pair of scissors cutting a dollar bill in half over and over. ' +
                    'Bold black ink outlines, simple flat color fill, white background. No text.',
                motion: '2D cartoon animation. Money confetti falls all around while the stick figure laughs maniacally.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'A user asks a simple follow-up question. Your coordinator agent spawns a fresh subagent and resends all data it ALREADY holds in context!',
                    zh: '用户追问了一个极简单的问题。结果 Coordinator 又空转启动了一个新 Subagent，把手头【已拥有】的数据又传了一遍！',
                },
                overlay: 'Coordinator context → subagent → same data back.',
                visual: {
                    type: 'flow',
                    nodes: ['User Follow-up', 'Unnecessary Subagent Spawn', 'Duplicated Context (40s Delay)'],
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure student simply answering a quiz question instantly with a lightbulb popping over head. ' +
                    'Bold black lines, flat color, clean white background. No text.',
                motion: '2D cartoon animation. The lightbulb flashes bright yellow above the stick figure.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Just answer it directly in place! If the coordinator already holds the answer in context, delegating adds massive latency and token cost for zero benefit.',
                    zh: '直接在当前上下文回答即可！如果 Coordinator 手里已经有现成结论，盲目下派只会白白增加 40 秒延迟和数倍 Token 成本！',
                },
                overlay: 'Delegated path vs answering in place.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: '// BAD: delegating when context is already present', dim: true },
                        { text: 'if (hasInfoInContext) await spawnSubagent(task); // Wasteful!', mark: true },
                        { text: '' },
                        { text: '// GOOD: answer directly in place', dim: true },
                        { text: 'if (hasInfoInContext) return answerDirectly(userQuery);', mark: true },
                    ],
                },
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Trimming context or adding caching just makes an unneeded delegation slightly cheaper. Fix the root cause: stop delegating work you already solved!',
                    zh: '裁剪 Context 或加缓存只是让不必要的下派稍微便宜了一点。治本之道在于：不要对已经解决的问题重复下派！',
                },
                overlay: 'Trim ✗ · cache ✗ · do not delegate ✓',
                visual: {
                    type: 'columns',
                    items: [
                        { label: { en: 'Cache / Trim', zh: '加缓存/剪裁 Payload' }, verdict: 'bad', note: { en: 'Symptom patch only', zh: '治标不治本' } },
                        { label: { en: 'Answer In Place', zh: '就地直接回答' }, verdict: 'good', note: { en: 'Zero extra latency/cost', zh: '零额外延迟与开销' } },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'Before delegating to a child agent, verify if the answer is already sitting right in front of you!',
                    zh: '在决定把任务委派出去前，先看看答案是不是早就在你的上下文里了！',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Do not delegate questions you can already answer.',
                        zh: '手上已有的现成答案，切忌盲目再建 Subagent。',
                    },
                },
            },
        ],
    },
    {
        missionId: 'conflicting-intel',
        domainOrder: 1,
        title: { en: 'Conflicting Reports', zh: '矛盾情报' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'Two stick figures screaming at each other with angry speech bubbles while pointing at two totally different numbers on a whiteboard. ' +
                    'Bold black hand-drawn lines, flat color, clean white background. No text.',
                motion: '2D cartoon animation. The stick figures argue back and forth with exaggerated head bobs.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Subagent A reports $50 Billion. Subagent B reports $42 Billion. How do you resolve the disagreement in your final synthesis report?',
                    zh: 'Subagent A 汇报 500 亿，Subagent B 汇报 420 亿。两者存在矛盾，你的综合报告该如何处理？',
                },
                overlay: 'Two numbers, no way to choose between them.',
                visual: {
                    type: 'flow',
                    nodes: ['Source A: $50B', 'Conflict Detected', 'Source B: $42B'],
                },
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Do NOT average them to $46B! Averaging fabricates a number supported by ZERO sources. Picking the newer date is also flawed: newer does not mean correct!',
                    zh: '绝对不能强行取平均值（460 亿）！平均值造出了一个【没有任何数据源支持】假数据！按最新日期盲选同样不可靠：更新不等于更对！',
                },
                overlay: 'Average ✗ · pick the newer ✗',
                visual: {
                    type: 'columns',
                    items: [
                        { label: { en: 'Average (46B)', zh: '强行取平均 (460亿)' }, verdict: 'bad', note: { en: 'Fabricates fake number', zh: '凭空捏造无源数据' } },
                        { label: { en: 'Preserve Both + Flag', zh: '保留两者 + 标注冲突', }, verdict: 'good', note: { en: 'Surfaces methodology & conflict', zh: '如实呈递上游分歧' } },
                    ],
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure judge weighing two different balance scale pans calmly. ' +
                    'Bold black ink outlines, flat color, clean white background. No text.',
                motion: '2D cartoon animation. The balance scale sways gently in equilibrium.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Preserve both values! Return structured metadata (value, confidence, source) and set conflict_detected: true so downstream systems handle it transparently.',
                    zh: '保留两者！要求 Subagent 返回包含（数值、置信度、出处）的结构化元数据，并标记 conflict_detected: true，将真正分歧透明呈递给下游！',
                },
                overlay: 'Structured output with conflict_detected: true.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: '// Preserve conflicting data in structured JSON', dim: true },
                        { text: 'return {', mark: true },
                        { text: '  conflict_detected: true,', mark: true },
                        { text: '  reports: [{ val: "50B", src: "A" }, { val: "42B", src: "B" }]', mark: true },
                        { text: '};' },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'A system that quietly covers up conflicts is not more accurate — it is just wrong more quietly!',
                    zh: '一个把情报冲突掩耳盗铃藏起来的系统，并非更有把握，它只是错得更安静而已！',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Do not silently smooth over conflicting subagent data.',
                        zh: '切勿隐瞒情报冲突，透明标记方显真实。',
                    },
                },
            },
        ],
    },
    {
        missionId: 'chain-of-custody',
        domainOrder: 1,
        title: { en: 'Chain of Custody', zh: '证据链' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure detective putting plastic evidence bags into a vault marked with giant red wax seals. ' +
                    'Bold black outlines, flat colors, clean white background. No text.',
                motion: '2D cartoon motion. The detective stick figure stamps the wax seal on the evidence bag.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Subagent A writes a prose summary. Subagent B reads it and hallucinate citations that look completely realistic but point to nonexistent sources!',
                    zh: 'Subagent A 写了一份纯文本总结。Subagent B 读完后，竟然凭空捏造了一堆看似逼真、实则完全不存在的参考文献！',
                },
                overlay: 'Prose summary → fabricated citations.',
                visual: {
                    type: 'flow',
                    nodes: ['Prose Summary', 'Lost Attribution', 'Hallucinated Citations'],
                },
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'You cannot solve this with a polite prompt. Under token pressure, LLMs drop source citations first! Resending raw documents brings back Lost-in-the-Middle.',
                    zh: '光靠在 Prompt 里礼貌叮嘱根本没用！Token 压力一上来，大模型最先丢掉的就是出处信息！而硬塞原始全文又会触发 Lost-in-the-Middle。',
                },
                overlay: 'Prompt instruction ✗ · re-send everything ✗',
                visual: {
                    type: 'columns',
                    items: [
                        { label: { en: 'Prompt pleading', zh: 'Prompt 叮嘱求出处' }, verdict: 'bad', note: { en: 'Dropped under token pressure', zh: 'Token 紧张时最先被丢弃' } },
                        { label: { en: 'citation_id Index', zh: '分配 citation_id 引用链' }, verdict: 'good', note: { en: 'Deterministic attribution chain', zh: '全程携带结构化引用索引' } },
                    ],
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure stamping a glowing ID tag onto every document on a conveyor belt. ' +
                    'Bold black hand-drawn lines, flat color, clean white background. No text.',
                motion: '2D cartoon animation. Stamps slap down in rapid rhythm on paper documents.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Tag evidence at the source! Assign a citation_id in the first tool pass, force inline [1] tags in text, and pass a separate structured citation index downstream.',
                    zh: '在最最早的源头就绑定证据！在第 1 次 Tool Call 时分配 citation_id，生成文本带内联 [1] 标记，并随主体数据附带结构化引用索引！',
                },
                overlay: 'citation_id assigned early, index carried alongside.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: '// Assign explicit citation IDs early at data fetch step', dim: true },
                        { text: 'const item = { text: "...", citation_id: "src_001" };', mark: true },
                        { text: '// Pass citation index along with payload', dim: true },
                        { text: 'const payload = { summary: "Ref [src_001]", index: [item] };', mark: true },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'Attribution must be attached at data fetch time, not reconstructed after summarization!',
                    zh: '证据出处必须在抓取数据时就立即绑定，切勿试图在总结摘要后再去追溯！',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Attach source citations before summarization, never after.',
                        zh: '出处绑定须在摘要之前，丢失之后大模型必幻觉。',
                    },
                },
            },
        ],
    },
    {
        missionId: 'scene-changed',
        domainOrder: 1,
        title: { en: 'Scene Changed', zh: '现场已变' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure looking at a map, while the terrain behind him shifts into a giant maze. ' +
                    'Bold black lines, simple flat color fill, white background. No text.',
                motion: '2D cartoon animation. The maze walls pop up from the floor rapidly while the stick figure blinks.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Your agent analyzed 12 code files. Then a dev modified 3 of them. You need an updated review without re-analyzing all 12 files from scratch!',
                    zh: 'Agent 审完了 12 个代码文件。接着开发者修改了其中 3 个。你需要更新审查结论，但绝不想为这 12 个文件重新买单跑一遍！',
                },
                overlay: 'Twelve files, three now stale.',
                visual: {
                    type: 'flow',
                    nodes: ['9 Unchanged Files', '3 Stale Files Modified', 'Re-evaluation Strategy'],
                },
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Silently resuming the old session is dangerous — the agent relies on stale memory of the modified files! Full restart throws away 9 valid analysis steps.',
                    zh: '盲目恢复旧 Session 极其危险——Agent 会顽固相信对那 3 个文件的旧幻象！而完全重新洗牌重跑，又白白扔掉了 9 份完全有效的分析！',
                },
                overlay: 'Silent resume ✗ · full restart ✗',
                visual: {
                    type: 'columns',
                    items: [
                        { label: { en: 'Silent Session Resume', zh: '静默恢复旧 Session' }, verdict: 'bad', note: { en: 'Relies on stale file state', zh: '盲目相信已失效的旧数据' } },
                        { label: { en: 'Targeted Re-analysis', zh: '增量指定重审' }, verdict: 'good', note: { en: 'Re-analyze only changed 3 files', zh: '仅对修改的3个文件重新审计' } },
                    ],
                },
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
                    'A stick figure technician swapping only one dead lightbulb in a chandelier of 12 bulbs. ' +
                    'Bold black ink outlines, flat color, clean white background. No text.',
                motion: '2D cartoon motion. The new bulb clicks into place and flashes brightly.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Resume session and EXPLICITLY specify the exact 3 files that changed! Ask the model to re-analyze only those 3 in context of the unchanged 9.',
                    zh: '恢复 Session，并在消息中【明确指出】究竟是哪 3 个文件更新了！让模型只重新审计这 3 个文件，同时保留对另外 9 个文件的旧结论！',
                },
                overlay: 'Resume + explicit change list + targeted re-analysis.',
                visual: {
                    type: 'code',
                    lines: [
                        { text: '// EXPLICIT diff notification on session resume', dim: true },
                        { text: 'const msg = "Files A, B, C were modified. Update review for these 3.";', mark: true },
                        { text: 'await session.send(msg);', mark: true },
                    ],
                },
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'A session remembers turns. It does NOT watch your file system. When files change, you must notify the agent explicitly!',
                    zh: 'Session 记住的只是对话历史，它并不会帮你监控文件变化。文件变了，你必须显式告知 Agent！',
                },
                overlay: 'Takeaway card.',
                visual: {
                    type: 'card',
                    headline: {
                        en: 'Sessions remember history, not state changes. Notify explicitly.',
                        zh: 'Session 仅记录历史，状态变更须显式告知。',
                    },
                },
            },
        ],
    },
    {
        missionId: 'dont-delegate',
        domainOrder: 1,
        title: { en: 'Just Do It Yourself', zh: '这活儿自己干' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'A brass balance scale on a dark wooden base. The left pan is heaped with ' +
                    'grey rubble, the right pan holds one small tidy model village.',
                motion: 'Slow push in as the pans settle.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Three sentences, already retrieved, already sitting in context. Someone suggests routing them to a summarisation subagent, for consistency.',
                    zh: '三句话，已经取回来了，就在上下文里躺着。有人建议把它们交给专门的总结 subagent 处理，理由是保持风格统一。',
                },
                overlay: 'Three sentences → a whole delegation.',
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Macro of the brass scale tipping decisively, the heap of rubble dropping ' +
                    'as the small village rises.',
                motion: 'Macro; the scale tips.',
            },
            {
                id: 'the-code',
                kind: 'code',
                narration: {
                    en: 'Every delegation costs a tool call, a fresh context, a separate model invocation and a hand-back. For three sentences you already hold, that is the entire cost and none of the benefit.',
                    zh: '每一次委派都要付出：一次工具调用、一份全新上下文、一次独立的模型调用、一次结果回传。对已经握在手里的三句话来说，成本全付了，好处一点没有。',
                },
                overlay: 'Fixed overhead per delegation, itemised.',
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Delegate for three reasons only. The work would flood your context. It genuinely needs a different prompt or tool set. Or it can run in parallel with something else.',
                    zh: '只有三种情况才值得委派。任务会撑爆你的上下文。它确实需要不同的 prompt 或工具集。或者它能和别的工作并行。',
                },
                overlay: 'Three legitimate reasons to delegate.',
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'Subagents are not free. Reach for one when the shape of the work calls for it, not out of habit.',
                    zh: 'subagent 不是免费的。该用的时候用，是因为任务形态需要，而不是因为习惯。',
                },
                overlay: 'Takeaway card.',
            },
        ],
    },
    {
        missionId: 'pipeline-down',
        domainOrder: 1,
        title: { en: 'Pipeline Down', zh: '断线重连' },
        beats: [
            {
                id: 'open',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'A miniature data centre at night with half its racks gone dark. A single ' +
                    'glowing cable runs out of frame from one still-lit machine.',
                motion: 'Slow crane down the dark aisle.',
                overlay: 'Lesson title card.',
            },
            {
                id: 'problem',
                kind: 'diagram',
                narration: {
                    en: 'Twelve of eighteen documents done, and the pipeline crashes. Every agent is holding partial work. You need it back without redoing what already finished.',
                    zh: '十八份文档做完了十二份，流水线崩了。每个 agent 手里都有一半做完的活。你要把它恢复回来，又不能把已经完成的重做一遍。',
                },
                overlay: '12 of 18 complete, state scattered across agents.',
            },
            {
                id: 'trap',
                kind: 'compare',
                narration: {
                    en: 'Do not just resume the crashed session. Its tool results are from the moment it died, and the agent cannot tell which of them are still true. It will redo finished work, or skip the half-done document entirely.',
                    zh: '不要直接恢复那个崩掉的会话。它的工具结果停留在崩溃那一刻，agent 分不清哪些还成立。它要么把做完的重做一遍，要么把处理到一半的那份直接跳过。',
                },
                overlay: 'Blind --resume ✗ · fork_session ✗',
            },
            {
                id: 'switch',
                kind: 'veo',
                fixedSeconds: 8,
                imagePrompt:
                    'Macro of a glowing cable being plugged into a small port, light travelling ' +
                    'along it into the dark.',
                motion: 'Macro; the connector seats and light runs along the cable.',
            },
            {
                id: 'checkpoint',
                kind: 'code',
                narration: {
                    en: 'Write what finished into a structured checkpoint file. Start a fresh session. Inject the checkpoint as explicit context. Now the new session knows exactly where it stands, because you told it.',
                    zh: '把已完成的部分写进一个结构化的 checkpoint 文件。开一个全新会话。把 checkpoint 作为明确的上下文注入进去。这样新会话清楚地知道自己在哪，因为是你告诉它的。',
                },
                overlay: 'Checkpoint file → fresh session → injected context.',
            },
            {
                id: 'batch',
                kind: 'code',
                narration: {
                    en: 'Same instinct at batch scale. Ten thousand documents, three hundred fail on context length. Use the custom_id to pull out only those three hundred, chunk them, resubmit just those.',
                    zh: '批处理规模下也是同一个直觉。一万份文档，三百份因为上下文超长失败了。用 custom_id 把这三百份单独取出来，分块，只重新提交这三百份。',
                },
                overlay: 'custom_id → extract 300 → chunk → resubmit.',
            },
            {
                id: 'takeaway',
                kind: 'card',
                narration: {
                    en: 'Recovery is not about resuming. It is about knowing exactly what finished, and starting clean from there.',
                    zh: '恢复的关键不在于「接着跑」。而在于清楚地知道什么已经完成，然后从那里干干净净地重新开始。',
                },
                overlay: 'Takeaway card.',
            },
        ],
    },
];
