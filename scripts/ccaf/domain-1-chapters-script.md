# Domain 1 — 五支短片 · 旁白定稿

> 这份文档由 `domain1Chapters.ts` 生成，**不要直接改这里**。
> 在这上面提意见，改动写回 .ts，再跑 `npx tsx scripts/ccaf/export-chapters-script.mjs`。

参照 System Design 样片的节奏：**场景 → 弯路 → 机制 → 术语 → 陷阱 → 出口**。
## 总览

| 章 | 标题 | beats | 时长 | 屏幕上的标识符 |
|---:|---|---:|---:|---|
| 1 | 它什么时候停了 | 7 | ~2:59 | `stop_reason` |
| 2 | 把活拆开 | 7 | ~3:02 | `subagent` |
| 3 | 顺序与速度 | 6 | ~2:03 | `tool_choice` |
| 4 | 交接 | 6 | ~2:15 | `citation_id` |
| 5 | 坏掉之后 | 6 | ~2:04 | `checkpoint` |
| | **合计** | **32** | **~12:23** | **5 个** |

对比改写前：**45 beats · 14:06 · 32 个标识符 · 105 行密集卡片文本**。

每章屏幕上最多一个标识符；其余术语只在旁白里带过一次，名字的记忆交给练习题。

---

## 第 1 章 · 它什么时候停了
### Knowing When It Stopped

**一句话**：模型每次回复都写着它为什么停下来。几乎没人去读那一行。

`7` beats · `~2:59` · 屏幕上的标识符：`stop_reason`

#### `c1-scene`  ·  0:00 → 0:17  (17.1s)

> Leo built an agent that reads invoices and files them. It ran fine for a week. Then on Monday it filed three invoices and stopped. No error. No crash. It just stopped. So he ran it again. Three invoices, then nothing.

中文字幕：Leo 做了一个 agent，读发票、归档。跑了一星期都好好的。然后周一那天，它归档了三张发票，就停了。**没有报错，没有崩溃，就是停了**。他又跑了一遍。还是三张，然后没了。

#### `c1-wrong-fix`  ·  0:17 → 0:43  (26.3s)

> So Leo did what most people do. He wrapped it in a counter: run twenty times, no matter what. And it worked, sort of. It stopped stopping early. It also kept calling the model long after there was nothing left to file. He was paying for twenty turns to get three invoices done. He had traded a bug for a more expensive one.

中文字幕：于是 Leo 做了大多数人都会做的事：套一个计数器，**不管怎样跑二十次**。有点用 —— 它不再提前停了。但它也在没东西可归档之后，继续一遍遍地调模型。他花了二十轮的钱，办了三张发票的事。**他把一个 bug 换成了一个更贵的 bug**。

#### `c1-mechanism`  ·  0:43 → 1:11  (27.5s)
*任务：`read-the-signal`*

> Here is what Leo missed. Think of a kettle in the next room with the door shut. You cannot see it. You do not stand there counting seconds and guessing — you wait for the whistle. The kettle tells you. Every reply the model sends back has a whistle on it: one word that says why it stopped talking. Not what it said. Why it stopped.

中文字幕：而 Leo 漏掉的是这个。想象隔壁房间坐着一壶水，门关着。你看不见它。你不会站在那儿数秒然后猜 —— **你等那声哨响**。是水壶告诉你的。模型每一次回复上都带着这么一声哨：**一个词，说明它为什么不说了**。不是它说了什么。是它为什么停。

#### `c1-term`  ·  1:11 → 1:39  (28.3s)
*任务：`read-the-signal`*

> It is called stop_reason, and in a loop only two values matter. One means: I asked for a tool, go run it and come back to me. The other means: I am done, stop asking. Read that one field and the loop writes itself. Run the tool, send the result back, go around. Or stop. The counter stays — but as a fire alarm, not a steering wheel.

