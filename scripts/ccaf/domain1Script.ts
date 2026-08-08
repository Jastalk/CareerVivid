/**
 * Domain 1 lesson film — "The One-Person Agency".
 *
 * Rewritten with pedagogical storytelling:
 *   1. Story-first scenario before technical details.
 *   2. Clear explanation of numbers (50 billion vs 35 billion) & context.
 *   3. Natural transition at the end inviting users to take practice quizzes.
 */

import type { LessonBeat, VideoLesson } from './lessonScripts';

const STYLE =
    'Minimalist 2D stick figure comic illustration, Sam O\'Nella art style. ' +
    'Bold black hand-drawn ink lines, flat limited color fills, generous white background, ' +
    'slightly wobbly imperfect linework, expressive dot eyes. No text, no letters, no numbers anywhere.';

/** Composition clause for beats that carry a teaching card on the right rail. */
const LEFT =
    'IMPORTANT COMPOSITION: the entire scene and every character is anchored in the LEFT third of the ' +
    'frame; the right HALF of the image is completely empty clean white space with nothing in it.';

interface TaughtBeat extends LessonBeat {
    /** Mission ids from ccafMissions.ts. Empty for pure story beats. */
    teaches?: string[];
    /**
     * Reuse another beat's backplate. A metaphor beat and the landing beat that
     * follows it share one illustration, so the shot appears to hold while the
     * explanation arrives — and the pair costs no extra art.
     */
    artFrom?: string;
    /**
     * A pre-rendered clip in public/assets/ccaf-termclips. Used for the term
     * animations built in Remotion, which show a mechanism unfolding — the one
     * thing a still illustration cannot do, and the reason the API names were
     * not landing on first viewing.
     */
    clip?: string;
}

