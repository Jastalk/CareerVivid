/**
 * CCA-F exam domains, as playable mission lines.
 *
 * Question content is adapted from two community study resources, both
 * licensed CC BY 4.0 and used here with attribution:
 *
 *  - https://github.com/avidevelops/claude-architect-exam-prep
 *    © avidevelops — domains 1 and 2, plus individual missions in 4 and 5.
 *    English question text, rationales, and takeaways are reproduced verbatim
 *    under that licence.
 *  - https://github.com/daronyondem/claude-architect-exam-guide
 *    © Daron Yondem — domain 3 (section 10 and practice scenario 10) and much
 *    of domains 4 and 5 (sections 5, 6 and 13, and practice scenarios 1, 4, 5,
 *    6 and 13). Changes were made: the guide is largely prose, so scenarios,
 *    options, and distractors are CareerVivid's, written to match the
 *    rationales it states.
 *
 * Every step records its own origin in `sourceQuestion`, which is what the
 * mission dialog shows the player — so attribution stays per-question rather
 * than relying on this header alone.
 *
 * The Chinese translation, mission framing, and level design are CareerVivid's
 * throughout. See docs/learning/ccaf-quest-sources.md for how to re-fetch the
 * upstream repos and which ones are licence-blocked.
 *
 * Marker positions are NOT stored here: they are derived at read time from
 * questLayout.ts, so adding a mission or a whole domain never needs manual
 * placement. See questSource.ts for the accessor the game actually uses.
 */

/**
 * Languages the course *content* is written in — a subset of the app's UI
 * languages (see SUPPORTED_LANGUAGES in constants.ts). Any UI language not
 * listed here reads the English source text, which is also the language the
 * real exam is sat in.
 *
 * To add one, extend this union and start filling the key in. Every language
 * but English is optional, so a half-finished translation degrades string by
 * string instead of breaking the build.
 */
export type QuestLocale = 'en' | 'zh';

export type LocalizedText = { en: string } & Partial<Record<QuestLocale, string>>;

export const pickLocale = (text: LocalizedText, locale: QuestLocale): string =>
  text[locale] || text.en;

export interface MissionOption {
  key: string;
  text: LocalizedText;
  /** Shown when the player picks this wrong option — why it is weaker. */
  rebuttal: LocalizedText;
}

/**
 * One decision inside a mission. Ordinary missions hold a single step; boss
 * missions chain several, so a player has to hold an architecture through more
 * than one call rather than recognise a single answer.
 */
export interface MissionStep {
  sourceQuestion: string;
  scenario: string;
  prompt: LocalizedText;
  options: MissionOption[];
  correct: string;
  explanation: LocalizedText;
  takeaway: LocalizedText;
}

export interface CcafMission {
  id: string;
  /** Position within its domain — drives the generated marker placement. */
  index: number;
  name: LocalizedText;
  site: LocalizedText;
  brief: LocalizedText;
  xp: number;
  isBoss: boolean;
  steps: MissionStep[];
}

export interface CcafDomain {
  id: string;
  order: number;
  /** Share of the real exam; used to weight the readiness score. */
  weight: number;
  name: LocalizedText;
  blurb: LocalizedText;
  missions: CcafMission[];
}