中文字幕：它叫 **stop_reason**，在循环里只有两个值要紧。一个的意思是：**我要用工具，你去跑，跑完回来找我**。另一个的意思是：**我说完了，别再问了**。读懂这一个字段，循环就自己写好了 —— 跑工具、把结果送回去、再来一轮；或者停。计数器还留着，但它是**火警铃，不是方向盘**。

**术语卡 · `stop_reason`**

| | |
|---|---|
| 问题 | 循环分不清「我要用工具」和「我讲完了」，于是要么**提前停**，要么**停不下来**。<br/><sub>The loop cannot tell "I need a tool" from "I am finished", so it either stops early or runs forever.</sub> |
| 解法 | **每一轮都按它分支**：tool_use 就继续跑，end_turn 就收工。<br/><sub>Branch on it every turn. tool_use → run it and continue. end_turn → stop.</sub> |
| 本质 | **它就是信封外面的一张标签**。不是状态机，不是协议，就是一个词。<br/><sub>It is a label on the outside of the envelope. Not a state machine. One word.</sub> |

#### `c1-twist`  ·  1:39 → 2:22  (42.5s)
*任务：`two-truncations`*

> Now the part that costs people a week. The same agent starts returning summaries that end mid-sentence. Leo retries. Cut off in exactly the same place. He retries again. Same. Because "the output got cut off" is not one problem. It is three, and they arrive wearing the same coat. One is a ceiling Leo set himself — he can simply raise it. One is the input no longer fitting, where raising anything makes it worse. And one is not a failure at all: the model decided not to answer. Retry that one forever and you will get the same no, forever.

中文字幕：接下来这一段，会让人白花一个星期。同一个 agent 开始返回**在句子中间断掉**的摘要。Leo 重试。断在一模一样的地方。再重试。还是一样。因为「输出被截断了」**根本不是一个问题，是三个** —— 而且它们穿着同一件外套出现。一个是 **Leo 自己设的上限**，他把它调高就行。一个是**输入塞不下了**，这时候调高任何东西只会更糟。还有一个**压根不是故障**：模型决定不回答。这一个你重试到天荒地老，收到的都是同一个「不」。

#### `c1-trap`  ·  2:22 → 2:44  (22.1s)
*任务：`two-truncations`*

> So the rule is short. Before you retry anything, read why it stopped. A blind retry is not a fix — it is the same request, arriving again, to be refused again. And an iteration cap is not how you end a loop. It is what catches the loop that forgot to end.

中文字幕：所以规则很短：**在你重试任何东西之前，先读它为什么停**。盲目重试不是修复 —— 那是同一个请求再来一次，然后再被拒绝一次。还有，**迭代上限不是你结束循环的方式**，它是用来兜住那个忘了结束的循环的。

**对照卡**

- ❌ **原样重试，用 N 次上限收尾** — 同一个失败，重复 N 次，还要付钱。**上限掩盖了 bug，而不是结束了循环**。
- ✅ **按 stop_reason 分支，再针对原因处理** — **预算上限 → 调高**。**输入太大 → 压缩或拆开**。**被拒绝 → 改请求，而不是改重试次数**。

#### `c1-outro`  ·  2:44 → 2:59  (15.4s)

> That is the whole chapter. The model already tells you why it stopped, on every single reply. Everything else here was about listening to it. Two missions are waiting below — go and see if it stuck.

中文字幕：整章就这么一件事：**模型每一次回复都已经告诉你它为什么停了**，其余全是关于去听它。下面有两个任务在等着，去看看记住了没有。

---

## 第 2 章 · 把活拆开
### Splitting the Work

**一句话**：多请一个 agent，买到的是一张干净的桌子，不是一个更聪明的员工。

`7` beats · `~3:02` · 屏幕上的标识符：`subagent`

#### `c2-scene`  ·  0:00 → 0:25  (25.4s)

> Leo points his agent at forty contracts and asks it to pull the risky clauses out of each one. The first five come back sharp. By contract twenty they are vague. By contract forty they are wrong. Nothing crashed. The agent is just reading a desk piled with its own previous answers, and the question is somewhere down at the bottom.