const BEATS: TaughtBeat[] = [
    // ── Cold open ────────────────────────────────────────────────────────────
    {
        id: 'open-buried',
        kind: 'veo',
        fixedSeconds: 7,
        imagePrompt:
            `${STYLE} A single small stick figure sits at a tiny desk, almost buried under an enormous ` +
            'teetering avalanche of paper folders reaching the top of frame. One very small helper robot ' +
            'stands beside the desk holding a single sheet, looking useless.',
        motion:
            '2D hand-drawn cartoon animation. The paper stack sways, a few sheets slide off the top. ' +
            'The tiny robot offers its single sheet. Slow push in.',
        overlay: 'Title card: The One-Person Agency · Domain 1 · Agentic Architecture & Orchestration',
        narration: {
            en: 'Imagine you\'re running a one-person operation. One desk. And more work than one person can physically get through. That\'s exactly where Leo is. So Leo hires a second worker, and a third, and a twelfth. Every one of them is another Claude, running on its own, with its own separate memory of the job. And the moment there are two, a whole category of problem appears that simply did not exist with one.',
            zh: '想象你在独自经营一摊事情。一张桌子，活儿多到一个人物理上做不完。Leo 现在就在这个处境里。于是他招了第二个、第三个、第十二个帮手——每一个都是一个独立运行的 Claude，各有各自对这份工作的记忆。而从有第二个开始，一整类在只有一个时根本不存在的问题，就冒出来了。',
        },
    },
    {
        id: 'roadmap',
        kind: 'diagram',
        imagePrompt:
            STYLE + ' A cheerful stick figure stands beside five glowing signposts planted along a winding road leading uphill. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        narration: {
            en: 'So Leo\'s building an agency. Starts with one agent. Then two. Then twelve. And here\'s what nobody warned him about: every single thing that was easy with one agent breaks the second there\'s another one. That\'s what these thirteen buildings are. Thirteen ways it breaks.',
            zh: '于是 Leo 从一个 agent 开始，然后是两个。接着他发现这点人手不够，就把团队建了起来。而只有一个 agent 时简单明了的每一件事，一旦有了第二个，都会变成一个需要回答的问题。十三个这样的问题，就是这个区里的十三栋楼。',
        },
        overlay: 'Five chapter titles stack up, then the first highlights.',
        visual: {
            type: 'flow',
            nodes: ['one loop', 'split the work', 'order & speed', 'the handoff gap', 'recovery'],
        },
    },

    // ── Chapter 0 · How this actually works, before any jargon ───────────────
    {
        id: 'what-is-a-turn',
        kind: 'rows',
        imagePrompt:
            STYLE + ' A stick figure hands a sealed envelope across a desk to a robot, and the robot hands back a different envelope that has a small paper tag stapled to the outside of it. ' + LEFT,
        narration: {
            en: 'Before any of that, thirty seconds on how this actually works. Leo sends the model a list of messages. What comes back is not just text. It\'s more like a sealed envelope. Inside is what the model wrote. And stapled to the outside is a little tag saying why it stopped writing. Most people only ever open the envelope. The tag is the part that runs the loop.',
            zh: '在讲那些之前，先花三十秒说清楚这东西怎么运转。Leo 送给模型的是一串消息。而回来的不是一段文字，更像是一个封好的信封。信封里面是模型写的内容，外面订着一张小纸条，写着「我为什么停下来」。大多数人只会拆信封。而真正驱动循环的，是外面那张纸条。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'a "turn"',
                    problem: { zh: '没有一个明确的计量单位，就说不清「一次」到底指什么。', en: 'Without a unit, nobody can say what “once” even means.' },
                    solution: { zh: '把一次往返算作一轮：消息出去，一个回复回来。', en: 'Count one round trip as a turn: messages out, one reply back.' },
                    essence: { zh: '**一轮就是循环的一次迭代**。调十次工具，就是十轮，仅此而已。', en: '**A turn is one iteration of the loop.** Ten tool calls, ten turns. That is all.' },
                },
            ],
        },
    },
    {
        id: 'term-what-comes-back',
        kind: 'veo',
        clip: 'ccaf-what-comes-back',
        narration: {
            en: 'So: what is stop_reason? It\'s one field on every reply, and it holds a single word saying why the model stopped. Why does it exist? Because the model has two totally different reasons to stop, and from the text alone they look identical. And where does Leo use it? Right at the top of his loop. Read that field, branch on it, and the loop knows whether to run a tool or hand the answer over.',
            zh: '那么：stop_reason 是什么？它是每一次回复上的一个字段，里面装着一个词，说明模型这次为什么停下来。它为什么存在？因为模型停下来有两种截然不同的原因，而只看正文，这两种长得一模一样。Leo 在哪儿用它？就在循环的最开头。读这个字段、按它分支，循环就知道该去执行工具，还是该把答案交出去。',
        },
    },
    {
        id: 'why-a-loop-exists',
        kind: 'rows',
        imagePrompt:
            STYLE + ' A stick figure robot reaches toward a hammer that is just out of its reach, then holds up a small note toward a human stick figure standing beside it who is picking up the hammer. ' + LEFT,
        narration: {
            en: 'So why is there a loop at all? Here\'s the bit that surprises people. A tool is just a function Leo described to the model. And the model cannot run it. It has no hands. All it can do is say: please run this one, with these arguments. So Leo runs it. He hands the result back. And the model carries on thinking. That handing-back is the loop. Nobody designed it that way for elegance. It exists because the model can\'t reach the hammer.',
            zh: '那为什么会有循环？这里有个很多人没想到的点。所谓工具，就是 Leo 描述给模型的一个函数。而模型自己跑不了它——它没有手。它唯一能做的是开口说：请帮我跑这个，参数是这些。于是 Leo 去跑，把结果递回去，模型接着往下想。这个「递回去」就是循环。这不是谁为了优雅而设计的，它存在只是因为模型够不到那把锤子。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'tool',
                    problem: { zh: '模型知道该做什么，却**碰不到任何东西**。', en: 'The model knows what to do and **cannot touch anything**.' },
                    solution: { zh: '把函数描述给它；它开口请求，Leo 执行，再把结果递回去。', en: 'Describe the function to it; it asks, Leo runs it, the result goes back.' },
                    essence: { zh: '**工具只是一份说明书，不是一双手**。执行的永远是 Leo 的代码。', en: '**A tool is a description, not a pair of hands.** Leo runs everything.' },
                },
            ],
        },
    },
    {
        id: 'term-why-a-loop',
        kind: 'veo',
        clip: 'ccaf-why-a-loop',
        narration: {
            en: 'Here\'s the whole loop in one picture. The model wants the hammer. It cannot pick it up. So it passes Leo a note that says tool_use. Leo swings the hammer, hands the result back, and the model keeps going. That hand-back is the loop.',
            zh: '整个循环用一张图就说完了。模型想要那把锤子，但它拿不起来。所以它递给 Leo 一张写着 tool_use 的条子。Leo 去挥锤子，把结果递回去，模型接着往下想。这个「递回去」，就是循环。',
        },
    },
    {
        id: 'two-different-limits',
        kind: 'rows',
        imagePrompt:
            STYLE + ' A stick figure stands beside a small desk piled high with papers that are spilling off the edge, while holding a pen that has visibly run dry, with a few scratchy marks on a page. ' + LEFT,
        narration: {
            en: 'One more thing, and this one trips up almost everybody. There are two completely different limits, living in two completely different places. How much goes in front of the model is the size of the desk. How much it\'s allowed to write back is how long the pen lasts. Two limits. Two places. And when something goes wrong, knowing which one got hit is most of the fix.',
            zh: '还有一件事，这个几乎所有人都会栽。这里有两个完全不同的限制，长在两个完全不同的地方。摆到模型面前多少东西——那是桌子有多大。它被允许写回多少——那是笔里有多少墨。两个限制，两个位置。出问题的时候，判断出撞的是哪一个，修复就完成了一大半。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'context window',
                    problem: { zh: '所有送出去的东西都得同时摆在模型面前，而地方是有限的。', en: 'Everything sent has to sit in front of the model at once, and the space is finite.' },
                    solution: { zh: '发请求前先算一算：整段对话加起来放得下吗。', en: 'Before the call, check that the whole conversation still fits.' },
                    essence: { zh: '**这是一张桌子的大小**，是输入侧。把输出上限调大对它毫无帮助。', en: '**It is the size of a desk** — the input side. A bigger output cap does nothing for it.' },
                },
                {
                    term: 'output budget',
                    problem: { zh: '模型可以一直写下去，直到把预算写光。', en: 'The model can keep writing until the budget is gone.' },
                    solution: { zh: '在请求里给它一个上限。', en: 'Give it a ceiling in the request.' },
                    essence: { zh: '**这是笔里有多少墨**，是输出侧。它就是 max_tokens。', en: '**It is how much ink is in the pen** — the output side. It is max_tokens.' },
                },
            ],
        },
    },
    {
        id: 'term-two-limits',
        kind: 'veo',
        clip: 'ccaf-two-limits',
        narration: {
            en: 'Two limits, side by side, so they never get mixed up again. On the left, the desk fills up and nothing more fits: that\'s model_context_window_exceeded. On the right, the pen runs out mid-sentence: that\'s max_tokens. Different side, different fix.',
            zh: '两个限制并排放着，以后不会再搞混。左边，桌子堆满了，再也塞不下：那是 model_context_window_exceeded。右边，笔写到一半没墨了：那是 max_tokens。不同的一侧，不同的修法。',
        },
    },

    {
        id: 'why-hire-at-all',
        kind: 'rows',
        imagePrompt:
            STYLE + ' A stick figure sits at a desk buried under a huge pile of paper, while a second stick figure at a separate desk nearby reads a big stack and hands over one small slip of paper. ' + LEFT,
        narration: {
            en: 'So why hire at all? Watch what happens with just one agent. Leo asks it to research fifty documents. Every document it opens stays on the desk. By document forty the desk is buried, and the quality falls off a cliff, because the model is now reading its own clutter instead of the question. Now give that job to a second agent. It fills up ITS desk with all fifty, and hands Leo back three lines. Leo\'s desk stays clean. That is the entire reason to hire: not speed, not cleverness. Somewhere to put the mess.',
            zh: '那到底为什么要招人？先看只有一个 agent 时会发生什么。Leo 让它研究五十份文档。它每打开一份，那份就留在桌上。到第四十份的时候，桌子已经被埋了，质量断崖式下滑——因为模型现在读的是自己堆出来的杂物，而不是那个问题。现在把这活儿交给第二个 agent：它用**它自己的**桌子装下这五十份，然后递给 Leo 三行结论。Leo 的桌子始终是干净的。这就是招人的全部理由——不是为了快，也不是为了聪明，是为了**有地方安放这堆乱麻**。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'context isolation',
                    problem: { zh: '一个 agent 读到第四十份文档时，读的已经是自己堆出来的杂物。', en: 'By document forty one agent is reading its own clutter, not the question.' },
                    solution: { zh: '把这活儿交给独立的 agent，它用自己的桌子装，只递回结论。', en: 'Hand the job to a separate agent with its own desk; it returns only conclusions.' },
                    essence: { zh: '**SubAgent 本质上只是上下文分区**——不为快，不为聪明，只为有地方放乱麻。', en: '**A subagent is just context partitioning** — not speed, not cleverness. Somewhere to put the mess.' },
                },
            ],
        },
    },
    {
        id: 'the-trade',
        kind: 'rows',
        imagePrompt:
            STYLE + ' Two stick figures stand at two separate desks, each with a full stack of paper, and a thick dark line runs down the floor between the two desks separating them completely. ' + LEFT,
        narration: {
            en: 'But here\'s the part that surprises everyone, and it\'s the question you should be asking: if there are now twelve agents, surely there\'s MORE context, not less? And that\'s true. There IS more, in total. But it\'s in twelve separate piles, and no single agent can see past its own. With one agent, something learned in step three is still sitting right there in step forty, and the model connects them for free. Split it across twelve, and agent three\'s finding is invisible to agent eleven, forever, unless Leo carries it over by hand. More context in total. Far less shared. That trade is what the next four chapters are about.',
            zh: '但接下来这点会让所有人意外，而且这正是你该问的问题：现在有十二个 agent 了，上下文不是**更多**了吗，怎么会更少？确实更多——**总量**上确实更多。但它分成了十二堆，而**没有任何一个 agent 能看到自己那堆以外的东西**。只有一个 agent 的时候，第三步学到的东西，到第四十步还原封不动地摆在那儿，模型自己就把它们联系起来了，不花一分钱。拆成十二个之后，第三个 agent 的发现对第十一个来说**永远是不存在的**，除非 Leo 亲手把它搬过去。总量更多，共享更少。接下来四章讲的就是这笔交易。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'shared context',
                    problem: { zh: '十二个 agent 上下文总量更多，可**谁也看不见别人那一堆**。', en: 'Twelve agents hold more context in total, yet **none can see past its own pile**.' },
                    solution: { zh: '凡是要跨过那道缝的东西，Leo 都得亲手搬。', en: 'Anything that must cross the gap, Leo carries by hand.' },
                    essence: { zh: '**换来的是总量，付出的是共享**。后面四章全是这笔交易的账单。', en: '**You bought total capacity and sold shared memory.** The next four chapters are that bill.' },
                },
            ],
        },
    },
    {
        id: 'term-whose-field',
        kind: 'veo',
        clip: 'ccaf-whose-field',
        narration: {
            en: 'One last thing before we go on, because this trips up more people than anything else on the list. Some of these names ship with the API. They arrive whether anyone asks or not. But citation_id and conflict_detected? Nobody hands those over. Leo invents them, in his own schema, and agrees on them with himself. Search the docs for them and there\'s nothing there.',
            zh: '继续之前还有最后一件事，这个坑比这张表上任何东西都害人。这里有些名字是 API 自带的，你不要它也会来。但 citation_id 和 conflict_detected 呢？没有人会给这两个。是 Leo 自己在自己的数据结构里发明、自己和自己约定的。去文档里搜，什么都搜不到。',
        },
    },

    // ── Chapter 1 · One agent, one loop ──────────────────────────────────────
    {
        id: 'no-brakes',
        kind: 'veo',
        fixedSeconds: 7,
        imagePrompt:
            `${STYLE} A stick figure sprinting frantically inside a giant hamster wheel that has no brake lever anywhere. ` +
            'Sparks fly from the axle as the figure looks around in panic.',
        motion: '2D cartoon motion. The wheel spins fast, figure sprints furiously. Slow push in.',
        narration: {
            en: 'But before anybody gets hired, look at what Leo already built. One agent, running in a loop. And a loop, as anyone who\'s built one knows, has exactly one hard question: when does it stop?',
            zh: '但在招人之前，先看看 Leo 已经做出来的东西：一个 agent，跑在一个循环里。而循环这东西，写过的人都知道，只有一个真正难的问题——它什么时候停？',
        },
    },
    {
        id: 'kettle-whistle',
        kind: 'rows',
        imagePrompt:
            STYLE + ' A stick figure stands outside a closed door with one hand cupped behind an ear, listening. Through the doorway a kettle sits on a stove with a plume of steam and three curved sound lines coming from its spout. ' + LEFT,
        teaches: ['read-the-signal'],
        narration: {
            en: 'Here\'s a question. Leo puts a kettle on in the next room and shuts the door. He can\'t see it. How does he know it\'s boiled? He doesn\'t set a timer and guess. He waits for the whistle. The kettle tells him. And Leo\'s agent has a whistle too — it announces, in every single reply, whether it is finished. Most people never listen for it.',
            zh: '一个问题。Leo 在隔壁房间坐上一壶水，然后把门关上。他看不见那壶水，那他怎么知道水开了？他不会去掐表猜。他等那声哨响——壶自己会告诉他。而 Leo 的 agent 也有一声哨：它在**每一次**回复里都会宣告自己有没有讲完。只是大多数人从来没去听。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'stop_reason',
                    problem: { zh: '模型停下来有两种完全不同的原因，而只看正文，两种**长得一模一样**。', en: 'The model stops for two very different reasons, and in the text they look **identical**.' },
                    solution: { zh: '读每次回复上的这个字段，按它分支：tool_use 就继续，end_turn 就收工。', en: 'Read this field on every reply and branch: tool_use continues, end_turn finishes.' },
                    essence: { zh: '**它只是信封外面的一张标签**。不是状态机，不是协议，就是一个词。', en: '**It is just a label on the outside of the envelope.** Not a state machine. One word.' },
                },
            ],
        },
    },
    {
        id: 'stop-reason',
        kind: 'rows',
        imagePrompt:
            STYLE + ' A happy stick figure stands next to a giant lever mounted on the floor, gripping the handle with both hands, feet planted wide. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        teaches: ['read-the-signal'],
        narration: {
            en: 'So Leo\'s agent is looping. Tool, result, tool, result. When does it stop? Leo\'s first instinct is to count rounds. That instinct is wrong. The answer already came back in the response. It\'s called stop_reason, and it has two positions. tool_use, run the tool, go round again. end_turn, finished. And that iteration cap Leo added? That\'s a seatbelt. It is not the steering wheel.',
            zh: 'Leo 的 agent 在循环。调工具、拿结果、再调、再拿。那它什么时候停？Leo 的第一反应是数轮数。这个反应是错的。答案早就随响应回来了，叫 stop_reason，它只有两档：tool_use，执行工具，再来一圈；end_turn，结束。至于 Leo 加的那个轮数上限？那是安全带，不是方向盘。',
        },
        visual: {
            type: 'rows',
            rows: [
                { term: 'tool_use', detail: { en: 'run the tool, go round again', zh: '执行工具，再来一圈' }, verdict: 'good' },
                { term: 'end_turn', detail: { en: 'finished — present the answer', zh: '结束了——把答案交出去' }, verdict: 'good' },
                { term: 'iteration cap', detail: { en: 'a seatbelt, never the steering wheel', zh: '是安全带，不是方向盘' }, verdict: 'bad' },
            ],
        },
    },
    {
        id: 'three-blank-letters',
        kind: 'rows',
        artFrom: 'three-coats',
        teaches: ['two-truncations'],
        narration: {
            en: 'Now imagine three letters arrive and all three just stop halfway down the page. Same blank space at the bottom. But one writer ran out of paper. One was handed an envelope too small to post. And one read the request and decided, nope, not writing that. Three identical-looking pages, three unrelated problems. Would photocopying any of them and posting it again fix a single one? No.',
            zh: '现在想象收到三封信，三封都写到一半就停了。信纸下半截都是空的，看起来一模一样。但第一个人是纸用完了。第二个人是信封太小，根本寄不出去。第三个人是看完要求以后决定：不写。三张长得一样的纸，三个毫不相干的问题。把它们复印一份重新寄一遍，能解决其中任何一个吗？不能。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'max_tokens',
                    problem: { zh: '一次失控的回复可以一直写下去，把钱烧光。', en: 'A runaway reply can keep writing until the budget is gone.' },
                    solution: { zh: '在请求里设一个上限，规定它最多写多少。', en: 'Set a ceiling in the request for how much it may write.' },
                    essence: { zh: '**这是 Leo 自己拧的旋钮，不是模型的极限**。撞上了就调高、改流式，或拆任务。', en: '**Leo’s own dial, not the model’s limit.** Raise it, stream it, or split the task.' },
                },
                {
                    term: 'model_context_window_exceeded',
                    problem: { zh: '对话越滚越长，直到**再也塞不进去**。', en: 'The conversation grows until it **no longer fits**.' },
                    solution: { zh: '发出请求之前先压缩、裁剪，或把历史总结掉。', en: 'Compact, trim, or summarise the history before the call.' },
                    essence: { zh: '**它和 max_tokens 分属两端**：一个是装不下，一个是写不完。', en: '**Opposite end from max_tokens**: one will not fit in, the other will not finish coming out.' },
                },
                {
                    term: 'refusal',
                    problem: { zh: '模型什么都没写，日志上却和被截断长得一样。', en: 'The model wrote nothing, and the log looks the same as a truncation.' },
                    solution: { zh: '把它呈现给人看，别当故障重试。', en: 'Show it to a person. Do not retry it as a fault.' },
                    essence: { zh: '**这不是错误，是一个决定**。原样重试，回来的还是同一个决定。', en: '**Not an error — a decision.** Retry it unchanged and the decision does not change.' },
                },
            ],
        },
    },
    {
        id: 'three-coats',
        kind: 'rows',
        imagePrompt:
            STYLE + ' Three identical stick figures stand in a police lineup, each wearing the exact same oversized trench coat, whistling innocently. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        teaches: ['two-truncations'],
        narration: {
            en: 'Then it starts failing. And the log says, quote, incomplete output. Thanks, log. Because that\'s not one bug, it\'s three, and they\'re all wearing the same coat. max_tokens? A budget Leo set himself. model_context_window_exceeded? The input doesn\'t fit anymore. refusal? Not a bug at all. A decision. Retry any of them unchanged and back comes the exact same failure.',
            zh: '接着它开始出问题，日志上写着——「输出不完整」。谢谢啊日志。因为这根本不是一个 bug，是三个，而且穿着同一件外套。max_tokens？那是 Leo 自己设的预算。model_context_window_exceeded？输入塞不下了。refusal？那压根不是故障，是一个决定。哪个原样重试，回来的都是一模一样的失败。',
        },
        visual: {
            type: 'rows',
            rows: [
                { term: 'max_tokens', detail: { en: 'Leo\'s output budget — raise it, stream, or split the task', zh: '你设的输出预算——调高、改流式，或拆任务' }, verdict: 'bad' },
                { term: 'model_context_window_exceeded', detail: { en: 'the input no longer fits — compact or trim', zh: '输入塞不下了——压缩或裁剪' }, verdict: 'bad' },
                { term: 'refusal', detail: { en: 'a decision, not a glitch — surface it to a human', zh: '那是一个决定，不是故障——呈现给人看' }, verdict: 'bad' },
            ],
        },
    },

    // ── Chapter 2 · Splitting the work ───────────────────────────────────────
    {
        id: 'queue-of-helpers',
        kind: 'veo',
        fixedSeconds: 7,
        imagePrompt:
            `${STYLE} A long queue of nearly identical small stick figures waits outside an office door, ` +
            'each clutching a tiny résumé. The original stick figure peers out through the doorway, overwhelmed.',
        motion: '2D cartoon motion. The queue shuffles forward. Slow pan along the line.',
        narration: {
            en: 'Now the hiring. And this is where it gets interesting, because the instinct is to hire for everything, and that instinct is wrong more often than it\'s right.',
            zh: '现在开始招人。有意思的地方来了——直觉是什么活儿都招个人来干，而这个直觉，错的时候比对的时候多。',
        },
    },
    {
        id: 'note-in-your-hand',
        kind: 'rows',
        artFrom: 'dont-delegate',
        teaches: ['dont-delegate', 'follow-thread'],
        narration: {
            en: 'Leo is holding a note. Three sentences on it. And he walks it across the office, hands it to a colleague, and asks them to read it back to him. That\'s it. That\'s what spawning a subagent for something already in context looks like. Not delegation. A longer walk to the same answer.',
            zh: 'Leo 手里拿着一张便条，上面就三句话。然后他走到办公室另一头，把它递给同事，请他读一遍再讲给自己听。就是这样。为已经在上下文里的内容开一个 subagent，看起来就是这个样子。那不叫委派，那叫绕远路拿同一个答案。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'subagent',
                    problem: { zh: '大块工作会把协调方的上下文淹掉。', en: 'Big work floods the coordinator context.' },
                    solution: { zh: '派一个独立的执行者去做，只让它回报结果。', en: 'Send an independent worker and take back only the result.' },
                    essence: { zh: '**它从零开始，对协调方一无所知**——所以交底就是它的全部世界。', en: '**It starts from zero and knows nothing** — its prompt is its entire world.' },
                },
            ],
        },
    },
    {
        id: 'dont-delegate',
        kind: 'compare',
        imagePrompt:
            STYLE + ' A stick figure at a desk holds a tiny sticky note away from an eager queue of helper stick figures leaning in from behind, waving them off. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        teaches: ['dont-delegate', 'follow-thread'],
        narration: {
            en: 'Work\'s piling up, so Leo hires. Naturally. But here\'s the one that gets everybody: most of the time, he shouldn\'t. If the answer is already sitting in his own context, spinning up a helper to go read it again isn\'t clever architecture. It\'s a slower version of Leo.',
            zh: '活儿堆起来了，于是 Leo 开始招人。很自然。但最容易栽的一条是：大多数时候，不该招。答案要是已经躺在自己的上下文里，再开个 subagent 去重读一遍，那不叫架构精巧，那只是一个更慢的 Leo。',
        },
        visual: {
            type: 'columns',
            items: [
                { label: { en: 'Delegate simple tasks already in context', zh: '把上下文里现成的内容派给 subagent' }, verdict: 'bad', note: { en: 'wastes latency & tokens', zh: '浪费时间与 Token' } },
                { label: { en: 'Keep in single agent / delegate only to isolate', zh: '保持单 Agent / 只有隔离时才派人' }, verdict: 'good', note: { en: 'context remains intact', zh: '上下文完整无损' } },
            ],
        },
    },
    {
        id: 'proofreading-pass',
        kind: 'rows',
        artFrom: 'three-passes',
        teaches: ['contract-breakdown'],
        narration: {
            en: 'Ever proofread your own writing? Catching typos and checking the logic and fixing the formatting all in one read, and the eye just slides over everything. Editors worked this out ages ago. One pass for spelling. Another for structure. Another for style. Same trick applies here.',
            zh: '自己校对过文章吗？想着一遍就把错别字、逻辑、格式全挑出来，结果眼睛从头滑到尾，什么都没抓到。编辑们早就想明白了：一遍只挑错别字，一遍只看结构，一遍只管文风。同一个道理，这儿一样管用。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'prompt chaining',
                    problem: { zh: '一个 prompt 同时扛三件事，三件都做得敷衍。', en: 'One prompt holding three jobs does all three badly.' },
                    solution: { zh: '拆成几趟各有侧重的处理，最后合并。', en: 'Split into focused passes and merge at the end.' },
                    essence: { zh: '**这就是校对的老办法**：一遍只看一件事。没有框架，就是顺序调用。', en: '**It is the proofreader’s trick**: one thing per pass. No framework — just sequential calls.' },
                },
            ],
        },
    },
    {
        id: 'three-passes',
        kind: 'diagram',
        imagePrompt:
            STYLE + ' A stick figure inspector with a magnifying glass examines one document while two more copies of the same figure wait behind, each holding a different colored stamp. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        teaches: ['contract-breakdown'],
        narration: {
            en: 'So when Leo does split the work up, he splits it by thinking, not by file. Reviewing a pull request? A style pass. Then a security pass. Then a docs pass. Three clean sweeps, merged at the end, beat one giant prompt holding all three thoughts at once. Every time.',
            zh: '所以 Leo 真要拆活儿的时候，按「思考方式」拆，不按文件拆。审一个 PR？先走一遍代码风格，再走一遍安全，再走一遍文档。三趟干净的扫描最后合并，一定赢过一个巨大的 prompt 同时扛三件事。每次都赢。',
        },
        visual: {
            type: 'flow',
            nodes: ['PR', 'style pass', 'security pass', 'docs pass', 'synthesis'],
        },
    },
    {
        id: 'script-vs-goal',
        kind: 'veo',
        fixedSeconds: 7,
        imagePrompt:
            `${STYLE} Split composition. On the left a stick figure hands a helper an absurdly long unrolling ` +
            'scroll that spills across the floor. On the right the same figure hands a different helper one small ' +
            'square sticky note.',
        motion: '2D cartoon motion. The scroll keeps unrolling while the right helper walks off confidently.',
        narration: {
            en: 'Say this one really does need help. Now: what goes in the briefing? Because there are two very different ways to tell somebody what\'s wanted.',
            zh: '假设这件事确实需要找人。那么问题来了：交底的时候到底写什么？因为「告诉别人你要什么」，有两种截然不同的写法。',
        },
    },
    {
        id: 'directions-vs-destination',
        kind: 'rows',
        artFrom: 'brief-with-goals',
        teaches: ['recruit-agents'],
        narration: {
            en: 'Two ways to send someone somewhere. Turn-by-turn directions: left here, right there, third exit. Works perfectly, right up until there\'s roadworks. Then they\'re just standing there. Or tell them the destination and when it matters, and suddenly a closed road is a minor inconvenience instead of a full stop.',
            zh: '让一个人去某个地方，有两种说法。逐步指令：这里左转、那里右转、走第三个出口。完全没问题——直到前面在修路。然后他就杵在那儿了。或者告诉他目的地和几点必须到，这时候一条封了的路就只是个小麻烦，而不是彻底停摆。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'goal-oriented prompt',
                    problem: { zh: '固定脚本一旦碰上现实不符，subagent 就杵在那儿回一句「结果不足」。', en: 'A fixed script leaves the subagent stuck, reporting insufficient results.' },
                    solution: { zh: '交出去目标和「什么算好」，而不是步骤。', en: 'Hand over the objective and the quality bar, not the steps.' },
                    essence: { zh: '**交底不是下命令，是授权**。同一个模型，行为天差地别。', en: '**A brief is authority, not instructions.** Same model, completely different behaviour.' },
                },
            ],
        },
    },
    {
        id: 'brief-with-goals',
        kind: 'compare',
        imagePrompt:
            STYLE + ' A stick figure hands a small bright flag to a helper who salutes confidently, while a crumpled long scroll lies discarded on the floor beside them. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        teaches: ['recruit-agents'],
        narration: {
            en: 'And how Leo briefs them? That\'s everything. Hand a subagent exact search queries, and the moment reality doesn\'t match, it shrugs and reports insufficient results. Give it the actual goal, and what a good source looks like, and it finds another way in. Same model. Completely different behaviour.',
            zh: '而 Leo 怎么交底？这就是全部。把精确的检索词甩给 subagent，现实一对不上，它就耸耸肩回一句「结果不足」。给它真正的目标，再说清什么算好来源，它自己就会绕道进去。同一个模型，行为天差地别。',
        },
        visual: {
            type: 'columns',
            items: [
                { label: { en: 'Rigid micro-managed script', zh: '死板到步骤的微观脚本' }, verdict: 'bad', note: { en: 'cannot adapt to edge cases', zh: '无法应对边缘情况' } },
                { label: { en: 'Objective goal + quality criteria', zh: '明确目标 + 质量验收标准' }, verdict: 'good', note: { en: 'adapts autonomously', zh: '自主变通解决' } },
            ],
        },
    },

    // ── Chapter 3 · Order and speed ──────────────────────────────────────────
    {
        id: 'dominoes',
        kind: 'veo',
        fixedSeconds: 7,
        imagePrompt:
            `${STYLE} A row of large dominoes where one in the middle has been placed backwards, ` +
            'breaking the chain. A stick figure crouches beside it, scratching its head.',
        motion: '2D cartoon motion. Dominoes topple, stall at the reversed one.',
        narration: {
            en: 'Next problem. Leo has helpers, they\'re briefed, and now they\'re all going at once. Which is great, right up until two of them needed to happen in a specific order.',
            zh: '下一个问题。Leo 有帮手了，也交底了，然后他们全都同时动起来。这挺好——直到发现其中两件事必须按特定顺序发生。',
        },
    },
    {
        id: 'ice-before-baking',
        kind: 'rows',
        artFrom: 'forced-first',
        teaches: ['order-of-ops'],
        narration: {
            en: 'Nobody ices a cake that hasn\'t been baked. Obvious. So when a recipe has a real dependency in it, Leo doesn\'t hand over the steps and hope they\'re read in order. He hands over the flour first.',
            zh: '没人会给一个还没烤的蛋糕抹糖霜。这不是废话吗。所以当一份配方里真的存在依赖关系时，Leo 不会把步骤丢出去然后祈祷对方按顺序读。他会先把面粉递过去。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'tool_choice',
                    problem: { zh: '后一个工具需要前一个的产出，而模型可能挑错顺序。', en: 'One tool needs another’s output, and the model may pick the wrong order.' },
                    solution: { zh: '第一轮强制指定那个前置工具，之后再放开成 auto。', en: 'Force the prerequisite on turn one, then release to auto.' },
                    essence: { zh: '**在 prompt 里客气地要求不是保证**。旋钮才是。', en: '**Asking politely in the prompt is not a guarantee.** The dial is.' },
                },
            ],
        },
    },
    {
        id: 'forced-first',
        kind: 'code',
        imagePrompt:
            STYLE + ' A stick figure traffic officer stands at a fork in a tiny road, firmly pointing every toy car down one lane with an outstretched arm. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        teaches: ['order-of-ops'],
        narration: {
            en: 'Some tools need each other. lookup_citations wants a DOI, but extract_metadata hasn\'t run yet. And hoping the model picks the right order on its own? That\'s not a design. That\'s a wish. So Leo forces extract_metadata on turn one, then hands control back with auto.',
            zh: '有些工具是互相需要的。lookup_citations 要一个 DOI，可 extract_metadata 还没跑。这时候指望模型自己挑对顺序？那不叫设计，那叫许愿。所以 Leo 在第一轮直接强制 extract_metadata，之后再放开成 auto。',
        },
        visual: {
            type: 'rows',
            rows: [
                { term: 'turn 1 · tool_choice: extract_metadata', detail: { en: 'the DOI that lookup_citations needs is produced first', zh: '先产出 lookup_citations 需要的 DOI' }, verdict: 'good' },
                { term: 'turn 2+ · tool_choice: auto', detail: { en: 'release control to model reasoning', zh: '之后交还给模型自由判断' }, verdict: 'good' },
            ],
        },
    },
    {
        id: 'twelve-washing-machines',
        kind: 'rows',
        artFrom: 'twelve-at-once',
        teaches: ['parallel-strike'],
        narration: {
            en: 'Twelve loads of laundry. Twelve machines, all free, all sitting there. And in goes one load, wait, out it comes, in goes the next. Nobody would do that. But from the outside, that is exactly what sequential subagent calls look like.',
            zh: '十二筐衣服要洗。十二台洗衣机，全空着，就在那儿摆着。放一筐进去、等它洗完、拿出来、再放下一筐。没人会这么干。但从外面看，串行调用 subagent 就是长这个样子。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'parallel Task calls',
                    problem: { zh: '十二件互不依赖的事排着队跑，人就干等着。', en: 'Twelve independent jobs queue up while everyone waits.' },
                    solution: { zh: '在同一轮里把十二个 Task 调用一起发出去。', en: 'Emit all twelve Task calls in a single turn.' },
                    essence: { zh: '**并行不是配置项，是发送方式**。等的从总和变成最慢的那一个。', en: '**Parallelism is not a setting, it is how you send.** You wait for the slowest, not the sum.' },
                },
            ],
        },
    },
    {
        id: 'twelve-at-once',
        kind: 'compare',
        imagePrompt:
            STYLE + ' One stick figure conductor on a small podium waves a baton at a cluster of twelve tiny identical stick figures who all sprint away simultaneously. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        teaches: ['parallel-strike'],
        narration: {
            en: 'Now flip it around. Twelve precedents, none depending on each other, processed one. At. A. Time. That\'s three minutes of watching a spinner. All twelve Task calls go out in a single turn instead, and they run together. Now the wait is the slowest one, not all of them.',
            zh: '反过来看。十二条判例，彼此毫无依赖，却在一条、一条、一条地跑。三分钟就盯着个转圈。改成在同一轮里把十二个 Task 调用一起发出去，它们就并行了。这下等的是最慢的那一个，而不是所有。',
        },
        visual: {
            type: 'columns',
            items: [
                { label: { en: '12 subagent tasks in serial sequence', zh: '12 个任务按顺序串行执行' }, verdict: 'bad', note: { en: 'wastes 3+ minutes', zh: '浪费 3 分钟以上' } },
                { label: { en: '12 Task calls in 1 coordinator turn', zh: '一轮里发 12 个并发 Task 调用' }, verdict: 'good', note: { en: 'runs concurrently in parallel', zh: '瞬间并发，速度提升 10 倍' } },
            ],
        },
    },

    // ── Chapter 4 · What falls in the gap ────────────────────────────────────
    {
        id: 'canyon-shout',
        kind: 'veo',
        fixedSeconds: 7,
        imagePrompt:
            `${STYLE} Two stick figures stand on opposite cliff edges of a wide canyon. A paper plane launched from one side tumbles into the abyss below.`,
        motion: '2D cartoon animation. The paper plane falls into the canyon.',
        narration: {
            en: 'The next chapter is the one worth paying most attention to, because this is where multi-agent systems don\'t just slow down. This is where they quietly produce wrong answers and nobody notices.',
            zh: '接下来这一章最值得留神，因为多 agent 系统在这儿不只是变慢——是会悄悄产出错误答案，而且没人会发现。',
        },
    },
    {
        id: 'shift-handover',
        kind: 'rows',
        artFrom: 'no-inheritance',
        teaches: ['intel-handoff'],
        narration: {
            en: 'A nurse comes on shift. She doesn\'t magically know what happened to the patient overnight. Somebody has to hand it over. What was observed, what proves it, who said so, and when. And if the outgoing nurse just says \'yeah, rough night\' and walks off? Everything that mattered is gone.',
            zh: '护士来接班。她不会凭空知道病人昨晚发生了什么。必须有人交接：观察到了什么、依据是什么、谁说的、什么时候。要是交班的人只丢下一句「昨晚挺难受的」就走了呢？真正要紧的东西全没了。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'context inheritance',
                    problem: { zh: '大家默认 subagent 会「知道」协调方知道的事。', en: 'People assume a subagent somehow knows what the coordinator knows.' },
                    solution: { zh: '把结论按 claim、evidence、source、date 直接注进它的 prompt。', en: 'Inject the findings as claim, evidence, source, date.' },
                    essence: { zh: '**它不存在。从来没有过**。没写进 prompt 的，就是不存在。', en: '**It does not exist. It never has.** What is not in the prompt is not there.' },
                },
            ],
        },
    },
    {
        id: 'no-inheritance',
        kind: 'rows',
        imagePrompt:
            STYLE + ' Two stick figures stand on separate small floating islands with a gap between them; one carefully throws a neat parcel across while the other reaches to catch it. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        teaches: ['intel-handoff'],
        narration: {
            en: 'This one. This is where multi-agent systems actually die. A subagent does not inherit what Leo knows. It knows nothing. So the findings go straight into its prompt: claim, evidence, source, date. A readable prose summary feels helpful, and it quietly drops the evidence on the floor.',
            zh: '这一条。多 agent 系统真正的死因就在这儿。subagent 不会继承 Leo 知道的东西，它什么都不知道。所以结论要直接进它的 prompt：claim、evidence、source、date。一段读着舒服的散文摘要看起来很贴心，却会悄悄把证据丢在地上。',
        },
        visual: {
            type: 'rows',
            rows: [
                { term: 'Embed findings as { claim, evidence, source, date }', detail: { en: 'structured, so the evidence survives the handoff', zh: '结构化，证据才不会在交接中丢失' }, verdict: 'good' },
                { term: 'Assume subagent "inherits" parent state', detail: { en: 'context inheritance does not exist!', zh: '上下文继承根本不存在！' }, verdict: 'bad' },
            ],
        },
    },
    {
        id: 'two-witnesses',
        kind: 'rows',
        artFrom: 'two-numbers',
        teaches: ['conflicting-intel'],
        narration: {
            en: 'Two witnesses describe the same man. One says tall. The other says short. Average them, and out goes a description of someone of medium height, who nobody saw, who doesn\'t exist. The evidence just got worse.',
            zh: '两个目击者描述同一个人。一个说很高，一个说很矮。取个平均，发出去的是一份「中等身高」的描述——那个人谁都没见过，根本不存在。证据反而变糟了。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'conflict_detected',
                    problem: { zh: '两个来源给出不同的数，取平均就造出一个谁都没测过的数。', en: 'Two sources disagree; averaging invents a number nobody measured.' },
                    solution: { zh: '打上标记，两个都留着，把方法论一起交出去。', en: 'Flag it, keep both, and pass the methodology along.' },
                    essence: { zh: '**分歧本身就是一个发现**，不是需要抹平的噪音。', en: '**The disagreement is itself a finding**, not noise to be smoothed away.' },
                },
            ],
        },
    },
    {
        id: 'two-numbers',
        kind: 'compare',
        imagePrompt:
            STYLE + ' A stick figure holds up two mismatched price tags, one in each hand, looking back and forth between them with a puzzled frown. IMPORTANT COMPOSITION: the entire scene and every character is anchored in the LEFT third of the frame; the right HALF of the image is completely empty clean white space with nothing in it.',
        teaches: ['conflicting-intel'],
        narration: {
            en: 'Two agents come back. One says fifty billion, no methodology. The other says thirty-five billion, plus or minus seven, ninety-five percent confidence. Average them? That invents a number nobody measured. Leo sets conflict_detected, keeps both, shows the methodology, and lets the reader decide.',
            zh: '两个 agent 回来了。一个说五百亿，没交代方法。另一个说三百五十亿，正负七十亿，95% 置信。取平均？那是凭空造一个谁都没测过的数。Leo 把 conflict_detected 打上，两个都留着，方法论摆出来，让读的人自己判断。',
        },
        visual: {
            type: 'columns',
            items: [
                { label: { en: 'Average 50B & 35B into 42.5B', zh: '把 500 亿和 350 亿简单的平均成 425 亿' }, verdict: 'bad', note: { en: 'creates meaningless noise', zh: '凭空制造无意义的假数字' } },
                { label: { en: 'conflict_detected: true — preserve both with methodology', zh: 'conflict_detected: true——保留两者并附上方法' }, verdict: 'good', note: { en: 'investigate root disagreement', zh: '追查产生分歧的根源' } },
            ],
        },
    },
    {
        id: 'evidence-bag',
        kind: 'rows',
        artFrom: 'citation-id',
        teaches: ['chain-of-custody'],
        narration: {
            en: 'Police tag evidence at the scene. Not back at the station, not at the courthouse. At the scene, the moment it\'s picked up. Because an untagged bag is just a thing in a bag, and no court will touch it. Nobody can say where it came from.',
            zh: '警察在现场就给证物贴标签。不是回局里再贴，更不是到法庭上再贴。就在现场，捡起来的那一刻。因为一个没贴标签的物证袋，就只是「袋子里有个东西」，法庭根本不会采信——没人说得清它从哪来。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'citation_id',
                    problem: { zh: '报告写出了事实，却没人说得清它从哪来。', en: 'The report states a fact and nobody can trace it.' },
                    solution: { zh: '在最早发现证据的 agent 上就打标签，一路带到底。', en: 'Tag it at the first agent that finds the evidence and carry it down.' },
                    essence: { zh: '**和警察在现场贴证物袋是同一件事**。回局里再贴就晚了。', en: '**Same as tagging evidence at the scene.** Tagging it back at the station is too late.' },
                },
            ],
        },
    },
    {
        id: 'citation-id',
        kind: 'rows',
        imagePrompt:
            STYLE + ' A stick figure firmly presses a bright yellow sticker onto a small golden key it is holding close to its chest. IMPORTANT COMPOSITION: the entire scene and every character is anchored in the LEFT third of the frame; the right HALF of the image is completely empty clean white space with nothing in it.',
        teaches: ['chain-of-custody'],
        narration: {
            en: 'Another one. Leo\'s final report states a crucial fact, and nobody can trace where it came from, because somewhere upstream an agent flattened the sources into prose. So a citation_id gets tagged at the very first agent that finds the evidence. Then that ID travels all the way down, unbroken.',
            zh: '再看一个。Leo 的最终报告写出了一个关键事实，却没人说得清它从哪来——因为上游某个 agent 把来源压成了段落。所以 citation_id 要在最早那个发现证据的 agent 上就打好，然后一路带到底，中间不断。',
        },
        visual: {
            type: 'rows',
            rows: [
                { term: 'citation_id tagged by Agent 1', detail: { en: 'assigned at source discovery, carried through handoffs', zh: '在源头被记录，一路随传递保留' }, verdict: 'good' },
                { term: 'Flattened prose summary without IDs', detail: { en: 'facts remain, source evidence is lost', zh: '事实还在，但出处与证据丢了' }, verdict: 'bad' },
            ],
        },
    },

    // ── Chapter 5 · When it breaks ───────────────────────────────────────────
    {
        id: 'burst-pipes',
        kind: 'veo',
        fixedSeconds: 7,
        imagePrompt:
            `${STYLE} A tangle of pipes burst in two places, spraying water. A stick figure holding a wrench looks on with a funny grin.`,
        motion: '2D cartoon motion. Water sprays in arcs.',
        narration: {
            en: 'And finally: things break. Not might break. Will break. So the last chapter isn\'t about prevention. It\'s about three in the morning, when it already has.',
            zh: '最后：东西会坏。不是可能会坏，是一定会坏。所以最后一章讲的不是怎么防，而是凌晨三点它已经坏了的时候。',
        },
    },
    {
        id: 'back-from-holiday',
        kind: 'rows',
        artFrom: 'tell-it-what-changed',
        teaches: ['scene-changed'],
        narration: {
            en: 'Back from two weeks off. Two hundred emails. A colleague could say \'read all of it, good luck.\' Or \'three things changed, here they are, the rest is noise.\' Same information. Wildly different afternoon.',
            zh: '休了两周假回来，两百封邮件。同事可以说「全看一遍吧，祝你好运」。也可以说「就变了三件事，喏，其余都是噪音」。同样的信息量，下午过得完全是两回事。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'explicit delta',
                    problem: { zh: '环境只变了三个文件，agent 却把十二个重读一遍。', en: 'Three files changed; the agent re-reads all twelve.' },
                    solution: { zh: '恢复会话时明确说：这三个改了，看这三个。', en: 'On resume, say exactly which three changed.' },
                    essence: { zh: '**为没变的内容重读一遍，等于同一份阅读付两次钱**。', en: '**Re-reading what did not change pays twice for the same reading.**' },
                },
            ],
        },
    },
    {
        id: 'tell-it-what-changed',
        kind: 'compare',
        imagePrompt:
            STYLE + ' A stick figure points confidently at three glowing green folders sitting apart from a small grey pile of other folders. IMPORTANT COMPOSITION: the entire scene and every character is anchored in the LEFT third of the frame; the right HALF of the image is completely empty clean white space with nothing in it.',
        teaches: ['scene-changed'],
        narration: {
            en: 'Sometimes nothing crashed. The world just moved. Leo reviewed twelve files, a developer edited three. He could make the agent re-read all twelve and pay twice for the same reading. Or say: these three changed, look at those. Same result, a fraction of the cost.',
            zh: '有时候根本没崩，只是世界变了。Leo 审了十二个文件，开发者改了其中三个。他可以让 agent 把十二个重读一遍，为同一份阅读付两次钱。也可以说一句：这三个改了，看这三个。结果一样，成本只是零头。',
        },
        visual: {
            type: 'columns',
            items: [
                { label: { en: 'Re-analyze all 12 files from scratch', zh: '12 个文件全部重新分析一遍' }, verdict: 'bad', note: { en: 'pays twice for same reading', zh: '同一份阅读付两次 Token 钱' } },
                { label: { en: 'Explicit Delta: "these 3 files changed"', zh: '显式增量：「这 3 个文件改了」' }, verdict: 'good', note: { en: 'focuses agent strictly on diff', zh: '让 Agent 专注于变更增量' } },
            ],
        },
    },
    {
        id: 'corrupted-autosave',
        kind: 'rows',
        artFrom: 'checkpoint',
        teaches: ['pipeline-down'],
        narration: {
            en: 'A document crashes. And there\'s an autosave sitting right there. Tempting. But that file is half-corrupted, and opening it inherits every bit of the mess. So Leo doesn\'t. He takes the pages he knows are good, opens a clean document, and pastes them in.',
            zh: '文档崩了。旁边就躺着一个自动保存的版本，挺诱人。但那个文件已经坏了一半，打开它，那一摊烂东西全得继承过来。所以 Leo 不打开。他把确认没问题的那几页拿出来，开一个干净的新文档，粘进去。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'stale tool results',
                    problem: { zh: '崩溃的会话里全是做了一半的结果，而它们**看起来和真结论一模一样**。', en: 'A crashed session is full of half-finished output that **looks exactly like real findings**.' },
                    solution: { zh: '把已完成的写进结构化文件，开新会话再注进去。', en: 'Write what finished into a structured file and inject it into a fresh session.' },
                    essence: { zh: '**resume 不是继续，是把一整摊烂账继承过来**。', en: '**Resuming is not continuing — it is inheriting the whole mess.**' },
                },
            ],
        },
    },
    {
        id: 'checkpoint',
        kind: 'rows',
        imagePrompt:
            STYLE + ' A cheerful stick figure plants a small flag into the ground beside a closed laptop, giving a thumbs up. IMPORTANT COMPOSITION: the entire scene and every character is anchored in the LEFT third of the frame; the right HALF of the image is completely empty clean white space with nothing in it.',
        teaches: ['pipeline-down'],
        narration: {
            en: 'And when it really does crash? Twelve documents into eighteen, every agent half-done. Resuming drags every stale tool result back in along with it. So what\'s finished goes into a structured checkpoint file, a fresh session starts, and the checkpoint gets injected.',
            zh: '那它真崩了呢？十八份文档跑到第十二份，每个 agent 都做了一半。直接 resume 会把所有过期的工具结果一并拖回来。所以已完成的写进一个结构化的 checkpoint 文件，开一个全新的会话，再把 checkpoint 注进去。',
        },
        visual: {
            type: 'rows',
            rows: [
                { term: 'Resume crashed session with stale tool outputs', detail: { en: 'inherits corrupted tool outputs & errors', zh: '连同过期的报错和污染结果一起继承' }, verdict: 'bad' },
                { term: 'structured checkpoint file ➔ fresh session', detail: { en: 'completed findings injected explicitly', zh: '把已完成的结论显式注入' }, verdict: 'good' },
            ],
        },
    },
    {
        id: 'three-burnt-dishes',
        kind: 'rows',
        artFrom: 'three-hundred',
        teaches: ['pipeline-down'],
        narration: {
            en: 'Catering a banquet. A hundred dishes go out, three come back burnt. Throw out the entire banquet and start cooking from scratch? No. Find the three, fix the three, send the three back out.',
            zh: '在办一场宴席。一百道菜上出去，三道被退回来说糊了。把整桌宴席倒掉、从头再做一遍吗？不会。找出那三道，修好那三道，把那三道重新端出去。',
        },
        visual: {
            type: 'define',
            entries: [
                {
                    term: 'custom_id',
                    problem: { zh: '一万份里挂了三百份，可不知道是哪三百份。', en: 'Three hundred of ten thousand failed, and nobody knows which three hundred.' },
                    solution: { zh: '提交时给每一项打标签；结果文件会用它点名失败项。', en: 'Label every item going in; the result file names each failure by it.' },
                    essence: { zh: '**它让「重试」从整批变成三百份**。批处理省下的钱就靠这个。', en: '**It turns “retry” from ten thousand into three hundred.** That is where batch savings live.' },
                },
            ],
        },
    },
    {
        id: 'three-hundred',
        kind: 'compare',
        imagePrompt:
            STYLE + ' A stick figure with a headlamp picks three glowing red boxes out of an enormous wall of thousands of tiny grey boxes, holding a small basket. IMPORTANT COMPOSITION: the entire scene and all characters are anchored in the LEFT third of the frame; the right half of the image is mostly empty clean white space.',
        teaches: ['pipeline-down'],
        narration: {
            en: 'Now scale that up. Ten thousand documents in one batch, three hundred fail on context length. And the result file names every failure by custom_id. So exactly those three hundred come out, get chunked, and go back in. Re-running ten thousand to fix three percent is how batch savings evaporate.',
            zh: '放大到批处理。一万份文档，三百份因为上下文超长挂了。而结果文件用 custom_id 标出了每一个失败项。于是精确捞出这三百份，切块，重新交回去。为了修 3% 而重跑一万份，批处理省下的钱就是这么蒸发的。',
        },
        visual: {
            type: 'columns',
            items: [
                { label: { en: 'Re-run all 10,000 batch jobs', zh: '重跑全部 1 万份批处理任务' }, verdict: 'bad', note: { en: 'evaporates batch savings', zh: '白白浪费大量计算成本' } },
                { label: { en: 'Extract 300 failed items by custom_id', zh: '按 custom_id 提取 300 份失败项' }, verdict: 'good', note: { en: 'resubmit only failed chunked items', zh: '只切块重新提交失败的部分' } },
            ],
        },
    },
    {
        id: 'thirteen-doors',
        kind: 'veo',
        fixedSeconds: 7,
        imagePrompt:
            `${STYLE} A wide street lined with thirteen cartoon buildings, each door opening with golden light. A stick figure stands at the start of the street.`,
        motion: '2D cartoon motion. All 13 doors open.',
        narration: {
            en: 'That\'s all five chapters. And every one of them is a door in this district, with a real question behind it.',
            zh: '五章讲完了。而这五章里的每一个点，在这个区里都对应着一扇门，门后是一道真题。',
        },
    },
    {
        id: 'go-find-out',
        kind: 'compare',
        imagePrompt:
            STYLE + ' A smiling stick figure wearing a graduation cap strides forward with one arm raised, a pencil tucked behind its ear. IMPORTANT COMPOSITION: the entire scene and every character is anchored in the LEFT third of the frame; the right HALF of the image is completely empty clean white space with nothing in it.',
        teaches: [],
        narration: {
            en: 'So that\'s the district. Thirteen buildings, thirteen decisions. Not one of them answered by memorising a definition. Every one is a call somebody had to make at three in the morning with the pipeline down. Leo has the reasoning now. So do you. Go use it.',
            zh: '这就是整个编排区。十三栋楼，十三个决定。没有哪一个是靠背定义能答出来的。每一个都是有人在凌晨三点、管线还断着的时候必须做的判断。Leo 已经有了这套道理。你也有了。去用吧。',
        },
        visual: {
            type: 'columns',
            items: [
                { label: { en: 'Ready to build agentic systems', zh: '准备好构建 Agent 架构' }, verdict: 'good' },
                { label: { en: 'Take the practice quiz now below!', zh: '立即开始做题测试知识点！' }, verdict: 'good', note: { en: 'test Leo\'s lesson', zh: '检验你的掌握程度' } },
            ],
        },
    },
];