export const CCAF_DOMAINS: CcafDomain[] = [
  {
    id: "agentic-architecture",
    order: 1,
    weight: 27,
    name: { en: "Agentic Architecture & Orchestration", zh: "编排区 · Agentic 架构与编排" },
    blurb: { en: "How multi-agent systems split work, brief subagents, hand off context, and recover from failure.", zh: "多 agent 系统怎么拆任务、派subagent、传递上下文、从崩溃中恢复。" },
    missions: [
    {
      id: "read-the-signal",
      index: 0,
      name: { en: "Read the Signal", zh: "看信号" },
      site: { en: "Signal Box", zh: "信号房" },
      brief: { en: "Before anything else: how does the loop know it is finished? Guess wrong and the agent either stops early or never stops.", zh: "在别的之前先搞清楚：循环怎么知道自己做完了？判断错了，agent 要么提前收手，要么永远停不下来。" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §8 / §12 (Agentic Loop, Stop Reasons)",
        scenario: "Agentic Loop Control",
        prompt: { en: "You are implementing the loop for an agent that calls tools. On each turn the loop must decide whether to execute tools and continue, or to stop and present the answer. What should that decision be based on?", zh: "你正在为一个会调用工具的 agent 实现主循环。每一轮循环都必须决定：是执行工具并继续，还是停下来给出最终答案。这个决定应该依据什么？" },
        options: [
          { key: "A", text: { en: "Check whether the assistant's text says it has finished — for example \"I'm done\" or \"task complete\".", zh: "检查助手的回复文本里有没有说自己做完了——比如「我完成了」或「任务结束」。" }, rebuttal: { en: "Natural-language signals are not a control surface. The wording varies run to run, and the model may narrate completion while still holding a pending tool call.", zh: "自然语言信号不是控制面。措辞每次运行都可能不同，而且模型完全可能一边说「做完了」，一边还挂着待执行的工具调用。" } },
          { key: "B", text: { en: "Branch on stop_reason: keep looping while it is tool_use, finish when it is end_turn, and keep an iteration cap only as a safety net.", zh: "根据 stop_reason 分支：值为 tool_use 就继续循环，值为 end_turn 就结束，迭代上限只作为兜底的安全网保留。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Stop after a fixed number of iterations, tuned so that most tasks complete within it.", zh: "跑固定轮数后停止，把这个轮数调到大多数任务都能在其中完成。" }, rebuttal: { en: "Iteration limits are safety nets against runaway loops, not the primary stopping mechanism. Tuned to \"most\" tasks, they truncate the rest mid-work.", zh: "迭代上限是防止循环失控的安全网，不是主要的停止机制。调成「大多数」任务够用，就意味着剩下的会在半路被截断。" } },
          { key: "D", text: { en: "Give the model an explicit finish_task tool and stop when it calls it.", zh: "给模型一个显式的 finish_task 工具，它调用了就停。" }, rebuttal: { en: "Reinvents something the API already reports deterministically — and the model can simply forget to call it, leaving the loop spinning.", zh: "重复造了一个 API 本来就确定性上报的东西——而且模型完全可能忘记调用它，让循环空转下去。" } },
        ],
        correct: "B",
        explanation: { en: "Every response reports why generation stopped, and production code should branch on that field rather than assuming or inferring completion. tool_use means the model is requesting tool calls: execute them, return the results, and continue the loop. end_turn means the model finished naturally: use the response. Iteration caps still belong in the loop, but as a runaway guard, not as the signal. Parsing the assistant's prose for \"I'm done\" is the classic anti-pattern — it makes control flow depend on wording that is not guaranteed to be stable.", zh: "每次响应都会上报生成为什么停止，生产代码应该基于这个字段做分支，而不是靠假设或推断。tool_use 表示模型正在请求工具调用：执行它们、把结果送回、继续循环。end_turn 表示模型自然结束：直接使用这次响应。迭代上限仍然该留在循环里，但它的角色是防失控的护栏，而不是判定信号。去解析助手的自然语言回复找「我做完了」是经典反模式——它让控制流依赖于并不保证稳定的措辞。" },
        takeaway: { en: "Terminate agentic loops on stop_reason — tool_use means execute and continue, end_turn means stop. Iteration caps are a safety net, never the primary signal.", zh: "agentic 循环靠 stop_reason 来终止——tool_use 就执行并继续，end_turn 就停止。迭代上限是安全网，绝不是主判据。" },
      },
      ],
    },
    {
      id: "two-truncations",
      index: 1,
      name: { en: "Three Output Failure Types", zh: "三种「输出异常」原因" },
      site: { en: "Telegraph Office", zh: "电报房" },
      brief: { en: "Three different failures all look like \"incomplete output\" in the logs. The team retries all three. Not one of those retries can work.", zh: "三种不同的故障在日志里都长得像「输出不完整」。团队对三种都做了重试。而这三次重试里，没有一次能成。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §12 (Stop Reasons)",
        scenario: "Stop Reason Branching",
        prompt: { en: "A production agent logs \"incomplete output\" for three different responses: one returned stop_reason: max_tokens, one returned model_context_window_exceeded, and one returned refusal. The team's error handler retries all three with exponential backoff. What is wrong with that?", zh: "某生产环境的 agent 把三种不同的响应都记成了「输出不完整」：一个返回 stop_reason: max_tokens，一个返回 model_context_window_exceeded，还有一个返回 refusal。团队的错误处理逻辑对这三种都做了指数退避重试。这么做错在哪里？" },
        options: [
          { key: "A", text: { en: "Nothing — all three are transient conditions and backoff is the correct response.", zh: "没错——这三种都是瞬时状况，退避重试就是正确做法。" }, rebuttal: { en: "None of the three is transient. Backoff is for rate limits and 5xx overload, where the same request genuinely can succeed later.", zh: "这三种都不是瞬时的。退避重试针对的是限流和 5xx 过载——那些场景下同一个请求过一会儿确实能成功。" } },
          { key: "B", text: { en: "Only refusal needs different handling; the other two are output-length problems that a retry eventually resolves.", zh: "只有 refusal 需要区别处理；另外两个都是输出长度问题，重试几次总会过。" }, rebuttal: { en: "Conflates an output cap you set with an input that no longer fits the window. Neither changes on its own between attempts.", zh: "把「你自己设的输出上限」和「输入已经塞不进窗口」混为一谈了。这两者都不会在两次尝试之间自行改变。" } },
          { key: "C", text: { en: "None of the three can succeed unchanged: max_tokens needs a higher cap, streaming, or a split task; model_context_window_exceeded needs compaction or trimming; refusal needs surfacing to the user or routing to review.", zh: "这三种原样重试都不可能成功：max_tokens 需要提高上限、改用流式或拆分任务；model_context_window_exceeded 需要压缩或裁剪上下文；refusal 需要呈现给用户或转人工复核。" }, rebuttal: { en: "", zh: "" } },
          { key: "D", text: { en: "All three should be treated as model failures and escalated to a larger model.", zh: "这三种都该视为模型能力不足，升级到更大的模型。" }, rebuttal: { en: "max_tokens is a configuration issue and context overflow is an input-size issue; a bigger model fixes neither by itself, and it will refuse for the same safety reason.", zh: "max_tokens 是配置问题，上下文溢出是输入体积问题，换个更大的模型本身解决不了任何一个；而且出于同样的安全原因，它照样会拒绝。" } },
        ],
        correct: "C",
        explanation: { en: "max_tokens and model_context_window_exceeded look similar — both produce incomplete work — but have different fixes: one is an output budget you set, the other is input exceeding the model's window. Logging which one occurred prevents fixing the wrong limit. refusal is a decision, not a fault: surface it or route it to review, but do not blind-retry the same prompt. Retrying refusals and context-window overflows unchanged is a listed pitfall precisely because neither can succeed without changing the request.", zh: "max_tokens 和 model_context_window_exceeded 看起来很像——都产出了不完整的结果——但修法完全不同：前者是你自己设的输出预算，后者是输入超出了模型窗口。把到底是哪一种记进日志，才不会去修错那个上限。refusal 则是一个决定，不是故障：把它呈现出来或转去复核，但不要盲目重试同一个 prompt。「原样重试 refusal 和上下文溢出」之所以被列为陷阱，正是因为不改请求，这两者都不可能成功。" },
        takeaway: { en: "Branch on stop_reason before retrying. max_tokens is an output budget you set, model_context_window_exceeded is input that no longer fits, refusal is a decision — none succeeds on an unchanged retry.", zh: "重试之前先看 stop_reason 分支。max_tokens 是你设的输出预算，model_context_window_exceeded 是输入塞不下了，refusal 是一个决定——原样重试三者都不会成功。" },
      },
      ],
    },
    {
      id: "contract-breakdown",
      index: 2,
      name: { en: "Contract Breakdown", zh: "拆解合约" },
      site: { en: "City Hall", zh: "市政厅" },
      brief: { en: "The client wants a multi-angle review. Dumping it all on one model gets you mush — work out how to split it first.", zh: "客户要一份多维度分析报告。一次性丢给模型只会得到含糊的结果——先想清楚怎么拆。" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q20",
        scenario: "Workflow Decomposition",
        prompt: { en: "An agent is responsible for reviewing pull requests. Every PR must be reviewed for three specific aspects: code style, security vulnerabilities, and documentation accuracy. Which architectural pattern is best suited for this workflow?", zh: "一个 agent 负责审查 pull request。每个 PR 都必须从三个特定方面审查：代码风格、安全漏洞、文档准确性。哪种架构模式最适合这个工作流？" },
        options: [
          { key: "A", text: { en: "Dynamic subagent decomposition, letting a coordinator agent decide which aspects to check case-by-case.", zh: "动态子任务拆解，让 coordinator agent 逐案决定要检查哪些方面。" }, rebuttal: { en: "Dynamic decomposition is for unpredictable workflows where the required tasks change per user request.", zh: "动态拆解适用于任务随用户请求变化的不可预测工作流。" } },
          { key: "B", text: { en: "A routing agent that categorizes the PR and sends it to either a style, security, or docs specialist.", zh: "用一个路由 agent 对 PR 分类，然后分发给风格、安全或文档三个专家中的一个。" }, rebuttal: { en: "Routing implies only *one* of the specialists gets the job. The prompt says *every* PR gets all three.", zh: "路由意味着只有*一个*专家接手，但题目要求*每个* PR 三项都要审。" } },
          { key: "C", text: { en: "A single, massive prompt instructing one agent to analyze all three aspects simultaneously.", zh: "用一个巨大的 prompt，指示单个 agent 同时分析全部三个方面。" }, rebuttal: { en: "Massive all-in-one prompts lead to severe attention dilution and missed instructions.", zh: "巨型的一体化 prompt 会导致严重的注意力稀释和指令遗漏。" } },
          { key: "D", text: { en: "Prompt chaining: reviewing style, security, and documentation in separate sequential passes, then merging the outputs into a final synthesis.", zh: "Prompt chaining：分成依次执行的独立环节分别审查风格、安全和文档，最后把结果合并成一份综述。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "When a workflow is highly predictable, mandatory, and follows the exact same decomposition every time, *prompt chaining* is the superior pattern. Because style, security, and docs are entirely different cognitive lenses, chaining them sequentially in isolated passes prevents attention dilution (the model forgetting to check security while obsessing over style).", zh: "当一个工作流高度可预测、必须执行、且每次都按完全相同的方式拆解时，*prompt chaining* 是更优的模式。风格、安全和文档属于完全不同的认知视角，把它们串成彼此隔离的连续环节，可以避免注意力稀释（模型盯着风格看，却忘了检查安全）。" },
        takeaway: { en: "Use prompt chaining for predictable, static multi-aspect workflows; isolate distinct cognitive tasks into separate sequential passes before merging them into a final output.", zh: "对可预测、固定的多维度工作流使用 prompt chaining；把不同性质的认知任务拆到各自独立的环节里依次处理，最后再合并成结果。" },
      },
      ],
    },
    {
      id: "recruit-agents",
      index: 3,
      name: { en: "Recruiting Agents", zh: "招募 Agent" },
      site: { en: "Recruiting Hub", zh: "招募中心" },
      brief: { en: "You are briefing a subagent. Script every step, or hand it the goal and let it work?", zh: "你要给subagent 下指令。写死每一步，还是给目标让它自己判断？" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q23",
        scenario: "Agent Adaptability & Prompt Engineering",
        prompt: { en: "A coordinator provides exact search queries, source priorities, and date filters step-by-step to a web search subagent. However, the subagent often reports \"insufficient results\" instead of trying alternatives, drops in quality on emerging topics, and rarely surfaces unconventional sources. What is the most effective way to improve the subagent's adaptability?", zh: "一个 coordinator 逐步给 web search subagent 下发精确的搜索词、来源优先级和日期过滤条件。但这个subagent 经常直接报告「结果不足」而不去尝试其他路径，在新兴话题上质量下滑，也很少挖到非常规来源。提升该subagent 适应能力最有效的做法是？" },
        options: [
          { key: "A", text: { en: "Add a fallback instruction to report failure if fewer than 5 results are found.", zh: "加一条兜底指令：结果少于 5 条时报告失败。" }, rebuttal: { en: "Reinforces the rigidity that is causing the agent to quit early.", zh: "只是把死胡同变成了更早报告失败，并没有让它具备尝试替代方案的能力。" } },
          { key: "B", text: { en: "Replace procedural instructions with goal-oriented prompts detailing research goals and quality criteria.", zh: "把这种流程化的分步指令，换成说明研究目标与质量标准的目标导向 prompt。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Expand the exact query lists to cover emerging topics.", zh: "扩充精确搜索词清单，覆盖新兴话题。" }, rebuttal: { en: "Still procedural. You cannot hard-code queries for unknown emerging patterns.", zh: "穷举查询词无法覆盖不断出现的新兴话题，治标不治本。" } },
          { key: "D", text: { en: "Provide generic, single-word queries to broaden the search base.", zh: "改用宽泛的通用关键词查询来扩大搜索面。" }, rebuttal: { en: "Degrades the specificity of the research entirely.", zh: "宽泛的通用关键词查询会降低精确度，让结果质量更差。" } },
        ],
        correct: "B",
        explanation: { en: "Over-specifying coordinator prompts with procedural, step-by-step instructions turns the subagent into a rigid executor. If exact steps fail, it hits a dead end. Providing a research intent, minimum quality thresholds (e.g., \"minimum 5 distinct claims\"), and criteria for credible sources grants the subagent the authority and context to dynamically adapt its approach and form its own queries.", zh: "在 coordinator 的 prompt 里过度规定流程化的分步指令，会把subagent 变成僵化的执行器。一旦既定步骤失效，它就走进死胡同。给出研究意图、最低质量门槛（例如「至少 5 条不同论断」）以及可信来源的判定标准，才能赋予subagent 动态调整策略、自行构造查询的权限和上下文。" },
        takeaway: { en: "Replace step-by-step procedural instructions with research goals and quality criteria to give subagents the authority to adapt their approaches when pre-specified paths fail.", zh: "给subagent 的是目标和质量标准，而不是逐步的操作脚本——这样它才能在既定路径失效时自主调整。" },
      },
      ],
    },
    {
      id: "order-of-ops",
      index: 4,
      name: { en: "Order of Operations", zh: "行动顺序" },
      site: { en: "Dispatch Tower", zh: "调度塔" },
      brief: { en: "Some tools must run before the others work at all. How do you enforce that order?", zh: "有些工具必须先跑完才能跑下一个。怎么强制这个顺序？" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q33",
        scenario: "Tool Orchestration & Dependencies",
        prompt: { en: "A pipeline uses an extract_metadata tool that returns a DOI. It also has lookup_citations and verify_doi enrichment tools that *require* a DOI to function. When users ask to \"extract the metadata and tell me how cited it is\", the model sometimes calls the enrichment tools first, which fail because they lack the DOI. What is the most effective way to ensure structured metadata extraction happens first?", zh: "一条流水线中有一个 extract_metadata 工具会返回 DOI，另有 lookup_citations 和 verify_doi 两个增强工具，它们*必须*有 DOI 才能工作。当用户说「提取元数据并告诉我它的被引情况」时，模型有时会先调用增强工具，结果因为拿不到 DOI 而失败。确保结构化元数据提取先执行，最有效的做法是？" },
        options: [
          { key: "A", text: { en: "Add a prompt instruction to \"always call extract_metadata first.\"", zh: "在 prompt 里加一句「务必先调用 extract_metadata」。" }, rebuttal: { en: "Prompt instructions have a non-zero failure rate. Probabilistic prompting is inferior to deterministic API constraints.", zh: "prompt 指令存在不可忽略的失败率。概率性的prompt不如确定性的 API 约束可靠。" } },
          { key: "B", text: { en: "Set tool_choice to strictly force the extract_metadata tool on the first turn, then use tool_choice: \"auto\" for subsequent turns.", zh: "用 tool_choice 在第一轮强制指定 extract_metadata 工具，随后各轮再改为 tool_choice: \"auto\"。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Combine all three tools into a single massive tool.", zh: "把三个工具合并成一个巨大的工具。" }, rebuttal: { en: "Decreases composability and massively bloats tool complexity.", zh: "会降低可组合性，并让工具复杂度急剧膨胀。" } },
          { key: "D", text: { en: "Use tool_choice: \"auto\" but restrict the descriptions of the enrichment tools.", zh: "使用 tool_choice: \"auto\"，但限制增强工具的描述内容。" }, rebuttal: { en: "Under \"auto\", the model reads the full user request and may still attempt the second step in parallel.", zh: "在 \"auto\" 之下，模型读到完整用户请求后，仍可能并行尝试第二步。" } },
        ],
        correct: "B",
        explanation: { en: "When tools have strict dependencies (a DOI must exist before citations can be looked up), you must enforce a deterministic prerequisite gate. Setting tool_choice: {\"type\": \"tool\", \"name\": \"extract_metadata\"} explicitly forces the model to execute that tool on Turn 1. Once the DOI is returned to the context, you switch to \"auto\" on Turn 2 so the model can freely use the enrichment tools.", zh: "当工具之间存在严格依赖（必须先有 DOI 才能查引用）时，你需要设置一道确定性的前置关卡。设置 tool_choice: {\"type\": \"tool\", \"name\": \"extract_metadata\"} 会显式强制模型在第 1 轮执行该工具。等 DOI 返回进入上下文后，再在第 2 轮切换成 \"auto\"，模型就能自由使用增强工具了。" },
        takeaway: { en: "When deterministic execution order is required for tool dependencies, use forced tool_choice on the first turn, then release to \"auto\" on subsequent turns.", zh: "当工具依赖要求确定性的执行顺序时，第一轮使用强制的 tool_choice，随后各轮再放开为 \"auto\"。" },
      },
      ],
    },
    {
      id: "parallel-strike",
      index: 5,
      name: { en: "Parallel Strike", zh: "同步突袭" },
      site: { en: "Docks", zh: "港口" },
      brief: { en: "Independent jobs running at once can collapse your latency — if you fire them the right way.", zh: "互不依赖的多个任务同时进行，延迟能压到最低——但要用对方式。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q24",
        scenario: "Latency Optimization & Tool Execution",
        prompt: { en: "A document analysis subagent processes citations in complex legal cases sequentially. A landmark case citing 12 precedents currently takes over 3 minutes to process. What is the most effective way to reduce this latency?", zh: "一个 document analysis subagent 在处理复杂法律案件的引证时是串行执行的。一个引用了 12 个判例的标志性案件，目前需要超过 3 分钟才能处理完。降低这个延迟最有效的做法是？" },
        options: [
          { key: "A", text: { en: "Increase the subagent's context window.", zh: "扩大该subagent 的上下文窗口。" }, rebuttal: { en: "Does not address the sequential loop architecture.", zh: "没有触及串行循环这个架构问题。" } },
          { key: "B", text: { en: "Have the coordinator emit multiple Task tool calls simultaneously in a single response.", zh: "让 coordinator 在同一次响应中同时发出多个 Task 工具调用。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Use fork_session to speed up processing.", zh: "用 fork_session 来加速处理。" }, rebuttal: { en: "fork_session is for divergent exploration, not pipeline parallelism.", zh: "fork_session 用于发散式探索，不是流水线并行。" } },
          { key: "D", text: { en: "Use the Message Batches API.", zh: "改用 Message Batches API。" }, rebuttal: { en: "Batch API has up to a 24-hour SLA, making latency drastically worse.", zh: "Batch API 的 SLA 长达 24 小时，只会让延迟严重恶化。" } },
        ],
        correct: "B",
        explanation: { en: "Sequential processing of independent, parallelizable work is an anti-pattern. Instead of looping sequentially, the coordinator should emit all 12 Task tool calls in a single response turn. This spawns 12 parallel analysis subagents simultaneously, dropping the total latency from the *sum* of all tasks (3+ minutes) to the duration of the *longest single task* (~15-20 seconds).", zh: "把彼此独立、本可并行的工作串行处理是一种反模式。coordinator 不应循环串行执行，而应在单次响应轮次中一次性发出全部 12 个 Task 工具调用。这会同时派出 12 个并行的分析subagent，把总延迟从所有任务耗时之*和*（3 分钟以上）压缩到*最长的那一个*任务的耗时（约 15–20 秒）。" },
        takeaway: { en: "Emit multiple Task tool calls in a single coordinator response turn to achieve parallel execution and reduce pipeline latency.", zh: "在 coordinator 的单次响应轮次里发出多个 Task 工具调用，即可实现并行执行、降低流水线延迟。" },
      },
      ],
    },
    {
      id: "intel-handoff",
      index: 6,
      name: { en: "Subagent Handoff", zh: "subagent 交接" },
      site: { en: "Intel Station", zh: "情报站" },
      brief: { en: "A subagent starts blank. How do you get the earlier findings into its hands?", zh: "subagent 从零开始，什么都不知道。你怎么把前面的发现交到它手上？" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q22",
        scenario: "Agentic Architecture & Subagent Isolation",
        prompt: { en: "After web search and document analysis subagents finish their tasks, the coordinator needs to spawn a synthesis subagent to combine the findings. What is the correct approach for providing the synthesis subagent with the information it needs?", zh: "在 web search 和 document analysis 两个subagent 完成各自任务后，coordinator 需要派生一个 synthesis subagent 来汇总发现。为这个 synthesis subagent 提供所需信息的正确做法是？" },
        options: [
          { key: "A", text: { en: "Let the synthesis subagent call the search and analysis tools itself.", zh: "让 synthesis subagent 自己去调用搜索和分析工具。" }, rebuttal: { en: "Violates tool scoping. Synthesis agents should synthesize, not perform searches.", zh: "违反了工具职责边界。synthesis agent 应当负责汇总，而不是去执行搜索。" } },
          { key: "B", text: { en: "Let the synthesis subagent read directly from the coordinator's session history.", zh: "让 synthesis subagent 直接读取 coordinator 的会话历史。" }, rebuttal: { en: "Architectural impossibility; subagents cannot inherit coordinator context.", zh: "架构上不可能；subagent 无法继承 coordinator 的上下文。" } },
          { key: "C", text: { en: "Pass a prose summary of the findings to the synthesis subagent.", zh: "把发现写成一段非结构化文本摘要传给 synthesis subagent。" }, rebuttal: { en: "A prose summary loses source attribution, meaning the synthesis agent cannot cite sources it doesn't have.", zh: "非结构化文本摘要会丢失来源标注，导致 synthesis agent 无法引用它根本没有的出处。" } },
          { key: "D", text: { en: "Pass complete findings embedded directly in the synthesis subagent's prompt using a structured format separating content from metadata.", zh: "用一种把内容与元数据分离的结构化格式，把完整发现直接嵌入 synthesis subagent 的 prompt 中传入。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "Subagents start with zero knowledge and do *not* automatically inherit the coordinator's conversation history. The coordinator must explicitly inject all prior agent outputs directly into the synthesis subagent's prompt. Using a structured format (e.g., {claim, evidence, source_url, date}) ensures content, source metadata, and temporality are preserved so the synthesis agent can properly attribute findings.", zh: "subagent 从零知识开始，*不会*自动继承 coordinator 的对话历史。coordinator 必须把此前所有 agent 的输出显式注入到 synthesis subagent 的 prompt 里。采用结构化格式（例如 {claim, evidence, source_url, date}）能确保内容、来源元数据和时间信息都被保留，synthesis agent 才能正确标注发现出处。" },
        takeaway: { en: "Explicitly inject all prior findings directly into the subagent's prompt using a structured {claim, evidence, source, date} format; never rely on context inheritance or pass prose-only summaries.", zh: "用结构化的 {claim, evidence, source, date} 格式，把此前所有发现显式注入subagent 的 prompt；绝不要指望上下文继承，也不要只传非结构化文本摘要。" },
      },
      ],
    },
    {
      id: "follow-thread",
      index: 7,
      name: { en: "Follow the Thread", zh: "深挖线索" },
      site: { en: "Archives", zh: "档案馆" },
      brief: { en: "One follow-up question should not mean re-running the whole investigation.", zh: "追问一个细节，没必要把整条调查链重跑一遍。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q21",
        scenario: "Agentic Architecture & Context Management",
        prompt: { en: "In a production environment, follow-up summarization queries to a multi-agent system take over 40 seconds. Investigation shows the coordinator agent spawns a synthesis subagent for each follow-up request, passing 80000 tokens of accumulated findings. The coordinator already holds these findings in its context from orchestrating the initial research. What is the most effective way to improve response time for these follow-up summaries?", zh: "在生产环境中，对一个多 agent 系统发起的追问式摘要请求耗时超过 40 秒。排查发现 coordinator agent 会为每个追问都派生一个 synthesis subagent，并传入 80000 token 的累积发现。而 coordinator 在编排初次研究时，上下文里本来就已经有这些发现了。改善这类追问响应时间最有效的做法是？" },
        options: [
          { key: "A", text: { en: "Compress findings before passing them to the synthesis subagent.", zh: "在传给 synthesis subagent 之前先压缩这些发现。" }, rebuttal: { en: "Still spawns the subagent unnecessarily; reduces tokens but doesn't fix the architectural flaw.", zh: "仍然多余地派生了subagent；只减少了 token，没有修正架构上的缺陷。" } },
          { key: "B", text: { en: "Increase the synthesis subagent's context window.", zh: "扩大 synthesis subagent 的上下文窗口。" }, rebuttal: { en: "Does not reduce latency; the bottleneck is the spawning and token transfer process, not the context limits.", zh: "并不能降低延迟；瓶颈在于派生subagent 和传输 token 的过程，而不是上下文容量。" } },
          { key: "C", text: { en: "Handle the summarization directly using the coordinator's existing context.", zh: "直接用 coordinator 已有的上下文来完成这次摘要。" }, rebuttal: { en: "", zh: "" } },
          { key: "D", text: { en: "Cache synthesis subagent responses.", zh: "缓存 synthesis subagent 的响应。" }, rebuttal: { en: "Caching is a band-aid and does not fix the incorrect delegation pattern.", zh: "缓存只是权宜之计，没有修正错误的委派模式。" } },
        ],
        correct: "C",
        explanation: { en: "Since the coordinator already has the research findings in its context from the orchestration phase, follow-up summarization queries should be handled by the coordinator itself. Subagents start fresh and do not inherit the coordinator's conversation history. Spawning a subagent and passing 80k tokens is an anti-pattern when the coordinator can do the work with its existing context.", zh: "既然 coordinator 在编排阶段就已经把研究发现放进了自己的上下文，追问式摘要就应该由 coordinator 自己处理。subagent 是从零开始的，不会继承 coordinator 的对话历史。当 coordinator 用现有上下文就能完成工作时，还去派生一个subagent 并传 80k token，属于反模式。" },
        takeaway: { en: "If the coordinator already has the information in its context, handle it at the coordinator level—never spawn a subagent just to re-process data the coordinator already owns.", zh: "如果 coordinator 上下文里已经有这些信息，就在 coordinator 这一层处理掉——绝不要仅仅为了重新加工 coordinator 已经持有的数据而派生subagent。" },
      },
      ],
    },
    {
      id: "conflicting-intel",
      index: 8,
      name: { en: "Conflicting Reports", zh: "矛盾情报" },
      site: { en: "Courthouse", zh: "法院" },
      brief: { en: "Two reports disagree. Bury one, or surface the conflict honestly?", zh: "两份报告结论冲突。是隐瞒其中一个，还是如实上报分歧？" },
      xp: 160,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q25",
        scenario: "Context Management & Synthesis Precision",
        prompt: { en: "Final reports consistently mishandle uncertainty. For example, a web search agent returns a $50B estimate (unspecified methodology), while a document analysis agent returns a $35B estimate (±$7B, 95% CI). The coordinator either picks one arbitrarily or produces a vague, hedged statement. What approach best avoids this?", zh: "最终生成的报告总是无法妥善处理数据的不确定性。例如 web search agent 返回了 500 亿美元的估算（未说明推导方法），而 document analysis agent 返回了 350 亿美元（±70 亿，95% 置信区间）。coordinator 目前要么随机二选一，要么给出含糊不清的对冲表述。解决该问题最有效的架构做法是？" },
        options: [
          { key: "A", text: { en: "Instruct the coordinator to always prefer peer-reviewed sources.", zh: "指示 coordinator 始终优先采用经同行评审的来源。" }, rebuttal: { en: "A prompt-based rule is probabilistic and fails if only non-peer-reviewed data is available.", zh: "基于 prompt 的规则是概率性的，当只有非同行评审数据可用时就会失效。" } },
          { key: "B", text: { en: "Ask the synthesis subagent to pick the most recent figure.", zh: "让 synthesis subagent 选择最新公布的数值。" }, rebuttal: { en: "Recency does not equal accuracy.", zh: "更新不等于更准确。" } },
          { key: "C", text: { en: "Have the coordinator average the two conflicting values.", zh: "让 coordinator 把两个冲突数值取平均。" }, rebuttal: { en: "Averaging fabricates a number unsupported by either source, destroying attribution.", zh: "取平均会捏造出一个双方来源都不支持的数字，彻底破坏了出处归属。" } },
          { key: "D", text: { en: "Require subagents to return structured data with methodology/confidence metadata and a conflict_detected flag to preserve both values.", zh: "要求 subagent 返回附带方法论与置信度元数据的结构化数据，并用 conflict_detected 标记保留双方数值。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "Unstructured prose findings lose provenance. If subagents return plain text, the coordinator has no structured basis to distinguish high-quality methodologies from guesses. Subagents must return structured objects {claim, source_type, methodology, confidence, date}. When claims conflict, a programmatic conflict_detected flag forces the synthesis agent to handle it explicitly by presenting both values with their source context in the final report, rather than silently collapsing them.", zh: "非结构化的文本结论会丢失溯源信息。如果 subagent 仅返回纯文本，coordinator 就没有结构化依据去区分严谨的方法论和随意猜测。subagent 应当返回结构化对象 {claim, source_type, methodology, confidence, date}。当不同来源的结论发生冲突时，通过程序化的 conflict_detected 标记强制 synthesis agent 显式处理该分歧——在最终报告中同时展示两个数值及其出处上下文，而不是隐蔽地直接合并或抹平。" },
        takeaway: { en: "Require subagents to return structured metadata objects and use a conflict_detected boolean so synthesis agents preserve both values with attribution rather than silently collapsing them.", zh: "要求 subagent 返回结构化元数据对象并配合 conflict_detected 布尔标记，使 synthesis agent 能够保留双方数值及出处来源，避免无声合并或吞掉分歧。" },
      },
      ],
    },
    {
      id: "chain-of-custody",
      index: 9,
      name: { en: "Chain of Custody", zh: "证据链" },
      site: { en: "Evidence Vault", zh: "证物库" },
      brief: { en: "After layers of summarising, can every claim still be traced to its source?", zh: "经过多层汇总后，每条结论还能追溯到最初的来源吗？" },
      xp: 160,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q27",
        scenario: "Metadata Preservation & Attribution",
        prompt: { en: "A synthesis agent receives findings from upstream agents and passes a consolidated prose summary to a report generation agent. During testing, the report generator makes factual claims but cannot accurately attribute them because source metadata was lost during the summarization step. What is the most effective approach to ensure proper source attribution?", zh: "一个 synthesis agent 接收上游 agent 的发现，并把汇总后的非结构化文本摘要传给报告生成 agent。测试中发现，报告生成器提出了事实性论断，却无法准确标注出处，因为来源元数据在摘要环节就丢失了。确保正确标注来源最有效的做法是？" },
        options: [
          { key: "A", text: { en: "Ask the synthesis agent to re-include the full source text in its summary.", zh: "要求 synthesis agent 在摘要里重新附上完整原文。" }, rebuttal: { en: "Re-inflates the context window, causing \"lost in the middle\" failures.", zh: "会重新撑大上下文窗口，引发「中间信息丢失」问题。" } },
          { key: "B", text: { en: "Assign a citation_id at the earliest agent, and require the synthesis agent to produce an inline-tagged narrative alongside a preserved structured citation index.", zh: "在最上游的 agent 处就分配 citation_id，并要求 synthesis agent 输出带内联标记的叙述，同时保留一份结构化引用索引。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Instruct the report agent to infer the original sources from the claim content.", zh: "指示报告 agent 根据论断内容推断原始来源。" }, rebuttal: { en: "The report agent doesn't have the original sources; it will hallucinate plausible citations.", zh: "报告 agent 手上根本没有原始来源，它会编造出看似合理的引用。" } },
          { key: "D", text: { en: "Instruct the synthesis agent to \"preserve sources\" in its prose output.", zh: "在 prompt 里指示 synthesis agent 在非结构化文本输出中「保留来源」。" }, rebuttal: { en: "Prompt-based instructions are probabilistic; under token pressure, models will still drop metadata in prose.", zh: "基于 prompt 的指令是概率性的；在 token 压力下，模型在纯文本输出里照样会丢掉元数据。" } },
        ],
        correct: "B",
        explanation: { en: "Prose summaries inherently destroy metadata (URLs, page numbers, dates) as they collapse text into readable sentences. The structural fix is to separate content from metadata. Assign a citation_id at the source discovery level. The synthesis agent then writes a narrative using inline brackets (e.g., [src_001]), while the full metadata lives safely in a separate structured citation index array passed alongside the narrative.", zh: "非结构化文本摘要在把文本压缩成通顺句子的过程中，天然会摧毁元数据（URL、页码、日期）。结构性的解法是把内容与元数据分离：在来源被发现的那一层就分配 citation_id，之后 synthesis agent 用内联方括号（例如 [src_001]）撰写叙述，而完整元数据则安全地存放在随叙述一并传递的结构化引用索引数组中。" },
        takeaway: { en: "Assign citation_id tags at the earliest stage, require the synthesis agent to output an inline-tagged narrative, and pass a separate structured citation index to the final agent.", zh: "在最早的环节就打上 citation_id 标记，要求 synthesis agent 输出带内联标记的叙述，并把结构化引用索引单独传给最终 agent。" },
      },
      ],
    },
    {
      id: "scene-changed",
      index: 10,
      name: { en: "Scene Changed", zh: "现场已变" },
      site: { en: "Construction", zh: "工地" },
      brief: { en: "You edited files after stopping. Now you are resuming — the model still remembers the old version.", zh: "你中断后手动改了文件，现在要恢复会话——模型脑子里还是旧版本。" },
      xp: 180,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q18",
        scenario: "Iterative Workflows & State Updates",
        prompt: { en: "You are using an agent to analyze a 12-file codebase. After the agent completes its initial review, a developer modifies 3 of the files. You want the agent to update its findings efficiently. What is the best approach?", zh: "你在用一个 agent 分析一个 12 个文件的代码库。初次审查完成后，开发者修改了其中 3 个文件。你希望 agent 高效地更新它的发现。最好的做法是？" },
        options: [
          { key: "A", text: { en: "Resume the session, explicitly inform the agent which 3 files changed, and instruct it to re-analyze only those files in the context of its prior findings.", zh: "恢复原会话，明确告知 agent 哪 3 个文件变了，并指示它结合已有发现只重新分析这几个文件。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Start a completely fresh session and have the agent re-analyze all 12 files from scratch.", zh: "彻底新开一个会话，让 agent 从头重新分析全部 12 个文件。" }, rebuttal: { en: "Unnecessarily expensive and slow, throwing away perfectly valid context.", zh: "既贵又慢，白白丢掉了完全有效的上下文。" } },
          { key: "C", text: { en: "Resume the session but don't explicitly mention the changes, trusting the agent to notice the file diffs organically.", zh: "恢复会话但不主动说明改动，指望 agent 自己发现文件差异。" }, rebuttal: { en: "The agent may hallucinate that its prior tool findings are still true without looking, leading to stale reasoning.", zh: "agent 可能不去查看就臆断之前的工具发现仍然成立，导致推理基于过时信息。" } },
          { key: "D", text: { en: "Create a new session containing only the 3 modified files, discarding the context of the other 9 files.", zh: "新建一个只包含这 3 个被改文件的会话，丢弃另外 9 个文件的上下文。" }, rebuttal: { en: "Discarding the other 9 files removes crucial cross-file context needed for code analysis.", zh: "丢掉另外 9 个文件会移除代码分析所必需的跨文件上下文。" } },
        ],
        correct: "A",
        explanation: { en: "If the majority of a session's context is still valid, resuming is efficient. However, you must structurally inform the agent about the delta. By explicitly stating which files changed and directing it to re-analyze only those targets, the agent utilizes its existing contextual understanding of the codebase without wasting time re-verifying unmodified files.", zh: "如果会话中大部分上下文仍然有效，恢复会话是高效的——但你必须在结构上告知 agent 增量在哪。明确指出哪些文件发生了变化、并要求只针对这些目标重新分析，agent 就能复用它对代码库已有的理解，而不必浪费时间重新确认没动过的文件。" },
        takeaway: { en: "When resuming sessions after minor code/data changes, explicitly inform the resumed session about the specific changes for targeted re-analysis rather than forcing full re-exploration.", zh: "在代码或数据发生小幅改动后恢复会话时，要明确告知这次改动的具体内容，做定向重新分析，而不是逼它整体重新探索一遍。" },
      },
      ],
    },
    {
      id: "dont-delegate",
      index: 11,
      name: { en: "Just Do It Yourself", zh: "这活儿自己干" },
      site: { en: "Foreman's Hut", zh: "工头房" },
      brief: { en: "Three sentences, already in hand. Someone wants to spawn a subagent to summarise them.", zh: "三句话，已经拿在手里了。有人想派个subagent 去总结它们。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §8 (When the Coordinator Should Not Delegate)",
        scenario: "Delegation Overhead",
        prompt: { en: "A research coordinator has just retrieved three sentences and needs them summarised. A developer proposes routing this to a dedicated summarisation subagent so summaries stay consistent across the system. What is the better call?", zh: "一个研究 coordinator 刚取回三句话，需要做个总结。有开发者提议把这活儿交给专门的总结subagent，好让全系统的摘要风格保持一致。更好的选择是？" },
        options: [
          { key: "A", text: { en: "Delegate — a dedicated subagent gives consistent summaries and keeps the coordinator's prompt simple.", zh: "交出去——专用subagent 能保证摘要风格一致，也让 coordinator 的 prompt 更简单。" }, rebuttal: { en: "Each delegation costs a tool call, a fresh context, a separate model invocation, and a result hand-back. For three sentences already in context that is pure overhead.", zh: "每次委派都要付出：一次工具调用、一份全新上下文、一次独立的模型调用，外加一次结果回传。对已经在上下文里的三句话来说，这纯粹是开销。" } },
          { key: "B", text: { en: "Answer in the coordinator's own turn; reserve delegation for work that would flood the coordinator's context, genuinely needs a different prompt or tool set, or can run in parallel with other work.", zh: "就在 coordinator 自己这一轮里做掉；把委派留给那些会撑爆 coordinator 上下文、确实需要不同 prompt 或工具集、或者能与其他工作并行的任务。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Delegate, but reuse the document-analysis subagent's AgentDefinition to avoid maintaining another configuration.", zh: "交出去，但复用文档分析subagent 的 AgentDefinition，省得再维护一份配置。" }, rebuttal: { en: "Still pays the full delegation overhead, and a document-analysis brief is the wrong instruction set for three sentences.", zh: "委派的开销一分没省，而且文档分析的交底文件对三句话来说是错的指令集。" } },
          { key: "D", text: { en: "Always delegate summarisation, so the coordinator's context never grows.", zh: "总结类工作一律委派，这样 coordinator 的上下文永远不会膨胀。" }, rebuttal: { en: "\"Always\" ignores the shape of the work. Three sentences the coordinator already holds cost almost nothing to summarise in place.", zh: "「一律」忽略了任务本身的形态。coordinator 已经握在手里的三句话，就地总结几乎不花什么成本。" } },
        ],
        correct: "B",
        explanation: { en: "Subagents add overhead: each delegation incurs a tool call, a fresh context, a separate model invocation, and a result-passing step. When the coordinator already has the relevant context and the work is small, calling a subagent is slower and more expensive than just doing the work in the coordinator's turn. Save delegation for three cases: the task would flood the coordinator's context (a long document analysis), it genuinely needs a different prompt or tool set (a specialist persona), or it can run in parallel with other work.", zh: "subagent 是有开销的：每次委派都会产生一次工具调用、一份全新上下文、一次独立的模型调用，以及一次结果传递。当 coordinator 本来就握着相关上下文、任务体量又很小时，叫subagent 反而比自己这一轮直接做更慢也更贵。把委派留给三种情况：任务会撑爆 coordinator 的上下文（比如长文档分析）、确实需要不同的 prompt 或工具集（专家角色）、或者可以与其他工作并行。" },
        takeaway: { en: "Delegate for context isolation, a genuinely different prompt or tool set, or parallelism — not for small work the coordinator already has the context to do.", zh: "为了隔离上下文、需要不同 prompt/工具集、或者能并行才委派——不要为 coordinator 本来就能顺手做掉的小活儿委派。" },
      },
      ],
    },
    {
      id: "pipeline-down",
      index: 12,
      name: { en: "Pipeline Down", zh: "断线重连" },
      site: { en: "Data Center", zh: "数据中心" },
      brief: { en: "The pipeline died mid-run, and not in one place only. Two linked calls — get the first wrong and the second cannot save you.", zh: "流水线半路崩了，而且崩得不止一处。两个决策连着做——第一步错了，第二步就白搭。" },
      xp: 300,
      isBoss: true,
      steps: [
      {
        sourceQuestion: "avidevelops Q28",
        scenario: "Stateful Orchestration & Failure Recovery",
        prompt: { en: "A multi-agent research pipeline crashes after processing 12 out of 18 documents. Each agent has partially completed work. You need to resume the pipeline without losing the fidelity of prior findings or repeating completed work. What is the best state management approach?", zh: "一条多 agent 研究流水线在处理完 18 份文档中的 12 份后崩溃了。每个 agent 都有部分完成的工作。你需要在不丢失既有发现保真度、也不重复已完成工作的前提下恢复流水线。最好的状态管理方案是？" },
        options: [
          { key: "A", text: { en: "Run the --resume command directly on the crashed session.", zh: "直接对崩溃的会话执行 --resume 命令。" }, rebuttal: { en: "Stale tool results from the crashed session are unreliable.", zh: "崩溃会话里遗留的陈旧工具结果并不可靠。" } },
          { key: "B", text: { en: "Use fork_session from the crash point to branch the execution.", zh: "从崩溃点用 fork_session 分支出新的执行。" }, rebuttal: { en: "fork_session is for parallel divergent exploration, not pipeline failure recovery.", zh: "fork_session 用于并行的发散式探索，不是流水线故障恢复。" } },
          { key: "C", text: { en: "Write completed findings to a structured checkpoint file, start a fresh session, and inject the checkpoint as structured context.", zh: "把已完成的发现写入结构化的 checkpoint 文件，新开一个会话，并把 checkpoint 作为结构化上下文注入。" }, rebuttal: { en: "", zh: "" } },
          { key: "D", text: { en: "Resume the session without noting partial document states.", zh: "恢复会话，但不记录各文档的部分完成状态。" }, rebuttal: { en: "The agent will likely re-do completed work or skip the partially processed document entirely.", zh: "agent 很可能重做已完成的工作，或者干脆跳过那份处理了一半的文档。" } },
        ],
        correct: "C",
        explanation: { en: "When a pipeline crashes mid-execution, tool results in that session become stale and unreliable. Blindly resuming risks the agent re-processing data or corrupting context. The correct pattern is to extract completed work into a durable structured JSON checkpoint file, start a *new* session, and inject that checkpoint at the top of the prompt. You must explicitly tell the agent which documents are complete, which are partial (by section), and which are pending.", zh: "流水线执行到一半崩溃时，该会话中的工具结果会变得陈旧且不可靠。盲目恢复有可能让 agent 重复处理数据或污染上下文。正确的模式是：把已完成的工作提取到一个持久化的结构化 JSON checkpoint 文件中，新开一个会话，并把该 checkpoint 注入到 prompt 顶部。你必须明确告诉 agent 哪些文档已完成、哪些是部分完成（具体到章节）、哪些还没开始。" },
        takeaway: { en: "Extract completed work to a structured checkpoint file, start a fresh session, and explicitly inject the checkpoint—never blindly --resume a crashed session with stale tool results.", zh: "把已完成的工作提取成结构化 checkpoint 文件，新开会话并显式注入该 checkpoint——绝不要带着陈旧的工具结果盲目 --resume 一个崩溃的会话。" },
      },
      {
        sourceQuestion: "avidevelops Q31",
        scenario: "API Usage & Error Handling",
        prompt: { en: "After a daily batch of 10,000 documents completes processing, 300 documents (3%) fail with context_length_exceeded errors. The result file identifies each failure by its custom_id. What is the most cost-effective approach to process these failures?", zh: "一批 10000 份文档的日常批处理跑完后，有 300 份（3%）因 context_length_exceeded 失败。结果文件通过 custom_id 标识了每一个失败项。处理这些失败最具成本效益的做法是？" },
        options: [
          { key: "A", text: { en: "Resubmit all 10,000 documents with a smaller chunk size.", zh: "用更小的分块尺寸重新提交全部 10000 份文档。" }, rebuttal: { en: "Reprocessing 9,700 already-successful documents is a massive waste of API costs.", zh: "重跑 9700 份本已成功的文档，是巨大的 API 成本浪费。" } },
          { key: "B", text: { en: "Switch the 300 failed documents to the synchronous API.", zh: "把这 300 份失败文档改用同步 API 处理。" }, rebuttal: { en: "Synchronous API costs 2x more than Batch and offers no latency advantage for documents that require chunking anyway.", zh: "同步 API 成本是 Batch 的两倍，而且这些文档反正都需要分块，同步也带不来延迟优势。" } },
          { key: "C", text: { en: "Extract only the 300 failed documents using their custom_id, chunk them, and resubmit them as a new batch.", zh: "用 custom_id 只提取这 300 份失败文档，分块后作为新批次重新提交。" }, rebuttal: { en: "", zh: "" } },
          { key: "D", text: { en: "Increase the context window limit globally.", zh: "全局调高上下文窗口上限。" }, rebuttal: { en: "Context limits are fixed model constraints, not toggleable configuration settings.", zh: "上下文上限是模型的固定约束，不是可以随意调整的配置项。" } },
        ],
        correct: "C",
        explanation: { en: "Resubmitting successful documents wastes money (97% of the cost). You must use the custom_id mapping provided by the Batch API result file to isolate the 300 failures. Because the error is context_length_exceeded, the documents are too large for a single request. You must chunk those specific documents into smaller segments and submit them in a new batch request.", zh: "重新提交已成功的文档是在烧钱（占总成本的 97%）。你应该用 Batch API 结果文件提供的 custom_id 映射，把这 300 个失败项单独隔离出来。由于错误是 context_length_exceeded，说明这些文档对单次请求来说太大，必须把这些特定文档切成更小的片段，再作为新的批次请求提交。" },
        takeaway: { en: "Use custom_id to extract only failed documents, modify them (e.g., chunking for context limits), and resubmit only the failures to maintain Batch API cost efficiencies.", zh: "用 custom_id 只提取失败文档，做针对性修改（如为上下文限制分块），并只重新提交失败项，以保持 Batch API 的成本优势。" },
      },
      ],
    },
    ],
  },
  {
    id: "tool-mcp",
    order: 2,
    weight: 18,
    name: { en: "Tool Design & MCP Integration", zh: "工坊区 · 工具设计与 MCP" },
    blurb: { en: "How to shape tool schemas, descriptions, outputs, and errors so a model picks the right tool and calls it correctly.", zh: "怎么设计工具的 schema、描述、输出和错误，让模型选对工具、调对参数。" },
    missions: [
    {
      id: "write-the-spec",
      index: 0,
      name: { en: "Write the Spec", zh: "写清规格" },
      site: { en: "Design Office", zh: "设计院" },
      brief: { en: "The model keeps getting your parameter formats wrong. Before blaming it, read what your descriptions actually say.", zh: "模型老是把参数格式搞错。在骂它之前，先看看你的参数描述写了什么。" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q15",
        scenario: "Tool Schema Documentation",
        prompt: { en: "During execution, an agent repeatedly struggles to format inputs correctly for user_id and fields_to_update when calling an update tool. What is the most effective way to help the model understand exactly what values and formats to provide?", zh: "执行过程中，agent 反复无法为某个更新工具正确构造 user_id 和 fields_to_update 的输入格式。让模型准确理解该提供什么值、什么格式，最有效的做法是？" },
        options: [
          { key: "A", text: { en: "Write clear, detailed parameter descriptions in the tool schema.", zh: "在工具 schema 里为每个参数写清晰、详尽的描述。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Make the JSON schema extremely strict with complex regex constraints.", zh: "把 JSON schema 做得极其严格，加上复杂的正则约束。" }, rebuttal: { en: "Strict validation rejects bad input but doesn't tell the model *how* to generate good input in the first place.", zh: "严格校验只能拒绝错误输入，并不能告诉模型一开始该*怎么*生成正确输入。" } },
          { key: "C", text: { en: "Rename the tool to include formatting hints in the tool name itself.", zh: "把格式提示写进工具名称里。" }, rebuttal: { en: "A naming workaround is vastly inferior to proper, expansive descriptions.", zh: "靠命名变通远不如写完整的描述。" } },
          { key: "D", text: { en: "Add error-handling logic that explains the formatting rules only when the tool fails.", zh: "加错误处理逻辑，等工具失败时再解释格式规则。" }, rebuttal: { en: "Reactive error messages waste execution turns compared to proactive schema descriptions.", zh: "事后报错要多消耗一个执行轮次，不如在 schema 里提前说明。" } },
        ],
        correct: "A",
        explanation: { en: "Tool descriptions and parameter descriptions are the *primary mechanism* models use to understand expected inputs, formats, examples, and boundaries. Writing explicit instructions on a property (e.g., \"description\": \"UUID of the user to update (required)\") directly guides the model's token generation prior to tool execution.", zh: "工具描述和参数描述是模型理解预期输入、格式、示例与边界的*首要机制*。在属性上写明确的说明（例如 \"description\": \"要更新的用户 UUID（必填）\"），会在工具执行之前就直接引导模型的生成。" },
        takeaway: { en: "Clear, detailed parameter descriptions in the JSON schema are the primary and most important mechanism for guiding a model on input formatting.", zh: "JSON schema 里清晰详尽的参数描述，是引导模型正确构造输入的首要、也是最重要的机制。" },
      },
      ],
    },
    {
      id: "lock-the-inputs",
      index: 1,
      name: { en: "Lock the Inputs", zh: "锁定输入" },
      site: { en: "Records Room", zh: "档案室" },
      brief: { en: "The user says \"research database\"; the backend wants db_res_01. Which layer should do that translation?", zh: "用户说「研究数据库」，后端要的是 db_res_01。这个翻译该在哪一层做？" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q8",
        scenario: "Tool Schema Engineering",
        prompt: { en: "An agent needs to query specific internal databases, but users often refer to them using ambiguous natural language (e.g., \"research database\" instead of \"db_res_01\"). How should the tool's input schema be designed to handle this reliably?", zh: "一个 agent 需要查询特定的内部数据库，但用户常用含糊的自然语言指代它们（例如说「研究数据库」而不是 db_res_01）。工具的输入 schema 应该怎么设计才可靠？" },
        options: [
          { key: "A", text: { en: "Use an enum parameter explicitly listing the allowed database system names.", zh: "用 enum 参数，显式列出允许的数据库系统名。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Use a freeform string parameter and use backend fuzzy matching to find the right database.", zh: "用自由文本字符串参数，在后端做模糊匹配来找到正确的数据库。" }, rebuttal: { en: "Pushes ambiguity into the backend, making behavior unpredictable.", zh: "把歧义推给后端，会让行为变得不可预测。" } },
          { key: "C", text: { en: "Allow freeform strings but reject the tool call at runtime if the name is incorrect.", zh: "允许自由文本，但在运行时如果名称不对就拒绝该工具调用。" }, rebuttal: { en: "Rejection wastes an execution turn and increases latency when validation could be upfront.", zh: "拒绝调用浪费一个执行轮次、增加延迟，而这本可以在前置阶段就校验掉。" } },
          { key: "D", text: { en: "Default to searching all databases simultaneously if the user is ambiguous.", zh: "当用户表述含糊时，默认同时搜索所有数据库。" }, rebuttal: { en: "Searching everything spikes cost, latency, and context bloat.", zh: "全库搜索会让成本、延迟和上下文占用同时飙升。" } },
        ],
        correct: "A",
        explanation: { en: "Enums create a strict, constrained input contract. Providing an enum of exact backend values in the tool schema allows the model to leverage its semantic understanding to map the user's messy natural language (\"research database\") to the strict programmatic requirement (\"db_res_01\") *before* the tool executes.", zh: "enum 建立了严格、受约束的输入契约。在工具 schema 里提供确切后端值的 enum，能让模型在工具执行*之前*，就用它的语义理解把用户杂乱的自然语言（「研究数据库」）映射到严格的程序化取值（db_res_01）。" },
        takeaway: { en: "Use enum fields in tool schemas to map ambiguous natural language to strict backend values, improving tool use reliability deterministically.", zh: "在工具 schema 中使用 enum 字段，把含糊的自然语言确定性地映射到严格的后端取值。" },
      },
      ],
    },
    {
      id: "machine-ids",
      index: 2,
      name: { en: "Machine IDs", zh: "机器编号" },
      site: { en: "Registry", zh: "登记处" },
      brief: { en: "Nicknames collide and dates are ambiguous. Human text as a database key will break.", zh: "队名会重、日期会歧义。拿人话当数据库主键，迟早出事。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q13",
        scenario: "Tool Input Brittleness",
        prompt: { en: "An agent updates sports scores using an update_game_score(date, team_name) tool. The tool frequently fails due to ambiguous team nicknames, rematches on the same day, and date format variations. What is the most reliable tool design to fix this?", zh: "一个 agent 用 update_game_score(date, team_name) 工具更新比赛比分。由于球队昵称含糊、同一天有重赛、日期格式多变，该工具经常失败。最可靠的工具设计是？" },
        options: [
          { key: "A", text: { en: "Require strict ISO-8601 date formats and official full team names in the tool schema.", zh: "在工具 schema 中强制要求 ISO-8601 日期格式和官方全称队名。" }, rebuttal: { en: "Does not solve rematches, and LLMs still struggle with strict manual text formulation.", zh: "解决不了同日重赛的问题，而且 LLM 仍难以严格手工构造文本。" } },
          { key: "B", text: { en: "Improve the tool description to provide examples of correct formatting.", zh: "改进工具描述，给出正确格式的示例。" }, rebuttal: { en: "Documentation doesn't eliminate input ambiguity.", zh: "文档说明消除不了输入本身的歧义。" } },
          { key: "C", text: { en: "Add regex validation to the tool parameters to catch formatting errors early.", zh: "给工具参数加正则校验，尽早捕获格式错误。" }, rebuttal: { en: "Validation catches errors but doesn't help the agent resolve the correct underlying game.", zh: "校验能抓到格式错误，但帮不了 agent 判断到底是哪一场比赛。" } },
          { key: "D", text: { en: "Introduce a search_games tool that returns a game_id, and update the scoring tool to accept only the game_id.", zh: "引入 search_games 工具返回 game_id，并让计分工具只接受 game_id。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "Natural language attributes (like dates and team names) are inherently ambiguous and brittle when used as database keys. The architectural fix is to separate discovery from action. Use a lookup tool (search_games) that returns a machine-usable identifier (game_id), and force the mutative tool (update_score) to rely exclusively on that strict identifier.", zh: "自然语言属性（如日期和队名）天然含糊，用作数据库键极其脆弱。架构层面的解法是把「发现」和「操作」分开：用查找工具（search_games）返回机器可用的标识符（game_id），并强制写操作工具（update_score）只依赖这个严格标识符。" },
        takeaway: { en: "Replace tools relying on ambiguous human-entered text fields with a two-step lookup/action pattern utilizing strict machine-usable identifiers (IDs).", zh: "把依赖含糊人工文本字段的工具，改成「查找 → 操作」两步模式，中间用严格的机器标识符（ID）衔接。" },
      },
      ],
    },
    {
      id: "cut-the-chain",
      index: 3,
      name: { en: "Cut the Chain", zh: "砍掉串联" },
      site: { en: "Transfer Hub", zh: "中转站" },
      brief: { en: "The agent always looks up an address, then the neighbourhood. Should the model be doing that mechanical hop at all?", zh: "agent 每次都要先查地址再查街区。这一步机械劳动，真的该让模型做吗？" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q11",
        scenario: "Tool Interface Design",
        prompt: { en: "An agent frequently executes a two-step sequence: it calls get_property_details(property_id) to find an address, then passes that address to get_neighborhood_info(address). This chaining increases latency and failure rates. How should the tool design be improved?", zh: "一个 agent 经常执行两步序列：先调 get_property_details(property_id) 拿到地址，再把地址传给 get_neighborhood_info(address)。这种串联增加了延迟和失败率。工具设计该怎么改进？" },
        options: [
          { key: "A", text: { en: "Merge both tools into a single get_all_property_data tool.", zh: "把两个工具合并成一个 get_all_property_data。" }, rebuttal: { en: "Over-consolidates; neighborhood data and property data are still distinct capabilities.", zh: "合并过度了；街区信息和房产信息仍然是两种不同的能力。" } },
          { key: "B", text: { en: "Modify get_neighborhood_info to accept property_id directly and resolve the address internally.", zh: "改造 get_neighborhood_info 使其直接接受 property_id，在内部完成地址解析。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Improve the prompt to ensure the agent extracts the address more reliably.", zh: "优化 prompt，确保 agent 更可靠地提取地址。" }, rebuttal: { en: "Prompt improvements don't fix the architectural latency of sequential tool calls.", zh: "优化 prompt 解决不了串行工具调用在架构上带来的延迟。" } },
          { key: "D", text: { en: "Create a middle-tier helper tool to manage the data handoff.", zh: "创建一个中间层辅助工具来管理数据交接。" }, rebuttal: { en: "Adds more surface area and preserves the chaining flaw.", zh: "只是增加了更多接口面，串联的缺陷依然存在。" } },
        ],
        correct: "B",
        explanation: { en: "Forcing the agent to orchestrate a purely mechanical ID-to-string lookup wastes tokens, adds a failure point, and increases latency. If get_neighborhood_info frequently logically follows property identification, updating its interface to accept the property_id and handle the address lookup internally abstracts the complexity away from the LLM.", zh: "让 agent 去编排一次纯机械的「ID 换字符串」查找，既浪费 token、又多一个失败点、还增加延迟。既然 get_neighborhood_info 在逻辑上经常紧跟房产识别之后，就应该改造它的接口直接接受 property_id 并在内部处理地址查找，把这层复杂度从 LLM 面前抽象掉。" },
        takeaway: { en: "Design tools to internalize predictable dependencies (like ID lookups) to reduce avoidable chaining, latency, and failure coupling.", zh: "把可预测的依赖（例如 ID 查找）内化到工具内部，减少不必要的串联、延迟和失败耦合。" },
      },
      ],
    },
    {
      id: "draw-the-line",
      index: 4,
      name: { en: "Draw the Line", zh: "划清边界" },
      site: { en: "Warehouse", zh: "仓储区" },
      brief: { en: "Archive and delete are one word apart, and the model picked wrong. The fix is in the descriptions.", zh: "归档和删除只差一个字，模型却选错了。问题出在描述上。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q17",
        scenario: "Tool Boundaries & Selection",
        prompt: { en: "An agent has access to an archive_file tool and a delete_file tool. It frequently calls delete_file when it should have archived a backup file. What is the most direct way to fix this tool selection error?", zh: "一个 agent 同时拥有 archive_file 和 delete_file 两个工具。它经常在本该归档备份文件时调用了 delete_file。修正这种工具选择错误最直接的做法是？" },
        options: [
          { key: "A", text: { en: "Expand the tool descriptions to clearly define the purpose, boundaries, and specific scenarios where archiving is preferred over deleting.", zh: "扩写工具描述，明确定义各自用途、边界，以及何时该归档而非删除的具体场景。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Add a confirmation prompt directly inside the delete_file tool logic.", zh: "在 delete_file 的逻辑内部加一个确认提示。" }, rebuttal: { en: "A confirmation prompt protects against damage but doesn't fix the fact that the agent is making the wrong choice upstream.", zh: "确认提示能防止损害，但没有修正 agent 在上游就选错了工具这件事。" } },
          { key: "C", text: { en: "Remove the delete_file tool entirely and handle deletions via a separate batch process.", zh: "彻底移除 delete_file 工具，改由独立的批处理流程执行删除。" }, rebuttal: { en: "A massive architectural change that might not be possible given system requirements.", zh: "架构改动过大，且未必符合系统需求。" } },
          { key: "D", text: { en: "Provide few-shot examples in the system prompt showing correct usage.", zh: "在 system prompt 里提供正确用法的 few-shot 示例。" }, rebuttal: { en: "Few-shot prompting is helpful, but updating the native tool descriptions is the more robust, structural fix.", zh: "few-shot 有帮助，但直接更新原生工具描述是更稳健的结构性修复。" } },
        ],
        correct: "A",
        explanation: { en: "Tool descriptions are the highest-leverage mechanism for solving tool selection errors. When two tools have overlapping capabilities, their descriptions must explicitly define negative constraints and boundaries (e.g., delete_file: \"Permanently deletes a file. Do NOT use this for backup or compliance files—use archive_file instead.\").", zh: "工具描述是解决工具选择错误杠杆率最高的手段。当两个工具能力有重叠时，它们的描述必须显式写明否定性约束和边界（例如 delete_file：「永久删除文件。备份或合规文件请*不要*用本工具——改用 archive_file。」）。" },
        takeaway: { en: "When models confuse similar tools, rewrite the tool descriptions to explicitly define negative boundaries and specific scenarios for use.", zh: "当模型混淆相似工具时，改写工具描述、显式写明否定边界和适用场景。" },
      },
      ],
    },
    {
      id: "first-page-only",
      index: 5,
      name: { en: "First Page Only", zh: "只取首页" },
      site: { en: "Library", zh: "图书馆" },
      brief: { en: "Returning every match blows the context. But silently truncating is worse.", zh: "一次返回全部匹配结果，上下文直接爆掉。但静默截断更危险。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q9",
        scenario: "Tool Output Optimization",
        prompt: { en: "A search tool automatically fetches and returns all matching records from a database. This frequently causes severe latency and context bloat, as most agent tasks only need the first few results. What is the best way to redesign this tool's output?", zh: "一个搜索工具会自动抓取并返回数据库中所有匹配记录。这经常造成严重的延迟和上下文膨胀，因为多数 agent 任务只需要前几条结果。重新设计该工具输出的最佳方式是？" },
        options: [
          { key: "A", text: { en: "Silently limit the results to the top 5 most relevant hits.", zh: "静默地把结果限制为最相关的前 5 条。" }, rebuttal: { en: "Silently truncating results hides potentially vital information from the agent without warning.", zh: "静默截断会在毫无提示的情况下向 agent 隐藏可能关键的信息。" } },
          { key: "B", text: { en: "Return the first page of results along with pagination metadata (e.g., total count, cursor) so the agent can fetch more if needed.", zh: "返回第一页结果，并附带分页元数据（总数、游标），让 agent 需要时再取更多。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Create a separate fetch_next_page tool for the agent to use.", zh: "另建一个 fetch_next_page 工具供 agent 使用。" }, rebuttal: { en: "Clutters the toolset; pagination should be a parameter of the existing search tool.", zh: "让工具集变得臃肿；分页应当是既有搜索工具的一个参数。" } },
          { key: "D", text: { en: "Add a max_pages parameter to let the agent decide how many pages to fetch internally.", zh: "加一个 max_pages 参数，让 agent 自行决定内部抓取几页。" }, rebuttal: { en: "Still encourages hidden internal fetching and multi-page latency.", zh: "仍在鼓励隐式的内部抓取和多页延迟。" } },
        ],
        correct: "B",
        explanation: { en: "Returning hundreds of records wastes context and time. The optimal design is to return just the first page (e.g., 10 records) alongside metadata like total_matches and a next_cursor. This gives the agent the situational awareness to decide if it has enough information, or if it needs to pass the cursor back into the search tool to get page 2.", zh: "返回成百上千条记录既浪费上下文又浪费时间。最优设计是只返回第一页（例如 10 条），同时附上 total_matches 和 next_cursor 之类的元数据。这让 agent 有足够的态势感知来判断信息是否已经够用，或者需要把游标传回搜索工具去取第 2 页。" },
        takeaway: { en: "Return the first page with total match count and a cursor; give the agent explicit pagination state instead of incurring massive multi-page latency by default.", zh: "返回第一页并附上总匹配数和游标；把分页状态显式交给 agent，而不是默认承担多页抓取的巨大延迟。" },
      },
      ],
    },
    {
      id: "one-shape",
      index: 6,
      name: { en: "One Shape", zh: "统一格式" },
      site: { en: "Freight Yard", zh: "货运站" },
      brief: { en: "Five carriers, five JSON shapes. Let the model parse them, or normalise first?", zh: "五家承运商五种 JSON 格式。让模型自己解析，还是你先归一化？" },
      xp: 160,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q12",
        scenario: "External Integrations & Tool Responses",
        prompt: { en: "An agent tracks shipments using tools that call multiple different shipping carrier APIs. Each carrier returns timestamps, statuses, and delay codes in completely different JSON formats. How should you design the tool output provided to the agent?", zh: "一个 agent 通过调用多家物流承运商 API 的工具来追踪包裹。每家承运商返回的时间戳、状态和延误代码格式完全不同。提供给 agent 的工具输出该怎么设计？" },
        options: [
          { key: "A", text: { en: "Pass the raw JSON to the agent and provide extensive prompt instructions on how to parse each carrier's format.", zh: "把原始 JSON 直接传给 agent，并在 prompt 里详尽说明每家承运商的格式该怎么解析。" }, rebuttal: { en: "Pushes parsing logic into the prompt, making reasoning brittle.", zh: "把解析逻辑推进 prompt，会让推理变得脆弱。" } },
          { key: "B", text: { en: "Normalize the carrier responses into a single common schema (e.g., status, estimated_delivery) before returning it to the agent.", zh: "在返回给 agent 之前，把各承运商响应归一化成统一的公共 schema（例如 status、estimated_delivery）。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Create separate tracking tools for each carrier to keep the raw schemas distinct.", zh: "为每家承运商各建一个追踪工具，保持各自原始 schema 独立。" }, rebuttal: { en: "Bloats the tool set unnecessarily.", zh: "毫无必要地让工具集膨胀。" } },
          { key: "D", text: { en: "Return both the normalized schema and the full raw response to maximize context.", zh: "同时返回归一化 schema 和完整原始响应，以最大化上下文。" }, rebuttal: { en: "Adding raw output just adds noise and consumes context window space when the agent only needs the core fields.", zh: "在 agent 只需要核心字段时附带原始输出，只会增加噪音并占用上下文窗口。" } },
        ],
        correct: "B",
        explanation: { en: "Agents reason best over consistent, predictable data structures. Dumping heterogeneous, carrier-specific schemas into the context forces the LLM to expend attention on parsing formats rather than solving the user's core problem (e.g., determining delivery status). Normalizing the output in your middleware abstracts away vendor quirks.", zh: "agent 在一致、可预测的数据结构上推理效果最好。把各家格式各异的 schema 一股脑塞进上下文，会迫使 LLM 把注意力花在解析格式上，而不是解决用户的核心问题（比如判断送达状态）。在中间层做归一化，可以把厂商差异抽象掉。" },
        takeaway: { en: "Normalize heterogeneous API responses into a consistent common schema *before* returning them to the agent to reduce cognitive load and improve reasoning.", zh: "在返回给 agent *之前*，把异构 API 响应归一化成一致的公共 schema，降低认知负担、提升推理质量。" },
      },
      ],
    },
    {
      id: "triage-errors",
      index: 7,
      name: { en: "Triage the Errors", zh: "错误分诊" },
      site: { en: "Triage Post", zh: "急救站" },
      brief: { en: "A network timeout and a syntax error are not the same problem, and should not be handled the same way.", zh: "网络超时和语法错误是两码事，不该用同一种方式处理。" },
      xp: 160,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q16",
        scenario: "Error Recovery in Workflows",
        prompt: { en: "A tool experiences two types of errors: transient network timeouts, and permanent user syntax errors. How should the tool handle these errors to optimize the agent workflow?", zh: "某个工具会遇到两类错误：临时性的网络超时，和永久性的用户语法错误。为优化 agent 工作流，该工具应该怎么处理这两类错误？" },
        options: [
          { key: "A", text: { en: "Pass all errors to the agent and prompt it to retry timeouts but stop on syntax errors.", zh: "把所有错误都抛给 agent，并在 prompt 里要求它对超时重试、遇到语法错误则停止。" }, rebuttal: { en: "Pushing network retry loops to the LLM wastes expensive execution turns.", zh: "把网络重试循环推给 LLM，是在浪费昂贵的执行轮次。" } },
          { key: "B", text: { en: "Automatically retry transient network timeouts inside the tool, but immediately return syntax errors with clear validation details to the agent.", zh: "在工具内部自动重试临时性网络超时；语法错误则立即返回给 agent，并附带明确的校验细节。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Uniformly auto-retry all errors 3 times before returning a failure message to the agent.", zh: "所有错误一律自动重试 3 次，然后再返回失败信息给 agent。" }, rebuttal: { en: "Retrying syntax errors is a waste of compute; a malformed UUID will fail 3 times identically.", zh: "对语法错误重试纯属浪费算力；一个格式错误的 UUID 重试 3 次会以完全相同的方式失败 3 次。" } },
          { key: "D", text: { en: "Return all errors immediately to the agent as generic 'Tool Execution Failed' messages.", zh: "所有错误立即以统一的「Tool Execution Failed」信息返回给 agent。" }, rebuttal: { en: "Generic error messages give the LLM zero context to self-correct validation failures.", zh: "笼统的错误信息让 LLM 完全没有线索去自我纠正校验失败。" } },
        ],
        correct: "B",
        explanation: { en: "Agents shouldn't waste context tokens and LLM execution time resolving predictable, system-level transient errors (like timeouts). Those should be handled via standard engineering retry loops inside the tool. However, syntax/validation errors require the agent's reasoning capability to fix the input. Returning those immediately with explicit validation details allows the agent to self-correct efficiently.", zh: "agent 不该把上下文 token 和 LLM 执行时间浪费在可预测的系统级临时错误（如超时）上——这类错误应该用常规的工程重试循环在工具内部消化掉。而语法/校验错误需要 agent 的推理能力来修正输入，把这类错误连同明确的校验细节立即返回，agent 才能高效地自我纠正。" },
        takeaway: { en: "Abstract transient error retries (timeouts) into backend tool logic, but return validation/syntax errors immediately to the agent with explicit details so it can self-correct.", zh: "把临时性错误的重试抽象进工具后端逻辑；校验/语法错误则立即连同明确细节返回给 agent，让它自我纠正。" },
      },
      ],
    },
    {
      id: "trust-boundary",
      index: 8,
      name: { en: "Trust Boundary", zh: "信任边界" },
      site: { en: "Customs", zh: "海关" },
      brief: { en: "A third-party MCP server says it is read-only. Trust it wrongly and the scoping of fifty more tools falls with it.", zh: "第三方 MCP 服务器自称只读，你信吗？信错了，后面 50 个工具的作用域也会跟着失守。" },
      xp: 300,
      isBoss: true,
      steps: [
      {
        sourceQuestion: "avidevelops Q10",
        scenario: "Security & Model Context Protocol",
        prompt: { en: "A third-party Model Context Protocol (MCP) server provides tools annotated with readOnlyHint=true. You are designing the user confirmation flow for your agent application. How should you treat these tool annotations?", zh: "一个第三方 MCP（Model Context Protocol）服务器提供的工具标注了 readOnlyHint=true。你正在为你的 agent 应用设计用户确认流程。应该如何看待这些工具标注？" },
        options: [
          { key: "A", text: { en: "Trust the annotations automatically because the MCP server runs locally.", zh: "自动信任这些标注，因为该 MCP 服务器是在本地运行的。" }, rebuttal: { en: "Local execution does not mean the code/server is trustworthy.", zh: "本地运行并不代表这段代码/服务器就可信。" } },
          { key: "B", text: { en: "Treat the annotations as untrusted metadata, and base your confirmation bypass policy on your trust of the vendor/server, not the self-reported labels.", zh: "把这些标注视为不可信的元数据，确认豁免策略应基于你对该厂商/服务器的信任程度，而不是它自报的标签。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Infer the server's trustworthiness by testing the tools in a sandbox first.", zh: "先在沙箱里测试这些工具，以此推断服务器是否可信。" }, rebuttal: { en: "Sandbox behavior does not guarantee malicious capabilities aren't hidden.", zh: "沙箱中的表现并不能保证没有隐藏的恶意能力。" } },
          { key: "D", text: { en: "Bypass user confirmations safely, as the readOnlyHint guarantees no destructive actions can occur.", zh: "可以安全地跳过用户确认，因为 readOnlyHint 保证了不会发生破坏性操作。" }, rebuttal: { en: "readOnlyHint is just a label, not a cryptographic or system-level guarantee.", zh: "readOnlyHint 只是一个标签，不是密码学或系统级的保证。" } },
        ],
        correct: "B",
        explanation: { en: "Tool annotations like readOnlyHint or destructiveHint are entirely self-reported by the MCP server. If the server itself is unvetted or third-party, its metadata cannot be trusted as a security boundary. Confirmation bypass policies should be built on explicit trust of the vendor providing the server, not just taking the server's word for it via annotations.", zh: "readOnlyHint、destructiveHint 这类工具标注完全是 MCP 服务器*自行声明*的。如果服务器本身未经审核或来自第三方，它的元数据就不能作为安全边界。确认豁免策略应当建立在对提供该服务器的厂商的显式信任之上，而不是仅凭服务器的一面之词。" },
        takeaway: { en: "Treat MCP annotations as untrusted self-reported metadata unless the server itself is explicitly trusted by your system.", zh: "除非 MCP 服务器本身被你的系统显式信任，否则应把它的标注当作不可信的自报元数据。" },
      },
      {
        sourceQuestion: "avidevelops Q7",
        scenario: "Context & Tool Management",
        prompt: { en: "An agent has access to over 50 different API connector tools. During execution, it frequently selects the wrong connector, even when explicitly instructed to search first. What is the most effective architectural change to fix this tool selection failure?", zh: "一个 agent 可以访问 50 多个不同的 API 连接器工具。执行过程中，即使明确指示它先搜索，它仍频繁选错连接器。修复这种工具选择失败，最有效的架构改动是？" },
        options: [
          { key: "A", text: { en: "Rewrite the tool descriptions for all 50 connectors to be more detailed.", zh: "把全部 50 个连接器的工具描述重写得更详细。" }, rebuttal: { en: "Better descriptions help, but 50+ active tools still cause systemic cognitive overload.", zh: "改进描述有帮助，但同时激活 50 多个工具仍会造成系统性的认知过载。" } },
          { key: "B", text: { en: "Combine all 50 connectors into a single monolithic API call.", zh: "把 50 个连接器合并成一次单体 API 调用。" }, rebuttal: { en: "A monolithic API removes the agent's ability to inspect parameter requirements and choose correctly among subtle variants.", zh: "单体 API 会剥夺 agent 检查参数要求、在细微变体之间正确选择的能力。" } },
          { key: "C", text: { en: "Implement better error handling so the agent can recover after selecting the wrong connector.", zh: "完善错误处理，让 agent 在选错连接器后能够恢复。" }, rebuttal: { en: "Error handling is a reactive band-aid; dynamic scoping prevents the error proactively.", zh: "错误处理是被动的补丁；动态作用域是主动预防这个错误。" } },
          { key: "D", text: { en: "Provide a search_connectors tool that dynamically scopes the available tool set, exposing only the relevant matched connectors to the agent.", zh: "提供一个 search_connectors 工具来动态收窄可用工具集，只把匹配到的相关连接器暴露给 agent。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "Exposing 50+ tools simultaneously degrades the model's decision-making accuracy (decision complexity). The architectural fix is to enforce dynamic scoping: the agent first calls search_connectors, and the system responds by injecting *only* the 2-3 matched, highly relevant connector tools into the agent's context for the next turn.", zh: "同时暴露 50 多个工具会显著降低模型的决策准确率（决策复杂度过高）。架构层面的解法是强制动态作用域：agent 先调用 search_connectors，系统随后只把匹配到的 2–3 个高相关连接器工具注入到它下一轮的上下文中。" },
        takeaway: { en: "Reduce decision complexity by dynamically exposing only relevant tools to the agent, rather than dumping 50+ tools into the context window simultaneously.", zh: "通过只动态暴露相关工具来降低决策复杂度，而不是一次性把 50 多个工具全塞进上下文窗口。" },
      },
      ],
    },
    ],
  },
  {
    id: "claude-code-config",
    order: 3,
    weight: 20,
    name: { en: "Claude Code Configuration & Workflows", zh: "工程区 · Claude Code 配置与工作流" },
    blurb: { en: "Which layer a rule belongs in — memory, rules, skills, or hooks — plus sessions, plan mode, and how to brief a subagent that remembers nothing.", zh: "一条规则该放在哪一层——memory、rules、skills 还是 hooks——以及会话管理、plan mode，和怎么给一个什么都不记得的subagent 下指令。" },
    missions: [
    {
      id: "read-the-map",
      index: 0,
      name: { en: "Read the Map", zh: "先看地图" },
      site: { en: "Survey Office", zh: "测绘所" },
      brief: { en: "New codebase, no map. Reading two hundred files is not exploration — it is a stall.", zh: "陌生代码库，没有地图。把两百个文件读一遍不叫探索，叫卡死。" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §10 (Built-in Tool Selection)",
        scenario: "Codebase Exploration",
        prompt: { en: "An agent is asked to find every place a legacy checkout_v1 endpoint is still called inside a large monorepo, then explain the flow. Which approach uses the built-in tools correctly?", zh: "有人要求 agent 在一个大型 monorepo 里找出所有仍在调用旧版 checkout_v1 接口的地方，并解释其调用流程。哪种做法正确使用了内置工具？" },
        options: [
          { key: "A", text: { en: "Glob for files whose names contain \"checkout\", then read all of them.", zh: "用 Glob 匹配文件名里含 \"checkout\" 的文件，然后全部读一遍。" }, rebuttal: { en: "Filename search finds files named after the feature, not the call sites. A caller in orders/service.ts would be missed entirely.", zh: "文件名搜索只能找到以该功能命名的文件，找不到调用点。orders/service.ts 里的调用方会被完全漏掉。" } },
          { key: "B", text: { en: "Grep for the identifier to locate call sites, read the matching entry files, follow imports to the core abstractions, and trace one or two representative paths.", zh: "用 Grep 搜标识符定位调用点，读取命中的入口文件，顺着 import 追到核心抽象，再走通一两条有代表性的执行路径。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Read every file under the repository root so nothing is missed, then answer from full knowledge.", zh: "把仓库根目录下所有文件都读一遍确保不遗漏，然后基于完整认识作答。" }, rebuttal: { en: "Reading hundreds of files upfront burns the context window before the analysis starts. Map first, then read selectively.", zh: "一上来读几百个文件，会在分析开始前就烧光上下文窗口。应该先建立地图，再选择性精读。" } },
          { key: "D", text: { en: "Ask Bash to run a project-wide find command and infer the flow from the paths it prints.", zh: "让 Bash 跑一个全项目 find 命令，从打印出的路径推断调用流程。" }, rebuttal: { en: "Paths do not show what calls what. Locating files is only the first step; the flow has to be traced through the code.", zh: "路径本身说明不了谁调用了谁。定位文件只是第一步，流程还得在代码里追出来。" } },
        ],
        correct: "B",
        explanation: { en: "Grep searches text inside files; Glob matches filenames and paths. A call-site question is a text question, so it starts with Grep. From there the effective pattern is map-then-read: grep for route names, error codes, or function identifiers, read the matching entry files, follow imports to the core abstractions, and trace one or two representative execution paths rather than reading everything upfront.", zh: "Grep 搜的是文件*内部*的文本，Glob 匹配的是文件名和路径。「谁调用了它」是一个文本问题，所以要从 Grep 开始。之后的有效模式是「先建图、再精读」：grep 路由名、错误码或函数标识符，读取命中的入口文件，顺着 import 追到核心抽象，再走通一两条有代表性的执行路径——而不是一上来把所有文件读完。" },
        takeaway: { en: "Use Grep for text inside files and Glob for filenames; explore by mapping from entry points and tracing a few representative paths, not by reading hundreds of files upfront.", zh: "文件内容用 Grep，文件名用 Glob；探索要从入口点建图、追几条代表性路径，而不是先把几百个文件读完。" },
      },
      ],
    },
    {
      id: "plan-or-patch",
      index: 1,
      name: { en: "Plan or Patch", zh: "先规划还是直接改" },
      site: { en: "Site Trailer", zh: "工地办公室" },
      brief: { en: "Production is down. Do you stop to write a plan, or go straight in?", zh: "线上挂了。是停下来写方案，还是直接冲进去改？" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §10 (Plan Mode vs Direct Execution)",
        scenario: "Workflow Mode Selection",
        prompt: { en: "A team uses Claude Code for everything from typo fixes to multi-service migrations. They want a rule for when to start a session in plan mode. Which rule matches how the two modes are meant to be used?", zh: "某团队用 Claude Code 处理从改错别字到跨服务迁移的所有工作。他们想定一条规则，明确什么时候该以 plan mode 启动会话。哪条规则符合这两种模式的设计用途？" },
        options: [
          { key: "A", text: { en: "Always use plan mode — reviewing a plan first is never the wrong call.", zh: "永远用 plan mode——先审方案在任何情况下都不会错。" }, rebuttal: { en: "Plan mode on a one-line typo fix is pure overhead: a review gate for a change that needs no review.", zh: "给改一行错别字套上 plan mode 纯属额外开销：给一个不需要评审的改动加了评审闸门。" } },
          { key: "B", text: { en: "Use plan mode when the change spans many files, involves architectural choices or migrations, or needs approval before edits; use direct execution for small, localized, low-risk changes.", zh: "当改动跨越多个文件、涉及架构选择或迁移、或需要在动手前获得批准时用 plan mode；小范围、低风险、目标明确的改动直接执行。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Use plan mode whenever the problem is hard, so the model reasons more deeply before answering.", zh: "只要问题难就用 plan mode，让模型在回答前推理得更深入。" }, rebuttal: { en: "That is what extended thinking is for. Plan mode gates actions; it is not a reasoning-depth dial.", zh: "那是 extended thinking 的职责。plan mode 管的是「动不动手」，不是推理深度的旋钮。" } },
          { key: "D", text: { en: "Never use plan mode — approving a plan just adds a round trip before the same edits happen.", zh: "永远不用 plan mode——审批方案只是在同样的改动前多加一轮往返。" }, rebuttal: { en: "On broad migrations you lose the review and architecture planning exactly where a wrong call is most expensive.", zh: "在大范围迁移上，这恰恰在决策失误代价最高的地方丢掉了评审和架构规划。" } },
        ],
        explanation: { en: "Plan mode lets Claude read and propose a plan before touching disk, then waits for approval. That gate is worth its overhead when the change spans many files, when there are architectural choices, when the work involves migrations or breaking changes, or when a stakeholder must sign off — and it is wasted on small, localized, low-risk edits where the target is already clear. For an urgent production bug, gather evidence first: if the fix is obvious and narrow, implement directly; if the root cause turns out to have broad architectural impact, switch to planning before making the larger change.", zh: "plan mode 让 Claude 先只读地探索并提出方案，动盘之前等待批准。当改动跨越大量文件、存在架构选择、涉及迁移或破坏性变更、或者需要相关方签字时，这道闸门值回它的开销；而对目标明确的小范围低风险改动来说，它就是浪费。遇到线上紧急故障，先收集证据：如果修复方案明确且范围很窄，直接动手；如果根因牵出了大面积的架构影响，再切回规划模式做更大的改动。" },
        correct: "B",
        takeaway: { en: "Plan mode is a review gate for broad, architectural, or breaking changes — not a difficulty setting and not a default for every edit.", zh: "plan mode 是给大范围、架构性或破坏性改动用的评审闸门——它不是难度档位，也不该是每次改动的默认值。" },
      },
      ],
    },
    {
      id: "think-or-plan",
      index: 2,
      name: { en: "Two Different Dials", zh: "两个不同的旋钮" },
      site: { en: "Control Room", zh: "控制室" },
      brief: { en: "The agent keeps giving shallow analysis on a gnarly problem. Someone suggests plan mode. Wrong dial.", zh: "面对一个棘手问题，agent 的分析总是很浅。有人提议开 plan mode。旋钮拧错了。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §10 (Plan Mode vs Extended Thinking)",
        scenario: "Workflow Control vs Reasoning Quality",
        prompt: { en: "Two complaints land in the same week. Team A says the agent jumps straight to edits without surfacing trade-offs. Team B says the agent's analysis of a subtle concurrency bug is consistently shallow. What should each team change?", zh: "同一周收到两条反馈。A 组说 agent 直接就开始改代码，从不摆出权衡取舍。B 组说 agent 对一个隐蔽的并发 bug 的分析总是很浅。这两组各自应该调整什么？" },
        options: [
          { key: "A", text: { en: "Team A: plan mode. Team B: extended thinking.", zh: "A 组：plan mode。B 组：extended thinking。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Both teams: plan mode, since planning produces deeper analysis as a side effect.", zh: "两组都用 plan mode，因为规划过程会附带产生更深入的分析。" }, rebuttal: { en: "Plan mode changes *when* the agent acts, not how hard it reasons. Team B's shallow analysis would come back in the plan itself.", zh: "plan mode 改变的是 agent *何时*动手，而不是它推理得多深。B 组的浅层分析会原样出现在方案里。" } },
          { key: "C", text: { en: "Both teams: extended thinking, since a better-reasoning model will also know to ask before editing.", zh: "两组都用 extended thinking，因为推理更强的模型也会懂得先问再改。" }, rebuttal: { en: "More reasoning budget does not add an approval gate. A well-reasoned agent still edits straight away unless the workflow stops it.", zh: "增加推理预算并不会凭空加出一道审批闸门。除非工作流拦住它，推理再充分的 agent 照样直接动手。" } },
          { key: "D", text: { en: "Team A: extended thinking. Team B: plan mode.", zh: "A 组：extended thinking。B 组：plan mode。" }, rebuttal: { en: "Exactly backwards. The workflow complaint needs the workflow control; the reasoning complaint needs the reasoning budget.", zh: "正好反了。工作流层面的问题要用工作流控制解决，推理层面的问题要用推理预算解决。" } },
        ],
        correct: "A",
        explanation: { en: "These are different mechanisms and should not be conflated. Plan mode is a Claude Code session mode in which the assistant explores read-only and produces a plan before any edits, then waits for user approval — it is about workflow control, gating the transition from thinking to doing so a human can review the strategy. Extended thinking is a model capability giving Claude more internal reasoning budget before producing output; it is about reasoning quality on hard problems and does not by itself change whether the model takes actions or asks for approval. They compose — plan mode to review-gate the workflow, extended thinking for harder reasoning during planning — but they fix different complaints.", zh: "这是两套不同的机制，不该混为一谈。plan mode 是 Claude Code 的一种会话模式：助手先只读地探索、产出方案，在任何改动前等待用户批准——它管的是*工作流控制*，把「思考」到「动手」的过渡卡住，让人先审策略。extended thinking 是模型能力，在产出结果前给 Claude 更多内部推理预算——它管的是难题上的*推理质量*，本身并不改变模型会不会直接动手或请求批准。两者可以叠加使用——用 plan mode 卡住工作流评审，用 extended thinking 提升规划期的推理——但它们解决的是不同的问题。" },
        takeaway: { en: "Plan mode controls workflow (when the agent may act); extended thinking controls reasoning quality (how hard it thinks). Diagnose which one is actually failing before reaching for either.", zh: "plan mode 控制工作流（agent 什么时候可以动手），extended thinking 控制推理质量（它思考得多深）。先判断到底是哪一层出了问题，再决定动哪个。" },
      },
      ],
    },
    {
      id: "fork-the-session",
      index: 3,
      name: { en: "Two Roads", zh: "两条路" },
      site: { en: "Rail Yard", zh: "编组站" },
      brief: { en: "You want to try two rewrites from the same starting point and compare them honestly. One session will not do.", zh: "你想从同一个起点试两种重写方案，然后公平地比较。一个会话干不了这事。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §10 (Sessions)",
        scenario: "Session and Filesystem Isolation",
        prompt: { en: "After a long investigation session, an engineer wants to evaluate two competing refactors that both start from the state that investigation reached, then compare the results. What setup keeps the two attempts genuinely independent?", zh: "在一次漫长的调查会话之后，工程师想评估两种互相竞争的重构方案——两者都从这次调查所达到的状态出发——然后比较结果。什么样的配置能让两次尝试真正互不干扰？" },
        options: [
          { key: "A", text: { en: "Resume the original session twice in two terminals and keep the two conversations straight by hand.", zh: "在两个终端里分别恢复同一个原始会话，靠人工把两段对话理清楚。" }, rebuttal: { en: "Both processes append to the same session history, which makes later resumes confusing — and both still edit the same checkout.", zh: "两个进程会往同一份会话历史里追加内容，之后再恢复就乱了——而且它们改的还是同一个工作副本。" } },
          { key: "B", text: { en: "Fork the session twice so each attempt has its own transcript, and give each fork a separate git worktree.", zh: "把会话 fork 两次，让每次尝试拥有各自的记录，并给每个 fork 分配独立的 git worktree。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Copy the investigation's conclusions into two fresh sessions and work from there.", zh: "把调查结论复制到两个全新会话里，从那儿继续做。" }, rebuttal: { en: "Pasting context into a fresh session loses the tool-call history that the investigation produced.", zh: "把上下文粘贴进新会话，会丢掉调查过程中产生的工具调用历史。" } },
          { key: "D", text: { en: "Fork the session twice and let both forks work in the same checkout, since the transcripts are already separate.", zh: "fork 两次会话，让两个 fork 在同一个工作副本里干活——反正对话记录已经分开了。" }, rebuttal: { en: "Sessions persist conversation history, not filesystem state. Both forks would edit the same files and their changes would collide.", zh: "会话保存的是对话历史，不是文件系统状态。两个 fork 会改同一批文件，改动必然互相冲突。" } },
        ],
        correct: "B",
        explanation: { en: "--fork-session creates a new session branched from an existing transcript: the original is preserved untouched, and the fork's history is a copy of the original at the fork point. That is the right tool for evaluating two approaches from the same prior state. But sessions persist conversation history, not filesystem state — so each fork also needs its own git worktree, or both attempts end up editing the same checkout. Forking without isolating files leaves the changes colliding; isolating files without forking intermingles the transcripts.", zh: "--fork-session 会从既有记录分叉出一个新会话：原会话原封不动地保留，fork 的历史是原会话在分叉点上的副本。要从同一个先前状态评估两种方案，这就是对的工具。但会话保存的是对话历史，不是文件系统状态——所以每个 fork 还需要各自的 git worktree，否则两次尝试最后改的是同一个工作副本。只 fork 不隔离文件，改动会撞车；只隔离文件不 fork，对话记录会缠在一起。" },
        takeaway: { en: "--fork-session branches the transcript; a git worktree branches the files. Comparing two approaches from one starting point needs both.", zh: "--fork-session 分叉的是对话记录，git worktree 分叉的是文件。要从一个起点比较两种方案，两者都得有。" },
      },
      ],
    },
    {
      id: "where-rules-live",
      index: 4,
      name: { en: "Where Rules Live", zh: "规则该住哪儿" },
      site: { en: "Records Vault", zh: "档案库" },
      brief: { en: "The API conventions doc is in the root CLAUDE.md. Every session pays for it, including the ones that never touch the API.", zh: "API 规范文档写在根目录的 CLAUDE.md 里。每个会话都要为它付费，包括那些根本不碰 API 的会话。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §10 (CLAUDE.md and Memory)",
        scenario: "Memory Scoping",
        prompt: { en: "A monorepo's root CLAUDE.md has grown to include detailed API endpoint conventions that matter only under services/api/. Sessions working on the frontend load all of it every time. What is the right fix?", zh: "某 monorepo 根目录的 CLAUDE.md 越写越长，已经包含了只在 services/api/ 下才有意义的详细接口规范。做前端的会话每次都要把这些全部载入。正确的修法是？" },
        options: [
          { key: "A", text: { en: "Move the API conventions into a .claude/rules/ file with a paths: glob so they load only when Claude reads matching files.", zh: "把 API 规范挪到 .claude/rules/ 下的文件里，配上 paths: glob，让它只在 Claude 读到匹配文件时才载入。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Move them into an imported file referenced with @services/api/conventions.md from the root CLAUDE.md.", zh: "把它们挪到独立文件，在根 CLAUDE.md 里用 @services/api/conventions.md 引入。" }, rebuttal: { en: "Imports are expanded into context at launch, so they help organization but do not save any tokens.", zh: "import 在启动时就会被展开进上下文，所以它有助于组织结构，但一个 token 也省不下来。" } },
          { key: "C", text: { en: "Leave them in the root CLAUDE.md but add \"only applies to services/api/\" at the top of the section.", zh: "留在根 CLAUDE.md 里，只在该章节顶部加一句「仅适用于 services/api/」。" }, rebuttal: { en: "The tokens are still spent on every session; a conditional sentence does not unload the content.", zh: "每个会话照样要花掉这些 token；加一句条件说明并不会把内容卸载掉。" } },
          { key: "D", text: { en: "Move them into ~/.claude/CLAUDE.md so they stop being part of the repo's context.", zh: "把它们挪到 ~/.claude/CLAUDE.md，这样就不再属于该仓库的上下文了。" }, rebuttal: { en: "User scope loads them into *every* project on that machine, and takes a team-shared convention out of the repo where collaborators need it.", zh: "用户级作用域会把它们载入这台机器上的*每一个*项目，而且把本该团队共享的规范挪出了仓库，别的协作者就看不到了。" } },
        ],
        correct: "A",
        explanation: { en: "CLAUDE.md files load every session, so anything conditional in them costs tokens and dilutes the parts that matter for ordinary work. Rules in .claude/rules/ can be scoped with a paths: glob in YAML frontmatter, and only enter context when Claude reads matching files. Reach for .claude/rules/ when instructions are large enough that loading them every session wastes context, or when different areas of the codebase have meaningfully different conventions. Keep CLAUDE.md for what genuinely belongs in every session: project-wide conventions, build commands, the architecture summary every contributor needs.", zh: "CLAUDE.md 每个会话都会加载，所以放在里面的条件性内容既费 token，又会稀释掉日常工作真正需要的部分。.claude/rules/ 里的规则可以在 YAML frontmatter 中用 paths: glob 限定作用域，只有当 Claude 读到匹配的文件时才进入上下文。当指令体量大到每次会话都加载就是浪费，或者代码库不同区域的规范确实差别很大时，就该用 .claude/rules/。CLAUDE.md 留给真正每个会话都需要的东西：全项目通用的约定、构建命令、每位贡献者都要知道的架构概要。" },
        takeaway: { en: "CLAUDE.md is for what every session needs; path-scoped .claude/rules/ is for what only part of the codebase needs. @imports organize content but still cost full context at launch.", zh: "CLAUDE.md 放每个会话都需要的东西；只有部分代码区域需要的，放进带 paths 作用域的 .claude/rules/。@import 只是整理结构，启动时照样占满上下文。" },
      },
      ],
    },
    {
      id: "brief-the-contractor",
      index: 5,
      name: { en: "Brief the Contractor", zh: "给外包写交底" },
      site: { en: "Contractor Gate", zh: "外包接待处" },
      brief: { en: "You called the same review subagent twice and expected it to remember round one. It remembers nothing.", zh: "你叫了同一个审查subagent 两次，指望它记得第一轮。它什么都不记得。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §10 (Subagents)",
        scenario: "Subagent Context Isolation",
        prompt: { en: "A coordinator invokes a code-review subagent, gets findings, applies fixes, then invokes the same subagent again to confirm the fixes. The second run re-reports issues that were already fixed and ignores the project's naming conventions from CLAUDE.md. What explains this?", zh: "一个 coordinator 调用代码审查subagent 拿到问题清单，应用修复，然后再次调用同一个subagent 确认修复结果。第二次运行又把已经修好的问题重报了一遍，还无视了 CLAUDE.md 里的项目命名规范。原因是什么？" },
        options: [
          { key: "A", text: { en: "The subagent's context window filled up between invocations and its earlier findings were compacted away.", zh: "两次调用之间subagent 的上下文窗口满了，早先的发现被压缩掉了。" }, rebuttal: { en: "There is nothing to compact — the second invocation never had the first one's context to begin with.", zh: "根本没有可压缩的东西——第二次调用从一开始就没拿到第一次的上下文。" } },
          { key: "B", text: { en: "Each invocation is fresh: a subagent receives only its own definition plus the prompt the parent constructed, so the parent must restate the prior findings and any conventions it needs.", zh: "每次调用都是全新的：subagent 只拿到自身定义加上 parent 为这次调用构造的 prompt，所以 parent 必须把先前的发现和所需规范重新讲一遍。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "The subagent lacks permission to read CLAUDE.md and to access its own prior transcripts.", zh: "subagent 没有读取 CLAUDE.md 和访问自身历史记录的权限。" }, rebuttal: { en: "This is not a permission problem. Prior turns are not part of a subagent's context at all, whatever its tool access.", zh: "这不是权限问题。不论它有什么工具权限，先前的对话轮次根本就不在subagent 的上下文里。" } },
          { key: "D", text: { en: "Subagents run on a smaller model that cannot hold multi-turn state reliably.", zh: "subagent 跑在较小的模型上，无法可靠地保持多轮状态。" }, rebuttal: { en: "Model size is unrelated. Even the largest model cannot recall turns it was never shown.", zh: "跟模型大小无关。再大的模型也回忆不起从未展示给它的对话。" } },
        ],
        correct: "B",
        explanation: { en: "A subagent does not inherit the parent's conversation. When the parent launches it, the subagent receives its AgentDefinition — its own system prompt, allowed tools, model selection — and the prompt string the parent constructed for that specific invocation. It does not see the parent's earlier turns, prior tool results, or any other subagent's output. This keeps subagent context focused, but it means the parent must restate every fact the subagent will need: treat the prompt like a brief to a contractor and assume nothing carries over. Two practical consequences: reference the project's conventions explicitly rather than assuming CLAUDE.md is loaded, and if state must persist across invocations, the parent persists it and re-supplies the relevant slice each time.", zh: "subagent 不会继承 parent 的对话。parent 启动它时，subagent 拿到的是自己的 AgentDefinition——它自身的 system prompt、允许使用的工具、模型选择——外加 parent 为这次特定调用构造的 prompt 字符串。它看不到 parent 之前的对话轮次、之前的工具结果，也看不到其他subagent 的输出。这样做是为了让subagent 的上下文保持聚焦，但也意味着 parent 必须把subagent 需要的每一条事实重新讲清楚：把给subagent 的 prompt 当作给外包方的交底文件，默认什么都不会自动带过去。两个实际后果：项目规范要显式写进 prompt，别指望 CLAUDE.md 一定被加载；如果状态需要跨调用保留，得由 parent 自己存下来，每次调用再把相关的一部分重新喂进去。" },
        takeaway: { en: "Every subagent invocation starts fresh — it sees only its definition and the prompt you wrote. Restate the conventions and the prior state; do not assume anything carries over.", zh: "subagent 的每次调用都是全新开始——它只看得到自身定义和你写的 prompt。规范和先前状态都要重述一遍，别指望有东西会自动带过去。" },
      },
      ],
    },
    {
      id: "command-or-skill",
      index: 6,
      name: { en: "Called or Recognised", zh: "人喊还是自己认" },
      site: { en: "Dispatch Board", zh: "派工板" },
      brief: { en: "Two workflows, both written down. One should wait to be called; the other should notice it is needed.", zh: "两套流程都写好了。一套该等人来喊，另一套该自己认出该上场了。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §10 (Skills / Slash Commands)",
        scenario: "Invocation Model Selection",
        prompt: { en: "A platform team has two documented procedures: a 400-line database migration playbook that should apply whenever someone is actually doing a migration, and a release-notes formatting routine that engineers should run deliberately at release time. How should each be packaged?", zh: "某平台团队有两套成文流程：一份 400 行的数据库迁移操作手册，只要有人真在做迁移就该适用；以及一套发布说明格式化流程，工程师应在发版时主动执行。这两套各自该怎么打包？" },
        options: [
          { key: "A", text: { en: "Migration playbook as a skill; release notes as a slash command.", zh: "迁移手册做成 skill；发布说明做成 slash command。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Both as slash commands, so a human always decides when they run.", zh: "两套都做成 slash command，让人来决定何时运行。" }, rebuttal: { en: "The migration playbook should trigger from the nature of the task, not from someone remembering to type a command.", zh: "迁移手册应该由任务性质本身触发，而不是靠某个人记得去敲命令。" } },
          { key: "C", text: { en: "Both in the root CLAUDE.md, so neither can be missed.", zh: "两套都写进根 CLAUDE.md，这样都不会被漏掉。" }, rebuttal: { en: "That loads 400 lines of migration detail into every session, bloating context and diluting the rules that matter for ordinary work.", zh: "这会把 400 行迁移细节塞进每个会话，撑大上下文，还稀释了日常工作真正需要的规则。" } },
          { key: "D", text: { en: "Migration playbook as a slash command; release notes as a skill.", zh: "迁移手册做成 slash command；发布说明做成 skill。" }, rebuttal: { en: "Backwards. Release notes are the deliberate human act; the migration procedure is the one that should be recognised from the task.", zh: "反了。发布说明才是那个「人主动执行」的动作；迁移流程才是应该由任务自动识别触发的那个。" } },
        ],
        correct: "A",
        explanation: { en: "A skill packages task-specific instructions in a folder with a SKILL.md: the short description stays in context, and the body loads on demand when the model judges the skill relevant or the user invokes it. That progressive disclosure is the point — a 400-line playbook costs a one-line description until it is actually needed. Slash commands are reusable prompts the human decides to run. Prefer a skill when the workflow should trigger from the nature of the task (\"this is a database migration, load the migration procedure\"); prefer a slash command when invocation should remain a deliberate human act, like /release-notes or /review.", zh: "skill 是一个文件夹，里面有 SKILL.md，用来打包特定任务的指令：简短的描述常驻上下文，正文只在模型判断该 skill 相关、或用户主动调用时才按需加载。这种渐进式披露正是它的意义所在——400 行手册在真正用到之前，只占一行描述的成本。slash command 则是由人决定何时运行的可复用 prompt。当流程应该由任务性质本身触发时（「这是一次数据库迁移，把迁移流程加载进来」）选 skill；当调用应该保持为人的主动行为时（比如 /release-notes 或 /review）选 slash command。" },
        takeaway: { en: "Skills can be recognised from the task and load on demand; slash commands wait for a human to invoke them. Pick by who should decide that the workflow applies.", zh: "skill 能被任务自动识别并按需加载；slash command 要等人来调用。按「该由谁判断这套流程适用」来选。" },
      },
      ],
    },
    {
      id: "four-mechanisms",
      index: 7,
      name: { en: "Four Rules, Four Mechanisms", zh: "四条规则，四种机制" },
      site: { en: "Platform HQ", zh: "平台总部" },
      brief: { en: "The platform team wants four behaviours enforced. Two calls: map each to the right layer, then work out which of them a hook can actually be trusted with.", zh: "平台团队要落实四项行为。两个环节：先把每一项映射到正确的层，再想清楚其中哪些真能放心交给 hook。" },
      xp: 300,
      isBoss: true,
      steps: [
      {
        sourceQuestion: "daronyondem Practice Scenario 10",
        scenario: "Mechanism Mapping",
        prompt: { en: "A platform team wants four behaviors in Claude Code: (1) every session knows the monorepo's build commands and architecture; (2) API conventions apply only when working under services/api/; (3) a release checklist runs when someone is doing a release; (4) edits to files under generated/ are impossible. What is the best mapping?", zh: "某平台团队想在 Claude Code 中实现四项行为：(1) 每个会话都知道该 monorepo 的构建命令和架构；(2) API 规范仅在 services/api/ 下工作时适用；(3) 有人在做发版时运行发布检查清单；(4) 让 generated/ 目录下的文件根本不可能被修改。最佳映射是？" },
        options: [
          { key: "A", text: { en: "(1) project CLAUDE.md; (2) a .claude/rules/ file with a paths: glob; (3) a skill or slash command; (4) a PreToolUse hook or permissions.deny.", zh: "(1) 项目级 CLAUDE.md；(2) 带 paths: glob 的 .claude/rules/ 文件；(3) skill 或 slash command；(4) PreToolUse hook 或 permissions.deny。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Put all four in the root CLAUDE.md so they are always loaded.", zh: "四项全部写进根 CLAUDE.md，保证它们总是被加载。" }, rebuttal: { en: "Loads everything every session and enforces nothing — CLAUDE.md is context, not configuration.", zh: "每个会话都加载全部内容，却什么也强制不了——CLAUDE.md 是上下文，不是配置。" } },
          { key: "C", text: { en: "Implement all four as skills so they load only on demand.", zh: "四项全做成 skill，让它们只按需加载。" }, rebuttal: { en: "Hides always-needed facts behind on-demand loading — the build commands must be there every session.", zh: "把每个会话都需要的事实藏在按需加载后面——构建命令必须每次都在场。" } },
          { key: "D", text: { en: "(1) CLAUDE.md; (2) and (3) as .claude/rules/ files; (4) a CLAUDE.md instruction saying \"never edit generated/\".", zh: "(1) CLAUDE.md；(2) 和 (3) 都做成 .claude/rules/ 文件；(4) 在 CLAUDE.md 里写一句「绝不要修改 generated/」。" }, rebuttal: { en: "Misuses path-scoping for a task-scoped checklist — the rule would fire whenever those files are touched, release or not — and leaves the generated/ ban as soft guidance.", zh: "把任务作用域的检查清单错当成路径作用域——不管是不是在发版，只要碰到那些文件规则就会触发——而且把 generated/ 的禁令留成了软性建议。" } },
        ],
        correct: "A",
        explanation: { en: "Always-needed facts go in CLAUDE.md; path-scoped conventions in paths:-scoped rules; deliberately invoked procedures in a skill or slash command; absolute prohibitions in hooks or permissions, because memory is context, not enforcement. CLAUDE.md and rule files are loaded as context — the model reads them and tries to follow them, but there is no compliance guarantee. For behaviour that must apply regardless of what Claude decides, use hooks or permissions.deny. Memory shapes behaviour; hooks enforce it.", zh: "每个会话都需要的事实放 CLAUDE.md；按路径生效的规范放带 paths: 作用域的 rules；需要主动调用的流程做成 skill 或 slash command；绝对禁令交给 hooks 或 permissions——因为 memory 是上下文，不是强制手段。CLAUDE.md 和规则文件是作为*上下文*加载的，模型会读、会尽力遵守，但没有合规保证。对于不管 Claude 怎么判断都必须生效的行为，用 hooks 或 permissions.deny。memory 塑造行为，hooks 强制行为。" },
        takeaway: { en: "CLAUDE.md for every-session facts, path-scoped rules for area conventions, skills/slash commands for invoked procedures, hooks or permissions.deny for absolute prohibitions. Memory shapes behaviour; hooks enforce it.", zh: "CLAUDE.md 管每个会话都要的事实，路径作用域 rules 管分区规范，skill/slash command 管需要调用的流程，hooks 或 permissions.deny 管绝对禁令。memory 塑造行为，hooks 强制行为。" },
      },
      {
        sourceQuestion: "daronyondem §10 (Hooks and Permissions)",
        scenario: "Hook Supply Chain",
        prompt: { en: "Rule (4) is going into a PreToolUse hook. A teammate proposes pulling in a ready-made hook bundle from a third-party repo that also promises secret-scanning and auto-formatting, wired up by passing the org's API token as a hook argument. What is the correct assessment?", zh: "第(4)项准备用 PreToolUse hook 来实现。一位同事提议直接引入某第三方仓库现成的 hook 套件——它还附带密钥扫描和自动格式化功能，接入方式是把组织的 API token 作为 hook 参数传进去。正确的判断是？" },
        options: [
          { key: "A", text: { en: "Fine to adopt as-is: hooks run inside Claude Code's sandbox, so a third-party hook cannot reach the wider system.", zh: "可以照单全收：hook 运行在 Claude Code 的沙箱里，第三方 hook 碰不到更外层的系统。" }, rebuttal: { en: "There is no such sandbox. Hooks execute as code in your environment — shell commands in Claude Code, callbacks in the Agent SDK.", zh: "并不存在这样的沙箱。hook 是在你自己的环境里作为代码执行的——在 Claude Code 里是 shell 命令，在 Agent SDK 里是回调函数。" } },
          { key: "B", text: { en: "Review the hook configuration before enabling it, and do not pass the token as an argument hooks may log.", zh: "启用前先审查该 hook 配置，并且不要把 token 作为 hook 可能记录下来的参数传进去。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Safe as long as the hook is only registered on PreToolUse, which runs before any tool actually executes.", zh: "只要该 hook 只注册在 PreToolUse 上就是安全的，因为它在任何工具真正执行之前运行。" }, rebuttal: { en: "The lifecycle event decides when the hook runs, not what it is allowed to do. It is still arbitrary code in your environment.", zh: "生命周期事件决定的是 hook *什么时候*跑，而不是它*被允许做什么*。它仍然是在你环境里运行的任意代码。" } },
          { key: "D", text: { en: "Reject hooks entirely and put rule (4) in CLAUDE.md, since third-party code is never worth the risk.", zh: "彻底放弃 hook，把第(4)项写进 CLAUDE.md，因为第三方代码的风险永远不值得冒。" }, rebuttal: { en: "That throws away the only mechanism that can actually enforce the ban. The answer is to review the hook, not to abandon enforcement.", zh: "这等于扔掉了唯一能真正强制该禁令的机制。正确做法是审查这个 hook，而不是放弃强制。" } },
        ],
        correct: "B",
        explanation: { en: "Hooks execute as code in your environment — shell commands in Claude Code, callback functions in the Agent SDK. That is precisely why they can enforce rules the model cannot talk its way around, and equally why they are a supply-chain surface: a malicious or buggy hook can damage your system or exfiltrate data. Review hook configurations from third-party sources before enabling them, and avoid passing secrets through arguments that hooks may log. The right answer is not to abandon hooks — they remain the canonical way to enforce hard rules — but to treat them as code with security implications.", zh: "hook 是在你自己的环境里作为代码执行的——在 Claude Code 里是 shell 命令，在 Agent SDK 里是回调函数。这正是它能强制那些模型绕不过去的规则的原因，同样也正是它构成供应链攻击面的原因：一个恶意或有缺陷的 hook 可以损坏你的系统或外泄数据。启用来自第三方的 hook 配置前务必审查，并避免通过 hook 可能记录的参数传递密钥。正确答案不是放弃 hook——它依然是强制硬性规则的标准手段——而是把它当作有安全影响的代码来对待。" },
        takeaway: { en: "Hooks enforce rules precisely because they run as real code in your environment — which also makes them a supply-chain risk. Review third-party hooks, and never pass secrets through arguments they may log.", zh: "hook 之所以能强制规则，正因为它是在你环境里真实执行的代码——这同时也让它成为供应链风险。第三方 hook 要审查，密钥绝不要通过它可能记录的参数传递。" },
      },
      ],
    },
    ],
  },
  {
    id: "prompt-structured",
    order: 4,
    weight: 20,
    name: { en: "Prompt Engineering & Structured Output", zh: "演武场 · Prompt 工程与结构化输出" },
    blurb: { en: "Getting the shape you asked for: schema contracts over wording, examples over rule lists, and designing away the pressure to fabricate.", zh: "怎么拿到你要的结构：用 schema 契约代替措辞、用示例代替规则清单，并从设计上消除模型编造的压力。" },
    missions: [
    {
      id: "almost-parses",
      index: 0,
      name: { en: "Almost Valid JSON", zh: "差一点就能解析" },
      site: { en: "Intake Desk", zh: "收单台" },
      brief: { en: "Two percent of replies come back wrapped in code fences. The prompt already says \"ONLY valid JSON\". Shouting won't fix it.", zh: "有 2% 的回复带着代码围栏回来。prompt 里已经写了「只输出合法 JSON」。再喊一遍也没用。" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem Practice Scenario 1",
        scenario: "API Fundamentals & Output Control",
        prompt: { en: "An invoice-intake service asks Claude for data that downstream code inserts into a database. The system prompt says \"Respond ONLY with valid JSON matching this example\", and the application parses the text reply. About 2% of responses fail: markdown code fences, trailing commentary, or fields drifting from the expected shape. What is the most reliable fix?", zh: "一个发票录入服务让 Claude 返回数据，下游代码直接把它写进数据库。system prompt 写着「只输出符合此示例的合法 JSON」，应用则解析这段文本回复。大约 2% 的响应会失败：markdown 代码围栏、末尾多出的说明文字，或字段偏离预期结构。最可靠的修法是？" },
        options: [
          { key: "A", text: { en: "Strengthen the instruction: \"CRITICAL: never include any text besides the JSON object.\"", zh: "把指令写得更强硬：「重要：除 JSON 对象外不得包含任何文字。」" }, rebuttal: { en: "This treats an interface problem as a wording problem. Emphasis reduces failures but cannot eliminate them.", zh: "这是把接口问题当成措辞问题。加强语气能降低失败率，但消除不了。" } },
          { key: "B", text: { en: "Post-process replies with a regex that strips non-JSON content before parsing.", zh: "解析前先用正则把非 JSON 内容剥掉。" }, rebuttal: { en: "Patches the symptom and breaks on the next novel formatting variant, while doing nothing about schema drift.", zh: "只治标，遇到没见过的格式变体就失效，而且完全没管字段结构漂移。" } },
          { key: "C", text: { en: "Use structured outputs (output_config.format) or a forced extraction tool carrying the schema, then validate semantics in application code.", zh: "使用结构化输出（output_config.format），或用一个强制调用、携带 schema 的抽取工具，再在应用代码里做语义校验。" }, rebuttal: { en: "", zh: "" } },
          { key: "D", text: { en: "Retry failed requests with the same prompt until parsing succeeds.", zh: "对失败的请求用同样的 prompt 重试，直到能解析为止。" }, rebuttal: { en: "Pays repeated cost and latency for another roll of the same dice.", zh: "花额外的成本和延迟，去掷同一颗骰子。" } },
        ],
        correct: "C",
        explanation: { en: "Schema-backed output moves format compliance from probabilistic instruction-following into the interface itself: the model can no longer emit a code fence because the transport does not allow one. Semantic validation in application code remains necessary either way — a schema guarantees the shape, never the truth of the values.", zh: "由 schema 支撑的输出，把「格式合规」从概率性的指令遵循，挪进了接口本身：模型不可能再吐出代码围栏，因为传输层就不允许。而语义校验无论如何都仍要在应用代码里做——schema 只保证结构，从不保证值的真假。" },
        takeaway: { en: "For strict machine-readable output, use structured outputs or tool use rather than text formatting instructions; keep semantic validation in code.", zh: "要严格的机器可读输出，就用结构化输出或工具调用，而不是靠格式说明；语义校验仍然留在代码里。" },
      },
      ],
    },
    {
      id: "why-structured",
      index: 1,
      name: { en: "What the Contract Buys", zh: "契约买来了什么" },
      site: { en: "Records Office", zh: "档案局" },
      brief: { en: "Everyone agrees JSON is better. Be precise about what it actually guarantees — and what it quietly does not.", zh: "大家都认同 JSON 更好。但要说清楚它到底保证了什么——以及它悄悄地保证不了什么。" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q6",
        scenario: "Agentic Tool Integration",
        prompt: { en: "When designing agentic workflows, what is the primary advantage of enforcing structured JSON output for tool responses and agent outputs?", zh: "在设计 agentic 工作流时，强制工具响应和 agent 输出使用结构化 JSON，主要优势是什么？" },
        options: [
          { key: "A", text: { en: "It makes the LLM's reasoning process perfectly deterministic.", zh: "它让 LLM 的推理过程变得完全确定。" }, rebuttal: { en: "JSON enforces the *shape*, but LLM reasoning remains fundamentally probabilistic.", zh: "JSON 只约束*形状*，模型的推理本质上仍然是概率性的。" } },
          { key: "B", text: { en: "It ensures the semantic truth of the data fetched from backend APIs.", zh: "它保证从后端 API 取回的数据在语义上是真实的。" }, rebuttal: { en: "Schema checks validate format, not semantic correctness (truth).", zh: "schema 校验的是格式，不是语义正确性（真伪）。" } },
          { key: "C", text: { en: "It significantly reduces token consumption compared to standard text.", zh: "相比普通文本，它能显著降低 token 消耗。" }, rebuttal: { en: "JSON often *increases* token overhead due to bracket/key repetition.", zh: "JSON 因为括号和键名反复出现，通常反而*增加* token 开销。" } },
          { key: "D", text: { en: "It allows the agent and downstream systems to reliably access specific fields directly without parsing free-form text.", zh: "它让 agent 和下游系统能直接可靠地取到特定字段，不必去解析自由格式的文本。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "Structured outputs provide a stable schema contract. Instead of using regex or fuzzy text parsing to extract an account number or currency amount from a verbose prose response, downstream systems (and subsequent agent tools) can directly reference the exact JSON keys. This drastically reduces integration errors in chained operations.", zh: "结构化输出提供的是一份稳定的 schema 契约。下游系统（以及后续的 agent 工具）可以直接引用确切的 JSON 键，而不必用正则或模糊文本解析从一大段非结构化长文本里抠出账号或金额。这能大幅减少链式调用中的集成错误。" },
        takeaway: { en: "Structured output gives agents reliable field access, preventing downstream errors associated with parsing free-form text.", zh: "结构化输出给的是可靠的字段访问，从而避免解析自由文本带来的下游错误。" },
      },
      ],
    },
    {
      id: "absent-is-a-value",
      index: 2,
      name: { en: "Absent Is a Value", zh: "「没有」也是一个值" },
      site: { en: "Land Registry", zh: "地政所" },
      brief: { en: "The schema says lot size is required. The listing never mentions it. Guess what the model does.", zh: "schema 规定占地面积是必填。房源上根本没写。猜猜模型会怎么做。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem Practice Scenario 4",
        scenario: "Structured Extraction & Fabrication",
        prompt: { en: "A property-listing extractor uses a schema where lot_size_sqm is a required number. Many listings never state lot size, and reviewers find plausible-looking fabricated values in 18% of those documents. What is the highest-leverage fix?", zh: "一个房源信息抽取器使用的 schema 里，lot_size_sqm 是必填数字。很多房源根本没写占地面积，而复核人员在这些文档中有 18% 发现了看起来很合理、但其实是编造的数值。最有效的修法是？" },
        options: [
          { key: "A", text: { en: "Make the field nullable, instruct the extractor to return values only when stated in the source, and add a few-shot example showing null for an absent value.", zh: "把该字段改为可空，指示抽取器仅在原文写明时才返回数值，并补一个 few-shot 示例，演示缺失时返回 null。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Add a second model call that verifies each extraction against the source document.", zh: "增加第二次模型调用，逐条对照原文核验抽取结果。" }, rebuttal: { en: "Adds cost and latency, can rationalize the original answer, and leaves the structural pressure in place.", zh: "既增加成本和延迟，又可能反过来为原答案找理由，而且结构性压力原封不动。" } },
          { key: "C", text: { en: "Add \"do not hallucinate\" prominently to the system prompt.", zh: "在 system prompt 显眼处加上「不要产生幻觉」。" }, rebuttal: { en: "A vague instruction set against a structural incentive. The schema still demands a number.", zh: "用一句含糊的指令去对抗结构性激励。schema 照样要求必须给出一个数字。" } },
          { key: "D", text: { en: "Have the model emit a confidence score per field and discard low-confidence values.", zh: "让模型为每个字段输出置信度分数，丢弃低置信度的值。" }, rebuttal: { en: "Relies on self-reported confidence, which is uncalibrated — fabricated values frequently arrive confident.", zh: "依赖模型自报的置信度，而它并未校准——编造出来的值往往还很自信。" } },
        ],
        correct: "A",
        explanation: { en: "A required field structurally pressures the model to invent a value: the schema will not accept the absence, so something has to go in the slot. Making absence representable fixes the cause rather than the symptom, and the few-shot example teaches the convention so the model knows what \"nothing stated\" is supposed to look like.", zh: "必填字段会从结构上逼着模型编一个值出来：schema 不接受「缺失」，那个位置总得填点什么。让「缺失」成为可表达的状态，才是治因而非治标；再配一个 few-shot 示例把约定教给模型，它才知道「原文没写」应该长什么样。" },
        takeaway: { en: "When a schema makes absence unrepresentable, it manufactures hallucinations. Make the field nullable and show an example of the empty case.", zh: "当 schema 让「缺失」无法表达时，它就是在制造幻觉。把字段改成可空，并给出空值的示例。" },
      },
      ],
    },
    {
      id: "sixty-rules",
      index: 3,
      name: { en: "Sixty Rules and Falling", zh: "六十条规则，节节败退" },
      site: { en: "Rulebook Room", zh: "规章室" },
      brief: { en: "The prompt is provably being sent every turn, and compliance still rots after turn thirty. The prompt is not missing — it is competing.", zh: "prompt 每轮都确实发出去了，可过了第三十轮，遵循度还是烂掉。prompt 没丢——它是在被抢注意力。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem Practice Scenario 6",
        scenario: "System Prompt Engineering",
        prompt: { en: "An assistant's system prompt has grown to sixty bulleted rules. Tone and structure compliance degrades in sessions past thirty turns, even though the prompt is verifiably sent on every request and the context window is far from full. The team's proposed fix is to append \"IMPORTANT: re-read all rules before each reply.\" What is the right assessment?", zh: "某助手的 system prompt 已经膨胀到六十条要点规则。会话超过三十轮之后，语气和结构的遵循度开始下滑——尽管可以确认 prompt 每次请求都发送了，而且上下文窗口远未占满。团队提出的修法是追加一句「重要：每次回复前请重读全部规则」。正确的判断是？" },
        options: [
          { key: "A", text: { en: "The fix is sound: salience markers like IMPORTANT restore attention to the rules.", zh: "这个修法没问题：IMPORTANT 这类醒目标记能把注意力拉回规则上。" }, rebuttal: { en: "It adds one more line to the very pile it is trying to rescue.", zh: "它只是往自己想拯救的那堆东西上又加了一行。" } },
          { key: "B", text: { en: "The prompt is probably being dropped from later requests; find the transmission bug.", zh: "prompt 很可能在后续请求中被丢掉了；去找传输环节的 bug。" }, rebuttal: { en: "Contradicts the evidence — omitting the prompt diverges immediately, not gradually after thirty turns.", zh: "与证据矛盾——真丢了 prompt 会立刻跑偏，而不是在三十轮后才慢慢退化。" } },
          { key: "C", text: { en: "This is attention competition, not a transmission failure: condense the rules, convert subtle distinctions into contrasting few-shot examples, reinforce key constraints at natural breakpoints, and move hard requirements into code.", zh: "这是注意力竞争，不是传输失败：精简规则、把细微区别改写成对比性的 few-shot 示例、在自然的节点处强化关键约束，并把硬性要求挪进代码。" }, rebuttal: { en: "", zh: "" } },
          { key: "D", text: { en: "Convert all sixty rules into explicit if-then conditionals so each behavior has a trigger.", zh: "把六十条规则全部改写成显式的 if-then 条件句，让每种行为都有触发条件。" }, rebuttal: { en: "The conditional explosion the guide warns about: shallow keyword matching in place of judgment.", zh: "正是指南警告过的「条件爆炸」：用浅层关键词匹配取代了判断力。" } },
        ],
        correct: "C",
        explanation: { en: "Behaviour drift while the prompt is verifiably present is attention competition: as the conversation grows, the assistant's own recent turns become a behavioural pattern that increasingly outweighs a sixty-rule wall. The mechanisms that address that are condensing, showing contrasting examples (denser than prose for behaviour the model must learn rather than recite), reinforcing at natural breakpoints rather than every turn, and moving anything that must hold 100% of the time out of the prompt and into code.", zh: "在确认 prompt 存在的前提下出现行为漂移，说明这是注意力竞争：随着对话变长，助手自己最近的回复形成了一种行为惯性，逐渐压过那面六十条规则的墙。对症的手段是：精简规则；改用对比示例（对于需要模型「学会」而非「背诵」的行为，示例比长篇叙述文本密度高得多）；在自然的阶段节点而非每一轮做强化；以及把任何必须 100% 成立的要求移出 prompt、写进代码。" },
        takeaway: { en: "Drift with the prompt present is attention competition, not omission. Condense, show contrasting examples, reinforce at breakpoints, and enforce hard rules in code.", zh: "prompt 在场却发生漂移，是注意力竞争而非遗漏。精简、用对比示例、在节点处强化，硬性规则交给代码执行。" },
      },
      ],
    },
    {
      id: "principles-not-switches",
      index: 4,
      name: { en: "Principles, Not Switches", zh: "给原则，不是给开关" },
      site: { en: "Training Hall", zh: "培训厅" },
      brief: { en: "You can describe judgement, or you can enumerate triggers. Enumerating usually makes it worse.", zh: "你可以描述判断力，也可以穷举触发条件。穷举通常只会更糟。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §6 (Principles vs Conditionals)",
        scenario: "System Prompt Design",
        prompt: { en: "A support assistant should adapt explanation depth to each user's demonstrated expertise. It currently does this inconsistently. A team proposes replacing the guidance with a long list of conditionals (\"if the user mentions X, assume novice; if they use term Y, assume intermediate…\"). It also needs an absolute rule: never give personalised advice on regulated financial decisions. How should these two be written?", zh: "一个客服助手需要根据用户表现出的专业水平调整讲解深度，目前做得不太稳定。团队提议把这条指引换成一长串条件句（「若用户提到 X，视为新手；若用到术语 Y，视为中级……」）。同时它还需要一条绝对规则：绝不对受监管的金融决策提供个性化建议。这两条应该怎么写？" },
        options: [
          { key: "A", text: { en: "Both as explicit conditionals, so every behaviour has a clear trigger.", zh: "两条都写成显式条件句，让每种行为都有明确触发条件。" }, rebuttal: { en: "Conditionals force judgement-heavy behaviour into shallow keyword matching, misclassifying users who phrase things atypically.", zh: "条件句会把需要判断的行为压成浅层关键词匹配，表述方式不常见的用户就会被误判。" } },
          { key: "B", text: { en: "Depth adaptation as a general principle; the financial rule as an explicit conditional in the prompt, backed by enforcement in code.", zh: "讲解深度写成通用原则；金融那条在 prompt 里写成显式条件句，并在代码层加以强制。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Both as general principles, letting the model integrate the signals in each case.", zh: "两条都写成通用原则，让模型在各自场景下自行整合信号。" }, rebuttal: { en: "A regulated-advice bright line is exactly what a principle cannot guarantee. Safety triggers need conditionals, and rules that must always hold need code.", zh: "受监管建议这条红线，恰恰是原则无法保证的。安全触发要用条件句，而必须永远成立的规则要靠代码。" } },
          { key: "D", text: { en: "Both moved out of the prompt into application code, since prompts are unreliable.", zh: "两条都移出 prompt 放进应用代码，因为 prompt 本来就不可靠。" }, rebuttal: { en: "Explanation depth is a judgement call code cannot make. Only the bright line belongs in code.", zh: "讲解深度是代码做不了的判断题。只有那条红线才该进代码。" } },
        ],
        correct: "B",
        explanation: { en: "Use general principles for judgement-heavy behaviour and explicit conditionals for safety-critical triggers and policy bright lines. A principle (\"adapt depth to the user's demonstrated proficiency\") lets the model integrate dozens of implicit signals — vocabulary, framing, follow-up specificity. A long conditional list forces a shallow keyword match instead. But if a rule must hold 100% of the time, the prompt is the wrong home for it entirely: move it into code.", zh: "需要判断的行为用通用原则，安全关键的触发条件和政策红线用显式条件句。一条原则（「根据用户表现出的熟练度调整深度」）能让模型整合几十种隐含信号——用词、表述方式、追问的具体程度。而一长串条件句只会把它压成浅层关键词匹配。但如果一条规则必须 100% 成立，那 prompt 根本不是它该待的地方：移进代码。" },
        takeaway: { en: "Principles for judgement, conditionals for safety triggers, code for anything that must hold every single time.", zh: "判断题给原则，安全触发给条件句，必须每次都成立的交给代码。" },
      },
      ],
    },
    {
      id: "keep-both",
      index: 5,
      name: { en: "Keep Both Numbers", zh: "两个数都留" },
      site: { en: "Spec Archive", zh: "规格档案室" },
      brief: { en: "The body text says one thing, the spec table says another. Picking a winner right now throws the evidence away.", zh: "正文写一个数，规格表写另一个数。现在就选出赢家，等于把证据扔掉。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q4",
        scenario: "Schema Engineering & Provenance",
        prompt: { en: "An extraction pipeline processes technical manuals. A specific manual lists two conflicting battery capacities: one in the text and a different one in a detailed specs table. Historical data shows the specs table is correct 90% of the time. How should the extraction schema handle this?", zh: "一条抽取流水线在处理技术手册。某本手册里出现了两个互相冲突的电池容量：正文一个值，详细规格表里是另一个值。历史数据表明规格表在 90% 的情况下是对的。抽取 schema 应该怎么处理？" },
        options: [
          { key: "A", text: { en: "Halt processing and flag the document for manual correction before extraction.", zh: "中止处理，把文档标记为需人工修正后再抽取。" }, rebuttal: { en: "Impractical for automated pipelines operating on legacy documents.", zh: "对处理存量文档的自动化流水线来说不现实。" } },
          { key: "B", text: { en: "Use a single-value schema and prompt the model to pick the most likely correct value.", zh: "用单值 schema，并在 prompt 里让模型挑出最可能正确的那个值。" }, rebuttal: { en: "A single-value schema forces the LLM to destroy evidence of the conflict.", zh: "单值 schema 逼着模型把冲突的证据直接抹掉。" } },
          { key: "C", text: { en: "Hard-code a rule to always extract the value from the specs table.", zh: "硬编码一条规则：永远取规格表里的值。" }, rebuttal: { en: "A heuristic rule is brittle and will output wrong data 10% of the time.", zh: "这种经验规则很脆，会有 10% 的概率稳定输出错误数据。" } },
          { key: "D", text: { en: "Change the field to capture all conflicting values along with their source locations to preserve provenance for downstream reconciliation.", zh: "把该字段改成能收下所有冲突值及其来源位置，保留溯源信息交给下游去核对。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "Forcing premature collapse into a single value is an anti-pattern. If the specs table is only right 90% of the time, hard-coding a preference guarantees a 10% error rate. Modifying the schema to accept an array of values with explicit source locations preserves full provenance, allowing downstream business logic or human reviewers to make an informed reconciliation.", zh: "过早地把结果压成单一值是反模式。既然规格表只有 90% 正确，硬编码偏好就等于锁定了 10% 的错误率。把 schema 改成接受一个带明确来源位置的值数组，可以完整保留溯源信息，让下游的业务逻辑或人工复核在掌握全部信息的前提下去裁定。" },
        takeaway: { en: "Preserve conflicting source data in the structured output instead of forcing premature collapse into a single value.", zh: "把冲突的来源数据保留在结构化输出里，不要过早压成一个值。" },
      },
      ],
    },
    {
      id: "chain-by-id",
      index: 6,
      name: { en: "Chain by ID", zh: "用编号串联" },
      site: { en: "Dispatch Desk", zh: "分发台" },
      brief: { en: "Your search tool feeds two other tools. What it hands over decides whether the chain holds or snaps.", zh: "你的搜索工具要喂给另外两个工具。它交出去的东西，决定了这条链是接得上还是断掉。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q5",
        scenario: "Tool Interfaces & Identifiers",
        prompt: { en: "An agent uses a search_documents tool to find files, and subsequently uses share_document(document_id, email) and move_document(document_id, folder) to act on them. How should the search_documents tool format its output to ensure reliable chaining?", zh: "一个 agent 先用 search_documents 工具找文件，随后用 share_document(document_id, email) 和 move_document(document_id, folder) 对它们做操作。search_documents 的输出应该怎么组织，才能保证这条链稳定衔接？" },
        options: [
          { key: "A", text: { en: "Return clickable human-readable URLs.", zh: "返回人类可读的可点击 URL。" }, rebuttal: { en: "Clickable URLs are for humans. The agent would have to infer or parse IDs from the string.", zh: "可点击 URL 是给人看的。agent 还得从字符串里猜或解析出 ID。" } },
          { key: "B", text: { en: "Return structured data containing document_id and metadata for each result.", zh: "为每条结果返回包含 document_id 和元数据的结构化数据。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Return detailed prose summaries of the document contents.", zh: "返回文档内容的详细非结构化文本摘要。" }, rebuttal: { en: "Prose summaries do not provide the exact programmatic identifiers needed for the next API call.", zh: "非结构化文本摘要给不出下一次 API 调用所需的精确程序化标识符。" } },
          { key: "D", text: { en: "Return a simple list of document titles.", zh: "返回一份简单的文档标题列表。" }, rebuttal: { en: "Titles are ambiguous and cannot be passed directly into an ID-based API.", zh: "标题有歧义，无法直接传进以 ID 为准的 API。" } },
        ],
        correct: "B",
        explanation: { en: "Multi-step workflows require clear input/output contracts. Because the downstream tools (share, move) require a specific machine-usable identifier (document_id), the upstream search tool must return exactly that ID in a structured format alongside the human-readable metadata.", zh: "多步工作流需要清晰的输入/输出契约。既然下游工具（share、move）要的是特定的机器可用标识符（document_id），上游的 search 工具就必须以结构化格式返回这个 ID，并附带人类可读的元数据。" },
        takeaway: { en: "Multi-step tool workflows require machine-usable identifiers; tools meant for chaining should always return structured data containing explicit IDs.", zh: "多步工具流需要机器可用的标识符；准备被串联的工具，输出里一定要带上明确的 ID。" },
      },
      ],
    },
    {
      id: "sign-off",
      index: 7,
      name: { en: "Sign-Off", zh: "放行签字" },
      site: { en: "Audit Floor", zh: "审计层" },
      brief: { en: "Two calls, one architecture: build the check that catches bad extractions, then prove it is safe to stop reviewing them by hand.", zh: "两个环节，一套架构：先做出能抓住错误抽取的自校验，再证明可以放心撤掉人工复核。" },
      xp: 300,
      isBoss: true,
      steps: [
      {
        sourceQuestion: "avidevelops Q1",
        scenario: "Schema Design & Self-Correction",
        prompt: { en: "An automated invoice extraction pipeline occasionally outputs structured JSON where the extracted line items do not add up to the total amount extracted from the invoice. What is the best architectural approach to handle this semantic error?", zh: "一条自动发票抽取流水线，偶尔会输出这样的结构化 JSON：抽取出的行项目加起来，对不上从发票上抽取的总金额。处理这类语义错误，最好的架构做法是？" },
        options: [
          { key: "A", text: { en: "Add a calculated_total field alongside the stated_total field, compare them, and flag mismatches for human review.", zh: "在 stated_total 字段旁边加一个 calculated_total 字段，两者对比，不一致的记录标记出来交人工复核。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Automatically adjust the line item values so they mathematically sum to the stated total.", zh: "自动调整行项目的数值，让它们在数学上正好等于所述总额。" }, rebuttal: { en: "Adjusting line items invents values not supported by the document, corrupting data integrity.", zh: "调整行项目等于凭空造出文档并不支持的数值，破坏数据完整性。" } },
          { key: "C", text: { en: "Introduce a secondary LLM step to reconcile the math errors.", zh: "引入第二个 LLM 环节来核对并修正这些算术错误。" }, rebuttal: { en: "Adds unnecessary architectural overhead when explicit deterministic validation is available.", zh: "在已经能做显式确定性校验的情况下，这只是徒增架构开销。" } },
          { key: "D", text: { en: "Add more few-shot examples of correct math to the prompt.", zh: "在 prompt 里补充更多算术正确的 few-shot 示例。" }, rebuttal: { en: "Few-shot examples cannot guarantee deterministic consistency for arithmetic.", zh: "few-shot 示例无法为算术提供确定性的一致保证。" } },
        ],
        correct: "A",
        explanation: { en: "JSON schemas prevent syntax errors but not semantic errors (like bad math). The most robust self-correction pattern is extracting both what the document explicitly states (stated_total) and what the model calculates from the line items (calculated_total). If they don't match, the record is flagged for human review. This improves reliability without fabricating data.", zh: "JSON schema 能挡住语法错误，但挡不住语义错误（比如算错账）。最稳健的自校验模式，是同时抽取文档明确写出的值（stated_total）和模型从行项目算出的值（calculated_total）。两者对不上，该记录就被标记为人工复核。这样既提升了可靠性，又不会捏造数据。" },
        takeaway: { en: "Design self-correction flows by extracting both a stated value and a calculated value, routing mismatches to human review rather than silently \"fixing\" source document errors.", zh: "设计自校验流程时，同时抽取「所述值」和「计算值」，把不一致的送去人工复核，而不是悄悄「修正」源文档里的错误。" },
      },
      {
        sourceQuestion: "avidevelops Q30",
        scenario: "Output Validation & Automation Gating",
        prompt: { en: "An extraction system has operated with 100% human review for 3 months. Analysis shows that extractions with a model confidence of >=90% have a 97% accuracy overall. To reduce reviewer workload, you plan to automate high-confidence extractions. Before deploying, what validation step is most critical?", zh: "一套抽取系统已经以 100% 人工复核的方式运行了 3 个月。分析显示，模型置信度 ≥90% 的抽取结果整体准确率为 97%。为了减轻复核人员的工作量，你打算把高置信度的抽取自动化。上线之前，最关键的验证步骤是什么？" },
        options: [
          { key: "A", text: { en: "Segment the accuracy metrics by document type and field.", zh: "把准确率指标按文档类型和字段分层拆开看。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Deploy the automation globally at the >=90% confidence threshold.", zh: "直接按 ≥90% 置信度门槛全量上线自动化。" }, rebuttal: { en: "Automating based on aggregate metrics will silently ship high error rates for specific edge cases.", zh: "基于总体指标做自动化，会在某些边缘场景上悄悄放出很高的错误率。" } },
          { key: "C", text: { en: "Run a random sample review across all documents before deploying.", zh: "上线前对全部文档做一次随机抽样复核。" }, rebuttal: { en: "Random sampling under-represents rare or difficult document types.", zh: "随机抽样会让稀有或困难的文档类型被严重低估。" } },
          { key: "D", text: { en: "Increase the confidence threshold to >=95% just to be safe.", zh: "保险起见，把置信度门槛提高到 ≥95%。" }, rebuttal: { en: "Self-reported model confidence is an unreliable proxy for actual accuracy.", zh: "模型自报的置信度并不能可靠地代表真实准确率。" } },
        ],
        correct: "A",
        explanation: { en: "An aggregate metric of \"97% overall\" is dangerous because it can mask catastrophic failure rates in minority subsets (e.g., standard invoices might be 99.2% accurate, while handwritten forms are 61.0%). You must run a stratified analysis to break down accuracy by document type and field before automating, ensuring you only remove humans from safe segments.", zh: "「整体 97%」这样的总体指标很危险，因为它可能掩盖掉少数子集里灾难性的失败率（比如标准发票 99.2% 准确，手写表单只有 61.0%）。自动化之前必须做分层分析，把准确率按文档类型和字段拆开，确保只在真正安全的分段里撤掉人工。" },
        takeaway: { en: "Always segment accuracy by document type and field before automating; overall accuracy metrics mask per-category failure rates.", zh: "自动化之前，永远先按文档类型和字段分层看准确率；总体准确率会掩盖各分类下的失败率。" },
      },
      ],
    },
    ],
  },
  {
    id: "context-reliability",
    order: 5,
    weight: 15,
    name: { en: "Context Management & Reliability", zh: "枢纽区 · 上下文管理与可靠性" },
    blurb: { en: "Deciding what survives a long conversation and what gets dropped — reference sections, structured state, compression, and keeping a cache prefix stable enough to hit.", zh: "决定长对话里什么该留下、什么该丢掉——参考区、结构化状态、结果压缩，以及怎么让缓存前缀稳定到真能命中。" },
    missions: [
    {
      id: "lost-in-the-middle",
      index: 0,
      name: { en: "Lost in the Middle", zh: "淹没在中间" },
      site: { en: "Relay Station", zh: "中继站" },
      brief: { en: "138k tokens of research, and the report agent still needs to cite things. Sending everything is not the safe option.", zh: "13.8 万 token 的研究材料，报告 agent 还得标出处。全都发过去并不是稳妥的选择。" },
      xp: 100,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q26",
        scenario: "Context Budgets & Downstream Handoffs",
        prompt: { en: "A web search agent gathers 120k tokens of raw content, a document analysis agent extracts 15k tokens of insights, and a synthesis agent produces a 3k-token narrative draft. The coordinator must now pass context to a report generation agent for final output with proper citations. Which context-passing strategy provides the best balance of completeness and efficiency?", zh: "一个 web search agent 收集了 12 万 token 的原始内容，document analysis agent 提炼出 1.5 万 token 的洞察，synthesis agent 产出了一份 3000 token 的叙述初稿。现在 coordinator 需要把上下文传给 report generation agent，让它产出带规范引用的最终报告。哪种上下文传递策略在完整性和效率之间取得了最佳平衡？" },
        options: [
          { key: "A", text: { en: "Pass the 120k tokens of raw content and all intermediate outputs.", zh: "把 12 万 token 的原始内容和全部中间产物都传过去。" }, rebuttal: { en: "Causes \"lost in the middle\" and massive token bloat.", zh: "会引发「lost in the middle」，并造成巨大的 token 膨胀。" } },
          { key: "B", text: { en: "Pass only the 3k-token synthesis narrative.", zh: "只传那份 3000 token 的综述叙述。" }, rebuttal: { en: "The report agent will have no citation data and will fabricate sources.", zh: "报告 agent 拿不到任何引用数据，只能编造出处。" } },
          { key: "C", text: { en: "Pass the synthesis narrative and the full document analysis reasoning chain.", zh: "传综述叙述，外加完整的文档分析推理链。" }, rebuttal: { en: "Reasoning chains are internal to the previous agent and just add noise downstream.", zh: "推理链是上一个 agent 的内部产物，传下去只是增加噪声。" } },
          { key: "D", text: { en: "Pass the synthesis narrative along with a lean, structured citation index and conflict flags.", zh: "传综述叙述，外加一份精简的结构化引用索引和冲突标记。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "Passing 138k+ tokens of raw content to the report agent wastes budget, balloons latency, and triggers the \"lost in the middle\" effect (where the LLM ignores context in the middle of a massive prompt). Passing too little causes hallucinations. The optimal balance is passing the dense narrative backbone (3k) plus a compact, structured citation index (5–8k tokens) representing only the essential metadata {citation_id, claim, source, key_quote}.", zh: "把 13.8 万以上 token 的原始内容传给报告 agent，既浪费预算、拉高延迟，又会触发「lost in the middle」效应（模型会忽略超长 prompt 中间部分的内容）。传得太少则会导致幻觉。最优平衡是：传那份密度很高的叙述主干（3000 token），再加一份紧凑的结构化引用索引（5000–8000 token），只保留必要的元数据 {citation_id, claim, source, key_quote}。" },
        takeaway: { en: "Pass the synthesis narrative plus a structured citation index; strip raw content and reasoning chains entirely to avoid \"lost in the middle\" degradation.", zh: "传综述叙述加结构化引用索引；原始内容和推理链全部剥掉，避免「lost in the middle」带来的退化。" },
      },
      ],
    },
    {
      id: "the-schema-tax",
      index: 1,
      name: { en: "The Schema Tax", zh: "Schema 占的税" },
      site: { en: "Weighbridge", zh: "地磅房" },
      brief: { en: "98% accurate on short documents, 71% on long ones — and it is always the last third that goes missing. The window is 200k. Do the arithmetic.", zh: "短文档 98% 准确，长文档只有 71%——而且丢的永远是最后三分之一。窗口是 20 万。算一下账。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q32",
        scenario: "Context Degradation & Schema Bloat",
        prompt: { en: "An extraction system uses a 12-field JSON schema and detailed tool descriptions totaling ~2,500 tokens. For documents under 150k tokens, accuracy is 98%. However, for documents between 175k-185k tokens, accuracy drops to 71%, with information from the final third of the document consistently missing. The model's context window is 200k tokens. What is the most likely cause of this degradation?", zh: "某抽取系统使用一个 12 字段的 JSON schema，加上详细的工具描述，共约 2500 token。对于 15 万 token 以下的文档，准确率是 98%。但对于 17.5 万–18.5 万 token 的文档，准确率跌到 71%，且文档最后三分之一的信息总是丢失。模型的上下文窗口是 20 万 token。这种退化最可能的原因是？" },
        options: [
          { key: "A", text: { en: "The tool definition consumes input tokens, and combined with system prompts, pushes the total input close to the context limit, degrading attention for content at the end.", zh: "工具定义会占用输入 token，加上 system prompt，把总输入推到接近上下文上限，导致末尾内容的注意力退化。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Schemas exceeding 8-10 fields inherently increase decision complexity.", zh: "超过 8–10 个字段的 schema 本身就会增加决策复杂度。" }, rebuttal: { en: "Schema complexity causes semantic errors (wrong values), not positional omission. Accuracy is 98% on short docs with the same schema.", zh: "schema 复杂度导致的是语义错误（取错值），不是按位置丢失。同样的 schema 在短文档上有 98% 准确率。" } },
          { key: "C", text: { en: "Very long documents exceed the model's effective attention span causing middle-document degradation.", zh: "超长文档超出了模型的有效注意力跨度，导致文档中部退化。" }, rebuttal: { en: "\"Lost in the middle\" affects the middle, whereas the symptom here specifically calls out the *final third* missing.", zh: "「lost in the middle」影响的是中间部分，而这里的症状明确指出丢的是*最后三分之一*。" } },
          { key: "D", text: { en: "The model distributes attention proportionally, causing the end of the document to receive insufficient focus.", zh: "模型按比例分配注意力，导致文档末尾获得的关注不足。" }, rebuttal: { en: "Proportional attention is a fabricated concept.", zh: "「按比例分配注意力」是个杜撰的概念。" } },
        ],
        correct: "A",
        explanation: { en: "Context limits are absolute. If you have a 200k limit, but 2,500 tokens are taken by the tool schema and 1,500 by the system prompt, your *effective* document space is ~196k. As document tokens approach 180k+, the total payload nears the edge of the context boundary. Models suffer degraded attention (not just hard cut-offs) near the absolute limit, which manifests specifically as the \"final third consistently missing.\"", zh: "上下文上限是绝对的。窗口 20 万，但工具 schema 占了 2500、system prompt 占了 1500，你*实际可用*的文档空间就只剩约 19.6 万。当文档 token 逼近 18 万以上时，总负载已经贴到上下文边界。模型在接近绝对上限时会出现注意力退化（而不只是硬截断），表现出来正是「最后三分之一稳定丢失」。" },
        takeaway: { en: "Large tool schemas and system prompts consume your context budget; long documents near the absolute limit will suffer degraded attention at the end of the prompt. Trim schemas or chunk documents.", zh: "庞大的工具 schema 和 system prompt 会吃掉上下文预算；逼近绝对上限的长文档会在 prompt 末尾出现注意力退化。要么精简 schema，要么把文档分块。" },
      },
      ],
    },
    {
      id: "forgotten-allergy",
      index: 2,
      name: { en: "The Forgotten Allergy", zh: "被忘掉的过敏原" },
      site: { en: "Kitchen Pass", zh: "出餐口" },
      brief: { en: "An allergy stated forty turns ago went missing. The team wants to double the window. That only moves the cliff.", zh: "四十轮前说过的过敏原丢了。团队想把窗口翻倍。那只是把悬崖往后挪了挪。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem Practice Scenario 5",
        scenario: "Conversation Context Management",
        prompt: { en: "A meal-planning assistant runs long sessions. Users state allergies and serving counts early; mid-session they revise preferences (\"make everything vegetarian after all\"). Sessions have grown slow, and the agent occasionally reverts to pre-revision preferences — and once missed an allergy stated forty turns earlier. The team proposes doubling the sliding window from 20 to 40 turns. What is the better design?", zh: "一个配餐助手会进行很长的会话。用户在早期说明过敏原和用餐人数；会话中途又修改偏好（「还是全部改成素食吧」）。现在会话变慢了，agent 偶尔会退回到修改前的偏好——还有一次漏掉了四十轮之前说过的过敏原。团队提议把滑动窗口从 20 轮翻倍到 40 轮。更好的设计是？" },
        options: [
          { key: "A", text: { en: "Double the sliding window as proposed.", zh: "就按提议把滑动窗口翻倍。" }, rebuttal: { en: "Defers the failure and leaves old and new preferences competing in context. Going from 25 to 50 turns just moves the limit.", zh: "只是把失败推迟了，新旧偏好照样在上下文里互相打架。从 25 轮加到 50 轮只是把上限往后挪。" } },
          { key: "B", text: { en: "Replace everything older than ten turns with a progressive prose summary.", zh: "把十轮以前的内容全部替换成一份渐进式的文本摘要。" }, rebuttal: { en: "Risks blurring the exact facts — allergies, serving counts — that must survive verbatim.", zh: "有可能把必须逐字保留的精确事实（过敏原、用餐人数）糊掉。" } },
          { key: "C", text: { en: "Store every turn in a vector database and retrieve relevant turns per request.", zh: "把每一轮都存进向量数据库，每次请求时检索相关的轮次。" }, rebuttal: { en: "Adds infrastructure to *search* for truth the application could simply *maintain* — and retrieval can miss the revision turn.", zh: "为了*搜索*一个应用本来可以直接*维护*的事实而加了一套基础设施——而且检索完全可能漏掉那次修改的轮次。" } },
          { key: "D", text: { en: "Maintain a structured state object (allergies, servings, current dietary constraints) updated on every revision, keep a retained reference section for safety-critical facts, summarize general discussion, and keep recent turns verbatim.", zh: "维护一个结构化状态对象（过敏原、人数、当前饮食限制），每次修改即更新；为安全关键事实保留一块常驻参考区；一般讨论做摘要；最近的轮次逐字保留。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "The session mixes three kinds of content that need three different treatments: safety-critical exact facts (allergies) belong in a retained reference section that trimming never touches; revisable preferences belong in a canonical structured state object updated on every change, so current truth has one home rather than being inferred from a conversation containing both old and new values; and disposable chat can be summarized, with recent turns kept verbatim. A single policy applied to all three loses something either way.", zh: "这个会话里混着三类内容，需要三种不同的处理：安全关键的精确事实（过敏原）应放进一块裁剪永远不碰的常驻参考区；可修改的偏好应放进一个规范的结构化状态对象、每次变更即更新，让「当前事实」有唯一归属，而不是从新旧值并存的对话里去推断；一般闲聊则可以做摘要，同时保留最近若干轮的原文。对这三类套用同一套策略，无论怎么选都会丢东西。" },
        takeaway: { en: "Split context by how it must survive: reference section for exact safety facts, structured state for revisable preferences, summaries for discussion, verbatim for recent turns.", zh: "按「必须以何种方式存活」来切分上下文：精确安全事实进参考区，可变偏好进结构化状态，讨论做摘要，最近若干轮保留原文。" },
      },
      ],
    },
    {
      id: "date-it",
      index: 3,
      name: { en: "Date Everything", zh: "打上时间戳" },
      site: { en: "Chronicle Hall", zh: "编年厅" },
      brief: { en: "Two agents report different numbers and synthesis calls it a contradiction. It isn't — they are three years apart.", zh: "两个 agent 报了不同的数字，综合环节判定为矛盾。其实不是——它们差了三年。" },
      xp: 120,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q29",
        scenario: "Data Synthesis & Schema Design",
        prompt: { en: "During research on \"renewable energy adoption\", a web search agent returns statistics from 2024, while a document analysis agent returns statistics from 2021. The synthesis agent incorrectly flags these as contradictory rather than recognizing a growth trend over time. What single change best enables the synthesis agent to correctly interpret this difference?", zh: "在研究「可再生能源普及率」时，web search agent 返回的是 2024 年的统计数据，document analysis agent 返回的是 2021 年的。综合 agent 把两者错判为互相矛盾，而没有识别出这是随时间增长的趋势。哪一处改动最能让综合 agent 正确理解这个差异？" },
        options: [
          { key: "A", text: { en: "Instruct the synthesis agent to trust whichever source sounds more recent when values disagree.", zh: "指示综合 agent：数值不一致时，采信听起来更新的那个来源。" }, rebuttal: { en: "\"Sounds more recent\" is still a guess. With no date field in the schema the agent has nothing structural to compare.", zh: "「听起来更新」仍然是猜。schema 里没有日期字段，agent 就没有可比对的结构化依据。" } },
          { key: "B", text: { en: "Require publication_date in every subagent's output schema, and instruct synthesis to read differing values across different dates as a trend rather than a conflict.", zh: "在每个subagent 的输出 schema 中强制要求 publication_date，并指示综合环节：不同日期上的不同数值应读作趋势，而非冲突。" }, rebuttal: { en: "", zh: "" } },
          { key: "C", text: { en: "Drop the older source and re-run the document analysis agent against current documents only.", zh: "丢掉较早的来源，让 document analysis agent 只针对当前文档重跑一遍。" }, rebuttal: { en: "Throwing away the 2021 figure destroys the very trend the report is supposed to describe.", zh: "扔掉 2021 年的数字，恰恰毁掉了这份报告本来要描述的趋势。" } },
          { key: "D", text: { en: "Lower the synthesis agent's sensitivity so it raises conflict_detected less often.", zh: "调低综合 agent 的敏感度，让它少触发 conflict_detected。" }, rebuttal: { en: "Suppressing the flag also hides genuine same-period contradictions — the ones you actually need.", zh: "压低这个标志的同时，也会盖住同一时期内真正的矛盾——而那才是你真正需要的告警。" } },
        ],
        correct: "B",
        explanation: { en: "Without a structural representation of time, differing values look like conflicts to the model. By enforcing publication_date in the subagent output schema and instructing the synthesis agent to view differing values across distinct dates as progression, the system correctly identifies temporal growth. conflict_detected: true should only trigger for differing values within the *same* time period.", zh: "如果时间没有被结构化地表示出来，不同的数值在模型看来就是冲突。在subagent 的输出 schema 中强制 publication_date，并指示综合 agent 把不同日期上的差异视为演进，系统才能正确识别出随时间的增长。conflict_detected: true 只应该在*同一*时间段内出现数值分歧时触发。" },
        takeaway: { en: "Always include temporal metadata (publication_date) in extraction schemas to prevent synthesis agents from misinterpreting chronological progression as data contradiction.", zh: "抽取 schema 里永远带上时间元数据（publication_date），避免综合 agent 把时间上的演进误读成数据矛盾。" },
      },
      ],
    },
    {
      id: "catalogue-not-probe",
      index: 4,
      name: { en: "Read the Catalogue", zh: "先看目录" },
      site: { en: "Catalogue Hall", zh: "目录厅" },
      brief: { en: "Every session opens with the same round of \"what have you got?\" calls. That is a turn and a budget spent learning nothing new.", zh: "每次会话开场都是同一轮「你都有什么？」的调用。这一轮的时间和预算，换不来任何新信息。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "avidevelops Q19",
        scenario: "Discovery via Model Context Protocol",
        prompt: { en: "An agent interacting with multiple Model Context Protocol (MCP) servers wastes significant context and time performing sequential lookup calls just to discover what data (issue tickets, docs, schemas) is available. How can you improve data discovery?", zh: "一个 agent 要和多个 MCP server 交互，光是为了搞清楚有哪些数据可用（工单、文档、schema），就要做一连串顺序查询，浪费大量上下文和时间。怎么改进数据发现？" },
        options: [
          { key: "A", text: { en: "Consolidate all the MCP servers into a single, massive endpoint.", zh: "把所有 MCP server 合并成一个巨大的端点。" }, rebuttal: { en: "Destroys microservice boundaries and doesn't solve the exploratory querying issue.", zh: "既破坏了微服务边界，也没解决探索性查询的问题。" } },
          { key: "B", text: { en: "Add a new discover_data tool to every MCP server.", zh: "给每个 MCP server 都加一个 discover_data 工具。" }, rebuttal: { en: "Re-invents the wheel; Resources are the native MCP feature for this exact problem.", zh: "重复造轮子；Resources 本来就是 MCP 为这个问题提供的原生特性。" } },
          { key: "C", text: { en: "Implement keyword-based routing in the coordinator to send queries to the right server automatically.", zh: "在 coordinator 里实现基于关键词的路由，自动把查询发到正确的 server。" }, rebuttal: { en: "Keyword routing is brittle and fails when questions span multiple systems.", zh: "关键词路由很脆，一旦问题跨越多个系统就会失效。" } },
          { key: "D", text: { en: "Expose each MCP server's content catalog as an MCP Resource, allowing the agent to read what data exists before making targeted tool calls.", zh: "把每个 MCP server 的内容目录暴露为 MCP Resource，让 agent 先读到有哪些数据，再做有针对性的工具调用。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "MCP distinguishes between *Tools* (for taking actions or specific queries) and *Resources* (for exposing available context/data). Exposing hierarchies, issue summaries, or database schemas directly as Resources allows the agent to holistically \"see\" what data exists in a lightweight manner before deciding exactly which precise tool calls to make, eliminating exploratory spam.", zh: "MCP 区分 *Tools*（用于执行动作或具体查询）和 *Resources*（用于暴露可用的上下文/数据）。把层级结构、工单摘要或数据库 schema 直接作为 Resource 暴露出来，agent 就能以很轻量的方式整体「看到」有哪些数据，再决定该发出哪些精确的工具调用，从而消除探索性的调用刷屏。" },
        takeaway: { en: "Use MCP Resources to expose content catalogs (docs, schemas, summaries) so agents can discover available data before wasting turns on exploratory tool calls.", zh: "用 MCP Resources 暴露内容目录（文档、schema、摘要），让 agent 在浪费轮次做探索性调用之前就能发现有哪些数据。" },
      },
      ],
    },
    {
      id: "compress-results",
      index: 5,
      name: { en: "Keep Six Fields", zh: "只留六个字段" },
      site: { en: "Sorting Office", zh: "分拣处" },
      brief: { en: "The order lookup returns forty fields and you have called it five times. Two hundred fields of context, six of them useful.", zh: "订单查询一次返回四十个字段，而你已经调了五次。上下文里两百个字段，有用的六个。" },
      xp: 140,
      isBoss: false,
      steps: [
      {
        sourceQuestion: "daronyondem §5 (Tool Result Compression)",
        scenario: "Tool Result Compression",
        prompt: { en: "A support agent investigating a return request has called a lookup_order tool several times; each call returns 40+ fields, and the accumulated raw responses now dominate the context. What is the most reliable way to make room for further lookups?", zh: "一个客服 agent 在调查退货请求时已经多次调用 lookup_order 工具；每次调用返回 40 多个字段，累积下来的原始响应现在已经占据了大部分上下文。要为后续查询腾出空间，最可靠的做法是？" },
        options: [
          { key: "A", text: { en: "Compress each prior order response down to the return-relevant fields (order_id, purchase_date, items, return_window, payment_status, resolution_state), then make the additional lookups.", zh: "把此前每次订单响应压缩到与退货相关的字段（order_id、purchase_date、items、return_window、payment_status、resolution_state），然后再做后续查询。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Summarize all the accumulated tool responses into a single prose paragraph.", zh: "把累积的所有工具响应汇总成一段非结构化文本摘要。" }, rebuttal: { en: "Prose blurs the exact identifiers and dates a return decision turns on. Field selection keeps them exact.", zh: "非结构化文本会把退货判定所依赖的精确单号和日期糊掉。按字段筛选才能保持精确。" } },
          { key: "C", text: { en: "Move the tool responses into a vector database and retrieve them when needed.", zh: "把工具响应挪进向量数据库，需要时再检索。" }, rebuttal: { en: "Infrastructure to search for data the agent already fetched, and retrieval can miss the record that matters.", zh: "为 agent 已经取到的数据再搭一套检索设施，而且检索完全可能漏掉关键那条记录。" } },
          { key: "D", text: { en: "Keep accumulating the raw responses and raise the model's context window tier.", zh: "继续累积原始响应，改用上下文窗口更大的模型档位。" }, rebuttal: { en: "Buys headroom without fixing the growth rate; the same investigation just hits the new ceiling later.", zh: "只是买到了余量，却没改变增长速度；同一次调查照样会撞上新的天花板。" } },
        ],
        correct: "A",
        explanation: { en: "Verbose tool results crowd out useful conversation. Once a tool result has been processed, extract the fields that matter and drop the rest — internal backend fields, unrelated shipping events, duplicated metadata. Field-level compression keeps identifiers and dates exact, which prose summarization does not, and needs no extra infrastructure, which a vector store does.", zh: "冗长的工具结果会把真正有用的对话挤出去。工具结果一旦处理完，就把要紧的字段提取出来、其余丢掉——内部后端字段、无关的物流事件、重复的元数据。字段级压缩能保持单号和日期的精确（文本摘要做不到），也不需要额外的基础设施（向量库则需要）。" },
        takeaway: { en: "After a tool result has been used, compress it to the fields that still matter. Field selection beats prose summarization for anything identifier- or date-shaped.", zh: "工具结果用过之后，压缩到仍然要紧的字段。凡是单号、日期这类内容，按字段筛选都优于文本摘要。" },
      },
      ],
    },
    {
      id: "cache-never-hits",
      index: 6,
      name: { en: "The Cache That Never Hits", zh: "永不命中的缓存" },
      site: { en: "Cold Storage", zh: "冷库" },
      brief: { en: "Two calls: find out why a busy cache reads zero, then lay the context out so it stays hot.", zh: "两个环节：先查出高流量下缓存读取为零的原因，再把上下文重新排布，让它一直是热的。" },
      xp: 300,
      isBoss: true,
      steps: [
      {
        sourceQuestion: "daronyondem Practice Scenario 13",
        scenario: "Prompt Caching Diagnosis",
        prompt: { en: "An agent with a 12K-token system prompt and thirty tool definitions enables prompt caching with a breakpoint after the system prompt. Traffic is steady — many requests per minute. Usage logs show cache_read_input_tokens near zero on every request while cache-write charges keep accruing. What is the most likely cause and fix?", zh: "某 agent 有 1.2 万 token 的 system prompt 和三十个工具定义，并在 system prompt 之后设置断点启用了 prompt caching。流量稳定——每分钟大量请求。用量日志显示每次请求的 cache_read_input_tokens 都接近零，而缓存写入费用却不断累加。最可能的原因和修法是？" },
        options: [
          { key: "A", text: { en: "The TTL is too short; switch to the one-hour cache.", zh: "TTL 太短；改用一小时缓存。" }, rebuttal: { en: "At many requests per minute a short TTL would still show *some* reads. TTL is not the bottleneck.", zh: "每分钟大量请求的情况下，就算 TTL 很短也该看到*一些*读取。TTL 不是瓶颈。" } },
          { key: "B", text: { en: "The prompt exceeds the maximum cacheable size; trim it.", zh: "prompt 超过了可缓存的最大尺寸；把它裁短。" }, rebuttal: { en: "Backwards — cache minimums are floors, not ceilings.", zh: "搞反了——缓存的尺寸限制是下限，不是上限。" } },
          { key: "C", text: { en: "Breakpoints only apply to messages, not system prompts; move the marker.", zh: "断点只对 messages 生效，对 system prompt 无效；把标记挪走。" }, rebuttal: { en: "False: system prompt blocks (and tools) are cacheable and render before messages.", zh: "不对：system prompt 块（以及 tools）是可以缓存的，而且渲染顺序在 messages 之前。" } },
          { key: "D", text: { en: "A silent invalidator is changing the prefix — a timestamp interpolated into the system prompt, or tools serialized in non-deterministic order. Diff two rendered requests byte-for-byte, freeze the prefix, and move volatile content after the last breakpoint.", zh: "有个隐形的失效源在改动前缀——比如 system prompt 里插了时间戳，或工具序列化顺序不确定。把两次渲染后的请求逐字节 diff，冻结前缀，把易变内容挪到最后一个断点之后。" }, rebuttal: { en: "", zh: "" } },
        ],
        correct: "D",
        explanation: { en: "Steady traffic with zero reads and ongoing writes is the signature of an unstable prefix: every request writes a new entry that no later request matches. Cache behaviour is observable — the usage block reports writes and reads separately — so the diagnostic is to diff the rendered bytes of two consecutive requests and find the invalidator. Classic culprits are a \"current date\" interpolated into the system prompt, JSON dumped without sorted keys, a tool list built from an unordered collection, or per-session IDs early in the prompt.", zh: "流量稳定、读取为零、写入持续，这正是「前缀不稳定」的典型特征：每次请求都写入一条新条目，而后续请求谁也匹配不上。缓存行为是可观测的——用量块会分别报告写入和读取——所以诊断方法就是把连续两次请求渲染后的字节做 diff，找出那个失效源。经典元凶包括：system prompt 里插入的「当前日期」、未按键排序就序列化的 JSON、由无序集合构建的工具列表，或者靠前位置的会话 ID。" },
        takeaway: { en: "Zero cache reads under repeated traffic means a silent invalidator, not a TTL problem. Diff two rendered requests byte-for-byte to find it.", zh: "重复流量下缓存读取为零，说明存在隐形失效源，而不是 TTL 问题。把两次渲染后的请求逐字节 diff 就能找到它。" },
      },
      {
        sourceQuestion: "daronyondem §13 (Designing for Cache Stability)",
        scenario: "Cache-Stable Context Layout",
        prompt: { en: "You are re-laying out that agent's context so the cache stays warm. The app also needs to (a) tell the model today's date, (b) inject a per-request retrieved document, and (c) offer a \"research mode\" and a \"support mode\". How should this be arranged?", zh: "你要重新排布这个 agent 的上下文，好让缓存保持热。应用同时还需要：(a) 告诉模型今天的日期，(b) 每次请求注入一份检索到的文档，(c) 提供「研究模式」和「客服模式」两种模式。应该怎么安排？" },
        options: [
          { key: "A", text: { en: "Order by stability — deterministic tool definitions first, then a frozen system prompt, then stable history — and put the date, the retrieved document, and the mode in message content after the last breakpoint, keeping one tool set.", zh: "按稳定性排序——先是确定性的工具定义，再是冻结的 system prompt，然后是稳定的历史——把日期、检索到的文档和模式都作为 message 内容放在最后一个断点之后，并保持单一工具集。" }, rebuttal: { en: "", zh: "" } },
          { key: "B", text: { en: "Put the date and current mode at the top of the system prompt so the model always sees them first, and swap the tool set per mode.", zh: "把日期和当前模式放在 system prompt 开头，让模型总能第一时间看到，并按模式切换工具集。" }, rebuttal: { en: "Every one of those invalidates the whole prefix: the date changes each request, and tools render at position zero so swapping them re-processes everything.", zh: "这里每一项都会让整个前缀失效：日期每次请求都在变，而工具渲染在位置零，切换工具集等于整份重新处理。" } },
          { key: "C", text: { en: "Give each mode its own cached system prompt and add a breakpoint per mode so both stay warm.", zh: "给每种模式各自一份带缓存的 system prompt，并为每种模式加一个断点，让两者都保持热。" }, rebuttal: { en: "Conditional system prompt sections mean every combination is a separate cache entry, splitting hit rate for no benefit — pass the mode as message content instead.", zh: "带条件分支的 system prompt 会让每种组合各成一条缓存条目，白白分散命中率——把模式作为 message 内容传即可。" } },
          { key: "D", text: { en: "Drop caching and rely on a smaller model, since the prefix has volatile parts either way.", zh: "放弃缓存，改用更小的模型，反正前缀里总有易变的部分。" }, rebuttal: { en: "The volatile parts are exactly what you move late. A cheaper model with a warm cache is usually the cheapest configuration of all.", zh: "易变的部分恰恰是要往后挪的东西。「更便宜的模型 + 热缓存」通常才是成本最低的组合。" } },
        ],
        correct: "A",
        explanation: { en: "Order content by stability, most stable first: tool definitions (rendered first, so keep their ordering deterministic), then the system prompt (frozen — no timestamps, session IDs, or \"current state\" interpolated in), then stable conversation history, then volatile per-request content after the last breakpoint. Modes implemented by swapping tool sets are cache-hostile because tools render at position zero; pass the mode as message content instead. Caching changes cost, not capacity — if the real problem were context overflow, this would be the wrong lever entirely.", zh: "按稳定性排序，最稳定的放最前：工具定义（渲染最靠前，所以其顺序必须确定），然后是 system prompt（冻结——不要插入时间戳、会话 ID 或「当前状态」），然后是稳定的对话历史，最后把每次请求都在变的内容放到最后一个断点之后。用切换工具集来实现「模式」对缓存极不友好，因为工具渲染在位置零；改成把模式作为 message 内容传。另外要记得：缓存改变的是成本，不是容量——如果真正的问题是上下文溢出，那这个杠杆根本就用错了。" },
        takeaway: { en: "Order context most-stable-first and push everything volatile past the last breakpoint. Never interpolate dates into the system prompt or swap tool sets mid-conversation.", zh: "上下文按「最稳定在前」排布，把所有易变内容推到最后一个断点之后。绝不要把日期插进 system prompt，也不要在对话中途切换工具集。" },
      },
      ],
    },
    ],
  },
];

/**
 * Level thresholds — index is the level, value is cumulative XP needed.
 *
 * Sized for the whole course: 45 missions across five domains are worth
 * 6580 XP, so the top level sits just short of a full clear rather than being
 * reached part-way through. Re-check this after adding missions — a curve that
 * tops out early pins the XP bar at max for the rest of the game.
 */
export const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1870, 2400, 3000, 3660, 4380, 5160, 6400];

export const levelForXp = (xp: number): number => {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
};