中文字幕：Leo 让他的 agent 处理四十份合同，把每份里有风险的条款挑出来。前五份挑得很准。到第二十份开始含糊。到第四十份就错了。**什么都没崩**。只是这个 agent 现在读的是一张堆满自己之前答案的桌子，**而那个问题，压在最底下**。

#### `c2-wrong-fix`  ·  0:25 → 0:55  (29.6s)

> So Leo hires help. Twelve agents, all at once, all pointed at the same pile. And here is the part that surprises everyone: if there are twelve agents now, surely there is more context, not less? There is. There is far more in total. But it is in twelve separate piles, and no agent can see past its own. That is the trade, and it is the whole reason this works.

中文字幕：于是 Leo 招人。十二个 agent，一起上，对着同一堆东西。**这里有个让所有人意外的地方**：现在有十二个 agent，上下文不是应该更多吗？**是更多**。总量上多得多。**但它被分成了十二堆，而每个 agent 都看不到自己那一堆以外的东西**。这就是那笔交易 —— 也正是这件事能成立的全部原因。

#### `c2-term`  ·  0:55 → 1:20  (25.4s)
*任务：`recruit-agents`*

> A subagent is not a smarter model. It is the same model at a clean desk. It gets a job, it gets its own space to work in, and it hands back the conclusion — not the mess it made getting there. Leo's desk stays clean. That is what he is buying. Not speed. Not cleverness. Somewhere to put the pile.

中文字幕：**subagent 不是一个更聪明的模型**。它是同一个模型，坐在一张干净的桌子前。它领一件活，有自己的地方干，然后**交回结论 —— 不交它一路上弄出来的那堆乱麻**。Leo 的桌子始终是干净的。他买的就是这个。不是快，不是聪明，**是有地方放这堆乱麻**。

**术语卡 · `subagent`**

| | |
|---|---|
| 问题 | 一张桌子上既放着问题，又堆着到目前为止的所有答案。到第四十份的时候，**模型读的是自己堆出来的杂物**。<br/><sub>One desk holds the question and every answer so far. By document forty, the model is reading its own clutter.</sub> |
| 解法 | 把这件活交给一个**有自己桌子的独立 agent**，它只回传结论。<br/><sub>Hand the job to a separate agent with its own desk. It returns only the conclusion.</sub> |
| 本质 | **它本质上只是上下文分区**。总量更多，共享的少得多。<br/><sub>It is just context partitioning. More context in total, far less shared.</sub> |

#### `c2-one-job`  ·  1:20 → 1:47  (26.7s)
*任务：`contract-breakdown`*

> There is a second way to split, and it is not about desks at all. Ask a proofreader to check spelling, grammar, tone and legal risk in one pass and they will do all four badly — not because the work is hard, but because switching between four kinds of attention is. Four passes, one job each, then merge. Same reader. Much better result.

中文字幕：还有第二种拆法，跟桌子没关系。你让一个校对同时检查拼写、语法、语气和法律风险，**四样他都会做得很糟** —— 不是因为活难，**是因为在四种注意力之间来回切换很难**。分四遍，每遍只干一件事，最后合并。同一个人，结果好得多。

#### `c2-goals`  ·  1:47 → 2:18  (30.8s)
*任务：`recruit-agents`*

> Now, how Leo words the job matters more than he expects. He writes it as a script: open this file, read section three, copy the table. Then the file has no section three. A person would look for where the table went. A script just stops. Give it the destination instead — find every clause that shifts liability, and tell me where you found it — and it can route around what it finds.

中文字幕：接下来，Leo **怎么写这件活**，比他以为的重要得多。他把它写成了一套动作：打开这个文件，读第三节，把表格抄下来。然后那个文件没有第三节。**换成人会去找表格跑哪儿去了。一套动作只会停在那里**。改成给它目的地 —— 「找出所有转移责任的条款，并告诉我在哪找到的」—— 它就能绕过它遇到的东西。

#### `c2-trap`  ·  2:18 → 2:47  (29.2s)
*任务：`dont-delegate`、`follow-thread`*