export const DOMAIN_1_FILM: VideoLesson = {
    // `missionId`/`domainOrder` are the VideoLesson contract every generator
    // filters on — a rename to `id` silently emptied their lesson lists.
    missionId: 'domain-1-overview',
    domainOrder: 1,
    title: {
        en: 'The One-Person Agency — Domain 1 Agentic Architecture',
        zh: '一个人的事务所 — Domain 1 Agentic 架构',
    },
    subtitle: {
        en: 'Thirteen missions, five chapters, real-world patterns',
        zh: '十三任务、五章结构、真实避坑指南',
    },
    beats: BEATS,
};

export function assertFullCoverage(missionIds: string[]): void {
    const covered = new Set<string>();
    for (const b of BEATS) {
        for (const m of (b as TaughtBeat).teaches ?? []) {
            covered.add(m);
        }
    }
    const missing = missionIds.filter(m => !covered.has(m));
    if (missing.length > 0) {
        throw new Error(`Domain 1 film missing coverage for missions: ${missing.join(', ')}`);
    }
}

/** Everything a beat says, as one searchable string. */
function beatText(beat: TaughtBeat): string {
    const parts: string[] = [beat.narration?.en ?? ''];
    const v = beat.visual;
    if (v?.type === 'rows') parts.push(...v.rows.map(r => `${r.term} ${r.detail.en}`));
    if (v?.type === 'columns') parts.push(...v.items.map(i => `${i.label.en} ${i.note?.en ?? ''}`));
    if (v?.type === 'flow') parts.push(v.nodes.join(' '));
    if (v?.type === 'code') parts.push(v.lines.map(l => l.text).join(' '));
    if (v?.type === 'card') parts.push(v.headline.en);
    // The define cards were missing from this list, which meant the content
    // guard could not see the term panels at all — the densest API text in the
    // whole film was unchecked while the guard reported success.
    if (v?.type === 'define') {
        parts.push(...v.entries.map(e =>
            `${e.term} ${e.problem.en} ${e.solution.en} ${e.essence.en}`));
    }
    return parts.join(' ');
}