> And the trap on the other side. Leo has a two-line note already sitting in front of him, and he spawns an agent to read it back to him. That is not delegation, that is walking the note across the office to have someone hand it back. If the coordinator already holds it, the coordinator answers it. Delegate for a clean desk, a different toolset, or genuine parallelism. Nothing else.

中文字幕：还有反过来的那个坑。Leo 手上已经拿着一张两行的便条了，他却开了一个 agent 去把它念给自己听。**那不叫委派，那叫把便条走过整个办公室，请别人再递回来**。协调方手上已经有的，协调方自己答。**开 subagent 只为三件事：干净的桌子、不同的工具、真正的并行**。没有别的。

**对照卡**

- ❌ **为已经在手上的内容开 agent** — 多一次往返、多一笔钱，**还多一个让答案走样的地方**。
- ✅ **为隔离、工具或并行而委派** — **会淹掉桌子的大活**、**另一套工具**、或者**真的能并排跑的活**。

#### `c2-outro`  ·  2:47 → 3:02  (15.0s)

> One idea, three shapes. Split by desk when the pile is the problem. Split by pass when the attention is the problem. Do not split at all when you already have the answer. Four missions below.

中文字幕：一个想法，三个形态。**堆积是问题时，按桌子拆**。**注意力是问题时，按遍数拆**。**答案已经在手上时，不拆**。下面四个任务。

---

## 第 3 章 · 顺序与速度
### Order and Speed

**一句话**：只在真正要紧的地方强制顺序 —— 第一轮 —— 然后就别挡路。

`6` beats · `~2:03` · 屏幕上的标识符：`tool_choice`

#### `c3-scene`  ·  0:00 → 0:19  (18.8s)

> Leo's agent has two tools: one pulls a document's metadata, one summarises it using that metadata. Most of the time it calls them in that order. Sometimes it summarises first, with nothing to work from, and returns something confident and empty. Same prompt. Different day.

中文字幕：Leo 的 agent 有两个工具：一个取文档的元数据，一个用这些元数据写摘要。**大多数时候**它按这个顺序调。**有时候**它先写摘要 —— 手上什么都没有 —— 然后返回一段自信而空洞的东西。**同一个 prompt，换一天就不一样**。

#### `c3-wrong-fix`  ·  0:19 → 0:39  (20.4s)

> So Leo writes it into the prompt. Important: always call the metadata tool first. In capitals. Twice. And it works most of the time, which is the worst possible outcome, because it means he stops checking. A sentence in a prompt is a request. It is not a guarantee.

中文字幕：于是 Leo 把它写进 prompt 里。「**重要：一定要先调元数据工具**」。大写。写两遍。**然后它大部分时候都对了 —— 这是最糟的结果**，因为这意味着他不再去检查了。**prompt 里的一句话是一个请求，不是一个保证**。

#### `c3-term`  ·  0:39 → 1:08  (28.3s)
*任务：`order-of-ops`*

> There is a setting for this, and it is not in the prompt. On the first turn Leo can name the tool the model must call — not ask, name. The metadata comes back. Then on every turn after that he releases it back to auto, and the model decides for itself. He has pinned the one link that has to be first, and left the rest free.

中文字幕：这件事有一个**开关**，而且它不在 prompt 里。**第一轮**，Leo 可以**指名**模型必须调哪个工具 —— 不是请求，是指名。元数据回来了。**然后从第二轮起他把它放回 auto**，让模型自己决定。他钉住了那个必须排第一的环节，**其余全部放开**。

**术语卡 · `tool_choice`**

| | |
|---|---|
| 问题 | 一个依赖别的工具输出的工具，**有时候会先跑**，然后返回自信的胡话。<br/><sub>A tool that depends on another tool's output runs first sometimes, and returns confident nonsense.</sub> |
| 解法 | **第一轮指名**那个必须先跑的工具，**第二轮起放回 auto**。<br/><sub>Name the required tool on turn 1. Release to auto from turn 2 onward.</sub> |
| 本质 | **它钉住的是第一张多米诺**。全钉死，你就等于自己把流程写死了。<br/><sub>It pins the first domino. Pin them all and you have written the script yourself.</sub> |

#### `c3-parallel`  ·  1:08 → 1:33  (25.4s)
*任务：`parallel-strike`*

> Now the opposite problem. Leo has twelve documents and no dependency between them at all. He sends them one at a time and waits, twelve times over. Twelve washing machines in a row, and he is standing in front of the first one waiting for it to finish before loading the second. Every one of them could have been running already.

中文字幕：现在是反过来的问题。Leo 有十二份文档，**它们之间没有任何依赖关系**。他一份一份地发，等，来回十二遍。**十二台洗衣机排成一排，他站在第一台前面等它转完，才去装第二台**。这十二台本来早就可以一起转了。

#### `c3-trap`  ·  1:33 → 1:58  (25.0s)
*任务：`parallel-strike`*

> The fix is one line of shape, not one line of prose: put all twelve calls in the same reply. One turn out, twelve jobs running, one wait instead of twelve. So the whole chapter is one question asked twice. Does this step need something from the step before it? If yes, pin it. If no, stop making it queue.

中文字幕：修法不是改文案，**是改形状：把十二个调用放进同一个回复里**。发出去一轮，十二件活同时在跑，**等一次，而不是等十二次**。所以整章就是同一个问题问两遍：**这一步需要上一步的东西吗？需要，就钉住它。不需要，就别让它排队**。

**对照卡**

- ❌ **一轮一个调用，顺序靠 prompt 央求** — **没有依赖的活跑了十二次往返**，而那个顺序**一直成立，直到某天不成立**。
- ✅ **钉住第一轮，其余独立的全部并行** — **唯一真实的依赖由 API 强制执行**；其余的一起发出去。

#### `c3-outro`  ·  1:58 → 2:03  (4.6s)

> Order where it is real, parallel everywhere else. Two missions below.

中文字幕：**该有顺序的地方讲顺序，其余全部并行**。下面两个任务。

---

## 第 4 章 · 交接
### Handing Over

**一句话**：subagent 什么都不会继承。它的 prompt 就是它能看到的全部世界。

`6` beats · `~2:15` · 屏幕上的标识符：`citation_id`

#### `c4-scene`  ·  0:00 → 0:25  (24.6s)
*任务：`intel-handoff`*

> Agent one spends twenty minutes finding out that the supplier changed in March. Leo starts agent two and writes: continue from where the last one left off. Agent two has never heard of a supplier. It has never heard of March. It has never heard of agent one. It is not being difficult — it genuinely was not there.

中文字幕：一号 agent 花了二十分钟，查出供应商是三月份换的。Leo 启动二号 agent，写道：「**接着上一个的进度继续**」。二号 agent 从没听说过什么供应商。没听说过三月。**也没听说过一号 agent**。它不是在为难你 —— **它是真的不在场**。

#### `c4-mechanism`  ·  0:25 → 0:54  (29.2s)
*任务：`intel-handoff`*

> This is a shift handover, and there is no shared notebook behind the counter. Whatever is not written into the new agent's prompt does not exist for it. So do not write "continue" — write the finding. Not a paragraph of prose either: the claim, what backs it, where it came from, and when. Four fields. The next agent can act on four fields. It cannot act on a vibe.

中文字幕：这是一次**交接班，而柜台后面没有那本共用的记事本**。**任何没有写进新 agent prompt 里的东西，对它来说就不存在**。所以别写「继续」—— 把结论写下来。也别写成一段散文：**结论是什么、什么支撑它、从哪来的、什么时候的**。四个字段。下一个 agent 能拿四个字段做事，**拿一段感觉做不了事**。

#### `c4-conflict`  ·  0:54 → 1:22  (27.9s)
*任务：`conflicting-intel`*

> Then two agents come back with different numbers for the same thing. The tempting move is to average them, or to take the more recent one, and send one clean number onward. Two witnesses describe the same person — one says tall, one says short — and you forward "medium height". That describes nobody. The disagreement was the finding. Pass both, with a flag saying they disagree.