/** snake_case identifiers — the API surface a beat claims to be teaching. */
const identifiers = (text: string): string[] =>
    Array.from(new Set(text.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) ?? []));

/**
 * Fails if a beat names an API identifier its own mission never mentions.
 *
 * Coverage alone was not enough. The film once taught `stop_sequence` and
 * `tool_use` as output-failure causes for a question that is actually about
 * `max_tokens`, `model_context_window_exceeded` and `refusal`. Every mission
 * had a beat, so the coverage check passed — while the video coached viewers
 * straight into the wrong answer. This compares what a beat says against what
 * its question tests, which is the part that actually has to stay true.
 *
 * `missionText` maps a mission id to its prompt, options and takeaway joined.
 */
export function assertContentMatchesMissions(missionText: Record<string, string>): void {
    const problems: string[] = [];

    for (const beat of BEATS) {
        if (!beat.teaches?.length) continue;
        const allowed = beat.teaches.map(id => (missionText[id] ?? '').toLowerCase()).join(' ');
        for (const token of identifiers(beatText(beat))) {
            if (!allowed.includes(token.toLowerCase())) {
                problems.push(`  ${beat.id} says "${token}" — not in ${beat.teaches.join('/')}`);
            }
        }
    }

    if (problems.length) {
        throw new Error(
            `Domain 1 film contradicts the questions it teaches:\n${problems.join('\n')}\n` +
            'Fix the beat, or the video will coach viewers into the wrong answer.',
        );
    }
}