中文字幕：然后两个 agent 对同一件事报回了不同的数字。**最诱人的做法是取平均，或者取更新的那个**，然后把一个干净的数字发出去。两个目击者描述同一个人 —— 一个说很高，一个说很矮 —— 你转述出去的是「**中等身高**」。**那描述的是谁都不是**。**分歧本身就是发现**。两个都传下去，附一个标记说明它们不一致。

#### `c4-term`  ·  1:22 → 1:53  (30.8s)
*任务：`chain-of-custody`*

> And by the time three agents have summarised each other, Leo has a confident paragraph and no idea which sentence came from where. So tag it at the source. The moment a fact enters the pipeline it gets an id, and it carries that id through every hand it passes. Later, when one line turns out to be wrong, he can walk it back to the document it came from instead of re-running everything.

中文字幕：等三个 agent 互相摘要过一轮之后，Leo 手上是**一段很自信的话，却不知道哪句从哪来**。所以**在源头就贴标签**。一条事实进入流水线的那一刻就拿到一个 id，**这个 id 跟着它经过每一双手**。以后某一句被发现是错的，他可以**顺着它走回原始文档**，而不是把整条链重跑一遍。

**术语卡 · `citation_id`**

| | |
|---|---|
| 问题 | 摘要传了三轮之后，**没有一句话追得回源头**。错一句，整条链重跑。<br/><sub>After three rounds of summarising, no sentence can be traced to a source. One wrong line means re-running everything.</sub> |
| 解法 | **事实第一次进来时就分配 id**，并要求这个标签**活过每一次摘要**。<br/><sub>Assign an id when the fact first enters. Require the tag to survive every summary.</sub> |
| 本质 | **它就是一条证据链**。标签是在现场贴的，不是最后补的。<br/><sub>It is a chain of custody. The tag goes on at the scene, not at the end.</sub> |

#### `c4-trap`  ·  1:53 → 2:09  (16.7s)
*任务：`intel-handoff`、`chain-of-custody`*

> So the handover rule fits on one line: assume the next agent knows nothing, because it knows nothing. Everything it needs goes in its prompt, in fields it can read, with the tags still attached and the disagreements still visible.

中文字幕：交接的规矩一行就写完：**假设下一个 agent 什么都不知道 —— 因为它确实什么都不知道**。它需要的一切都写进它的 prompt，**用它读得懂的字段，标签还在，分歧还看得见**。

**对照卡**

- ❌ **摊平的散文、合并后的一个数字、没有 id** — 读起来很顺，**查不了**，而且**悄悄藏起了两个来源不一致这件事**。
- ✅ **结构化字段、两个值都留、标签完整** — **结论 / 证据 / 来源 / 日期**，一个不一致标记，**以及一个跨越每一跳都还在的 id**。

#### `c4-outro`  ·  2:09 → 2:15  (5.8s)

> Nothing is inherited. Everything is handed over, on purpose, in writing. Three missions below.

中文字幕：**没有东西是继承来的。一切都是刻意地、白纸黑字地交过去的**。下面三个任务。

---

## 第 5 章 · 坏掉之后
### When It Breaks

**一句话**：恢复不是「继续」，是先决定之前那些东西有哪些还成立。

`6` beats · `~2:04` · 屏幕上的标识符：`checkpoint`

#### `c5-scene`  ·  0:00 → 0:21  (20.8s)
*任务：`scene-changed`*

> Leo fixes one function, then resumes yesterday's session to check it. The agent re-reads all forty files, re-derives everything it already knew, and arrives back at the same place twenty minutes later. It came back from holiday to a door full of post and started opening it from the bottom.

中文字幕：Leo 改了一个函数，然后**恢复昨天的会话**去验证。这个 agent 把四十个文件全部重读一遍，把它本来就知道的东西全部重新推导一遍，**二十分钟后回到了同一个位置**。它像是休假回来，门口堆满了信，**然后从最底下那封开始拆**。

#### `c5-delta`  ·  0:21 → 0:42  (20.8s)
*任务：`scene-changed`*

> The session did not need re-reading. It needed telling. One sentence: this function changed, here is the new version, everything else is as you left it. Now it re-checks what actually moved. Resuming without saying what changed is asking someone to spot the difference without telling them there is one.

中文字幕：这个会话**不需要重读，它需要被告知**。一句话就够：**这个函数变了，这是新版本，其余的和你走时一样**。它现在只去复查真正动过的东西。**恢复而不说什么变了，等于让人来找不同，却不告诉他有不同**。

#### `c5-crash`  ·  0:42 → 1:03  (21.3s)
*任务：`pipeline-down`*

> Then a run dies halfway. Leo does the obvious thing and resumes it. But the session it resumes into is the one that crashed — carrying whatever half-written tool results and dead-end reasoning were in flight when it fell over. He has not recovered the work. He has restored the accident.

中文字幕：然后一次运行跑到一半死了。Leo 做了最自然的事：**恢复它**。但他恢复进去的，**正是那个崩掉的会话** —— 里面还带着崩溃当下悬在半空的、写了一半的工具结果和走不通的推理。**他恢复的不是成果，是那场事故**。

#### `c5-term`  ·  1:03 → 1:27  (23.8s)
*任务：`pipeline-down`*

> So take the work out, not the session. Pull the finished results into a file — just the conclusions, nothing half-done — start a clean session, and hand it that file. Same work, none of the wreckage. Plant the flag, file a copy in the drawer, and if the ground gives way you start from the flag.

中文字幕：所以**把成果取出来，而不是把会话接上**。把已经完成的结果**抽进一个文件** —— 只要结论，不要任何做了一半的东西 —— **开一个干净的会话**，把这个文件交给它。**同样的成果，没有残骸**。插上旗，抽屉里存一份，地塌了就从那面旗开始。

**术语卡 · `checkpoint`**

| | |
|---|---|
| 问题 | 恢复一个崩掉的会话，**会把写了一半的工具结果和走不通的推理一起恢复回来**。<br/><sub>Resuming a crashed session restores its half-written tool results and dead-end reasoning along with the work.</sub> |
| 解法 | **把完成的结果抽成文件**，**开新会话**，**显式注入这个文件**。<br/><sub>Extract finished results to a file, start a fresh session, inject the file explicitly.</sub> |
| 本质 | **你存的是结论，不是会话**。会话正是坏掉的那个东西。<br/><sub>You are saving the conclusions, not the session. The session is the thing that broke.</sub> |

#### `c5-batch`  ·  1:27 → 1:53  (26.7s)
*任务：`pipeline-down`*

> Same idea at scale. Ten thousand documents go through a batch, three hundred come back failed. Re-running all ten thousand costs the entire saving the batch existed to produce. Three burnt dishes do not mean you cook the whole dinner again. Every item went in with an id — pull out the three hundred by id, fix what broke them, send back only those.

中文字幕：同一个想法，放大到批量。一万份文档跑一个批处理，**三百份失败了**。把一万份全部重跑，**会把这个批处理本来要省下的钱全部烧掉**。**三个菜烧糊了，不等于整桌重做**。每一条进去的时候都带着 id —— **按 id 把那三百条挑出来**，修掉让它们失败的原因，**只把这三百条送回去**。

**对照卡**

- ❌ **盲目恢复 · 一万条全部重跑** — **把崩溃状态一起恢复回来**，并且**把批处理省下的钱全部蒸发掉**。
- ✅ **检查点 → 新会话 · 按 id 只重跑 300 条** — **结论带走，残骸留下**，**只有真正失败的那些回到队列里**。

#### `c5-outro`  ·  1:53 → 2:04  (10.8s)

> Recovery is a decision about what is still true, and then a clean start with only that. Two missions below — and that is Domain 1.

中文字幕：**恢复是一个判断：之前那些东西，还有哪些成立** —— 然后带着这些，干干净净地重来。下面两个任务 —— **Domain 1 就到这里**。
