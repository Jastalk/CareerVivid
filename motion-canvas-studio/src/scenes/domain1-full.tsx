/**
 * Domain 1 — The One-Person Agency
 * Motion Canvas scene: Stick figure backplates + animated knowledge overlay cards
 *
 * Architecture:
 *   - Stick figure PNG = full-bleed background (vivid, funny, human)
 *   - Animated cards + flow arrows = educational overlay on top
 *   - Journey-F WAV audio = synced narration per beat
 *
 * WAV durations (pre-measured):
 *   roadmap: 11.8s | stop-reason: 13.6s | three-coats: 11.5s
 *   dont-delegate: 13.6s | three-passes: 14.5s | brief-with-goals: 13.7s
 *   forced-first: 13.8s | twelve-at-once: 14.0s | no-inheritance: 12.6s
 *   two-numbers: 13.0s | citation-id: 14.9s | tell-it-what-changed: 12.6s
 *   checkpoint: 14.2s | three-hundred: 18.7s | go-find-out: 14.0s
 */

import {makeScene2D, Img, Rect, Txt, Line, Node, Circle} from '@motion-canvas/2d';
import {createRef, all, waitFor, sequence, chain} from '@motion-canvas/core';

// ── Reusable helpers ────────────────────────────────────────────────────────

const BACKPLATE = (id: string) => `/assets/ccaf-backplates/domain-1-overview--${id}.png`;

// Dark glassmorphism card overlay
function KnowledgeCard(props: {
  ref_?: any; x?: number; y?: number; width?: number; height?: number;
  title: string; titleColor: string; body: string[]; accent: string;
}) {
  return (
    <Rect
      ref={props.ref_}
      x={props.x ?? 0}
      y={props.y ?? 200}
      width={props.width ?? 880}
      height={props.height ?? 220}
      radius={20}
      fill="#0d1117ee"
      stroke={props.accent}
      lineWidth={3}
      opacity={0}
    >
      <Txt text={props.title} fontSize={30} fontWeight={800} fill={props.titleColor} y={-60} />
      {props.body.map((line, i) => (
        <Txt text={line} fontSize={22} fill="#e2e8f0" y={-10 + i * 36} />
      ))}
    </Rect>
  );
}

export default makeScene2D(function* (view) {
  view.fill('#0b0f19');

  // ── Chapter header badge (persistent) ──────────────────────────────────────
  const headerBadge = createRef<Rect>();
  const chapterTxt = createRef<Txt>();

  view.add(
    <Rect
      ref={headerBadge}
      y={-460}
      height={52}
      padding={[0, 28]}
      radius={26}
      fill="#0d1117cc"
      stroke="#4f8ef7"
      lineWidth={2}
    >
      <Txt
        ref={chapterTxt}
        text="Domain 1 · The One-Person Agency"
        fontSize={22}
        fontWeight={700}
        fill="#4f8ef7"
      />
    </Rect>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: open-buried  (cold open — stick figure buried in paper, 7s)
  // ═══════════════════════════════════════════════════════════════════════════
  const bgOpenBuried = createRef<Img>();
  const titleCard = createRef<Rect>();

  view.add(
    <Img ref={bgOpenBuried} src={BACKPLATE('open-buried')}
      width={1920} height={1080} opacity={0} />
  );
  view.add(
    <Rect ref={titleCard} y={0} width={900} height={300} radius={24}
      fill="#0d1117dd" stroke="#4f8ef7" lineWidth={3} opacity={0}>
      <Txt text="The One-Person Agency" fontSize={52} fontWeight={800} fill="white" y={-60} />
      <Txt text="Domain 1 · Agentic Architecture" fontSize={26} fill="#94a3b8" y={20} />
      <Txt text="13 missions. 5 chapters. Real patterns." fontSize={20} fill="#4f8ef7" y={70} />
    </Rect>
  );

  yield* all(bgOpenBuried().opacity(1, 0.8), titleCard().opacity(1, 0.6));
  yield* waitFor(5.0);
  yield* all(bgOpenBuried().opacity(0, 0.5), titleCard().opacity(0, 0.4));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: roadmap  (diagram — 11.8s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  yield* chapterTxt().text("Chapter 1 · One Agent, One Loop", 0.4);

  const roadmapBg = createRef<Rect>();
  const rmTitle = createRef<Txt>();
  const ch1node = createRef<Rect>();
  const ch2node = createRef<Rect>();
  const ch3node = createRef<Rect>();
  const ch4node = createRef<Rect>();
  const ch5node = createRef<Rect>();

  view.add(<Rect ref={roadmapBg} width={1920} height={1080} fill="#0b0f19" opacity={1} />);
  view.add(<Txt ref={rmTitle} text="Your 5-Chapter Journey" fontSize={48} fontWeight={800}
    fill="white" y={-350} opacity={0} />);

  const chapterNodes = [
    {ref: ch1node, text: "1 · One Loop", color: "#38bdf8", x: -620, active: true},
    {ref: ch2node, text: "2 · Split Work", color: "#10b981", x: -310, active: false},
    {ref: ch3node, text: "3 · Order & Speed", color: "#f59e0b", x: 0, active: false},
    {ref: ch4node, text: "4 · Cracks", color: "#ec4899", x: 310, active: false},
    {ref: ch5node, text: "5 · Recovery", color: "#a855f7", x: 620, active: false},
  ];

  for (const ch of chapterNodes) {
    view.add(
      <Rect ref={ch.ref} x={ch.x} y={-150} width={240} height={120} radius={16}
        fill={ch.active ? `${ch.color}22` : "#1e293b"}
        stroke={ch.color} lineWidth={ch.active ? 4 : 2} opacity={0}>
        <Txt text={ch.text} fontSize={22} fontWeight={700} fill={ch.color} />
      </Rect>
    );
  }

  // Connector lines between nodes
  const connectors: Array<{ref: ReturnType<typeof createRef<Line>>; x1: number; x2: number}> = [
    {ref: createRef<Line>(), x1: -500, x2: -430},
    {ref: createRef<Line>(), x1: -190, x2: -120},
    {ref: createRef<Line>(), x1: 120, x2: 190},
    {ref: createRef<Line>(), x1: 430, x2: 500},
  ];
  for (const c of connectors) {
    view.add(
      <Line ref={c.ref} points={[[c.x1, -150], [c.x2, -150]]}
        stroke="#334155" lineWidth={3} endArrow opacity={0} />
    );
  }

  // Roadmap main message card
  const roadmapCard = createRef<Rect>();
  view.add(
    <Rect ref={roadmapCard} y={120} width={900} height={240} radius={20}
      fill="#0d1117ee" stroke="#38bdf8" lineWidth={3} opacity={0}>
      <Txt text="🏢 You are going to build an agency." fontSize={28} fontWeight={700} fill="white" y={-60} />
      <Txt text="One agent is easy. Two agents? Everything breaks." fontSize={22} fill="#94a3b8" y={-5} />
      <Txt text="These 13 buildings show you exactly HOW." fontSize={22} fill="#4f8ef7" y={50} />
    </Rect>
  );

  yield* rmTitle().opacity(1, 0.4);
  yield* sequence(0.15,
    ...chapterNodes.map(ch => ch.ref().opacity(1, 0.3))
  );
  yield* sequence(0.1,
    ...connectors.map(c => c.ref().opacity(1, 0.3))
  );
  yield* roadmapCard().opacity(1, 0.5);
  yield* waitFor(9.0); // rest of 11.8s narration
  yield* all(rmTitle().opacity(0, 0.3), roadmapCard().opacity(0, 0.3),
    ...chapterNodes.map(ch => ch.ref().opacity(0, 0.3)),
    ...connectors.map(c => c.ref().opacity(0, 0.3)));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: no-brakes  (stick figure — hamster wheel, 2.8s visual)
  // ═══════════════════════════════════════════════════════════════════════════
  const bgNoBrakes = createRef<Img>();
  const noBrakesLabel = createRef<Rect>();

  view.add(<Img ref={bgNoBrakes} src={BACKPLATE('no-brakes')}
    width={1920} height={1080} opacity={0} />);
  view.add(
    <Rect ref={noBrakesLabel} y={320} width={700} height={90} radius={16}
      fill="#0d1117cc" stroke="#ef4444" lineWidth={2} opacity={0}>
      <Txt text="🐹 Running forever... with no brake!" fontSize={26} fontWeight={700} fill="#fca5a5" />
    </Rect>
  );

  yield* all(bgNoBrakes().opacity(1, 0.5), noBrakesLabel().opacity(1, 0.4));
  yield* waitFor(2.0);
  yield* all(bgNoBrakes().opacity(0, 0.4), noBrakesLabel().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: stop-reason  (diagram — 13.6s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const srTitle = createRef<Txt>();
  const trapCard = createRef<Rect>();
  const correctCard = createRef<Rect>();

  view.add(<Txt ref={srTitle} text="stop_reason is the BRAKE" fontSize={52} fontWeight={800}
    fill="white" y={-320} opacity={0} />);
  view.add(
    <Rect ref={trapCard} x={-370} y={-80} width={600} height={320} radius={20}
      fill="#450a0a" stroke="#ef4444" lineWidth={3} opacity={0}>
      <Txt text="❌ Common Trap" fontSize={28} fontWeight={800} fill="#fca5a5" y={-100} />
      <Txt text="Stop loop after N rounds" fontSize={22} fill="#fef2f2" y={-40} />
      <Txt text="→ Miss end_turn signal" fontSize={20} fill="#fca5a5" y={10} />
      <Txt text="→ Orphaned tool calls" fontSize={20} fill="#fca5a5" y={50} />
      <Txt text="→ Infinite loops" fontSize={20} fill="#fca5a5" y={90} />
    </Rect>
  );
  view.add(
    <Rect ref={correctCard} x={370} y={-80} width={600} height={320} radius={20}
      fill="#064e3b" stroke="#10b981" lineWidth={3} opacity={0}>
      <Txt text="✅ Correct Pattern" fontSize={28} fontWeight={800} fill="#6ee7b7" y={-100} />
      <Txt text="Only stop on end_turn" fontSize={22} fill="#ecfdf5" y={-40} />
      <Txt text="→ Clean handoff" fontSize={20} fill="#6ee7b7" y={10} />
      <Txt text="→ Predictable termination" fontSize={20} fill="#6ee7b7" y={50} />
      <Txt text="→ Zero dangling tasks" fontSize={20} fill="#6ee7b7" y={90} />
    </Rect>
  );

  const srArrow = createRef<Line>();
  view.add(<Line ref={srArrow} points={[[-60, -80], [60, -80]]}
    stroke="#94a3b8" lineWidth={4} endArrow opacity={0} />);

  yield* srTitle().opacity(1, 0.4);
  yield* all(trapCard().opacity(1, 0.5), srArrow().opacity(1, 0.4));
  yield* waitFor(1.0);
  yield* correctCard().opacity(1, 0.5);
  yield* waitFor(9.0);
  yield* all(srTitle().opacity(0, 0.3), trapCard().opacity(0, 0.3),
    correctCard().opacity(0, 0.3), srArrow().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: three-coats  (diagram — 11.5s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const tcTitle = createRef<Txt>();
  const tc1 = createRef<Rect>();
  const tc2 = createRef<Rect>();
  const tc3 = createRef<Rect>();

  view.add(<Txt ref={tcTitle} text="Three Illnesses, One Coat" fontSize={48} fontWeight={800}
    fill="white" y={-330} opacity={0} />);

  const threeCoats = [
    {ref: tc1, x: -440, icon: "⚠️", label: "MAX_TOKENS", sub: "Output cuts mid-sentence\nFix: raise token limit", color: "#8b5cf6"},
    {ref: tc2, x: 0, icon: "⚡", label: "tool_use pending", sub: "Result never returned\nFix: feed result back", color: "#f59e0b"},
    {ref: tc3, x: 440, icon: "🛑", label: "stop_sequence hit", sub: "Token cuts conversation\nFix: remove stop tokens", color: "#ec4899"},
  ];

  for (const card of threeCoats) {
    view.add(
      <Rect ref={card.ref} x={card.x} y={0} width={340} height={300} radius={18}
        fill="#1e293b" stroke={card.color} lineWidth={3} opacity={0}>
        <Txt text={card.icon} fontSize={48} y={-100} />
        <Txt text={card.label} fontSize={24} fontWeight={700} fill={card.color} y={-30} />
        <Txt text={card.sub} fontSize={18} fill="#94a3b8" y={60} />
      </Rect>
    );
  }

  yield* tcTitle().opacity(1, 0.4);
  yield* sequence(0.2,
    tc1().opacity(1, 0.4),
    tc2().opacity(1, 0.4),
    tc3().opacity(1, 0.4),
  );
  yield* waitFor(7.5);
  yield* all(tcTitle().opacity(0, 0.3), tc1().opacity(0, 0.3),
    tc2().opacity(0, 0.3), tc3().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // CH2 TRANSITION
  // ═══════════════════════════════════════════════════════════════════════════
  yield* chapterTxt().text("Chapter 2 · Splitting the Work", 0.4);

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: queue-of-helpers  (stick figure — 2.8s visual)
  // ═══════════════════════════════════════════════════════════════════════════
  const bgQueue = createRef<Img>();
  const queueLabel = createRef<Rect>();

  view.add(<Img ref={bgQueue} src={BACKPLATE('queue-of-helpers')}
    width={1920} height={1080} opacity={0} />);
  view.add(
    <Rect ref={queueLabel} y={320} width={720} height={90} radius={16}
      fill="#0d1117cc" stroke="#10b981" lineWidth={2} opacity={0}>
      <Txt text="🧑‍🤝‍🧑 So you hired a dozen agents... now what?" fontSize={24} fontWeight={700} fill="#6ee7b7" />
    </Rect>
  );

  yield* all(bgQueue().opacity(1, 0.5), queueLabel().opacity(1, 0.4));
  yield* waitFor(2.0);
  yield* all(bgQueue().opacity(0, 0.4), queueLabel().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: dont-delegate  (diagram — 13.6s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const ddTitle = createRef<Txt>();
  const singleCard = createRef<Rect>();
  const multiCard = createRef<Rect>();

  view.add(<Txt ref={ddTitle} text="Most of the Time: DON'T Delegate!" fontSize={46} fontWeight={800}
    fill="white" y={-330} opacity={0} />);
  view.add(
    <Rect ref={singleCard} x={-330} y={20} width={540} height={340} radius={20}
      fill="#064e3b" stroke="#10b981" lineWidth={3} opacity={0}>
      <Txt text="✅ Single Agent" fontSize={28} fontWeight={800} fill="#6ee7b7" y={-120} />
      <Txt text="Full context intact" fontSize={20} fill="#ecfdf5" y={-60} />
      <Txt text="Zero handoff overhead" fontSize={20} fill="#ecfdf5" y={-10} />
      <Txt text="Easy to debug" fontSize={20} fill="#ecfdf5" y={40} />
      <Txt text="Low cost" fontSize={20} fill="#6ee7b7" y={90} />
    </Rect>
  );
  view.add(
    <Rect ref={multiCard} x={330} y={20} width={540} height={340} radius={20}
      fill="#450a0a" stroke="#ef4444" lineWidth={3} opacity={0}>
      <Txt text="❌ Premature Multi-Agent" fontSize={26} fontWeight={800} fill="#fca5a5" y={-120} />
      <Txt text="Context lost at handoffs" fontSize={20} fill="#fef2f2" y={-60} />
      <Txt text="High latency + API costs" fontSize={20} fill="#fef2f2" y={-10} />
      <Txt text="Cascading error risk" fontSize={20} fill="#fef2f2" y={40} />
      <Txt text="Hard to trace" fontSize={20} fill="#fca5a5" y={90} />
    </Rect>
  );

  yield* ddTitle().opacity(1, 0.4);
  yield* all(singleCard().opacity(1, 0.5), multiCard().opacity(1, 0.5));
  yield* waitFor(9.5);
  yield* all(ddTitle().opacity(0, 0.3), singleCard().opacity(0, 0.3), multiCard().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: three-passes  (diagram — 14.5s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const tpTitle = createRef<Txt>();
  const tp1 = createRef<Rect>();
  const tp2 = createRef<Rect>();
  const tp3 = createRef<Rect>();

  view.add(<Txt ref={tpTitle} text="If You MUST Split — Split by Thinking Style"
    fontSize={42} fontWeight={800} fill="white" y={-330} opacity={0} />);

  const threePassCards = [
    {ref: tp1, x: -440, icon: "🔍", label: "Pass 1: Research", sub: "Gather facts & clues\nRead-only scope", color: "#6366f1"},
    {ref: tp2, x: 0, icon: "📐", label: "Pass 2: Architecture", sub: "Deconstruct contract\nPlan the design", color: "#8b5cf6"},
    {ref: tp3, x: 440, icon: "⚙️", label: "Pass 3: Execution", sub: "Recruit specific agents\nIsolated scope only", color: "#ec4899"},
  ];

  for (const card of threePassCards) {
    view.add(
      <Rect ref={card.ref} x={card.x} y={0} width={350} height={300} radius={18}
        fill="#1e293b" stroke={card.color} lineWidth={3} opacity={0}>
        <Txt text={card.icon} fontSize={48} y={-100} />
        <Txt text={card.label} fontSize={24} fontWeight={700} fill={card.color} y={-30} />
        <Txt text={card.sub} fontSize={18} fill="#94a3b8" y={60} />
      </Rect>
    );
  }

  const tpArr1 = createRef<Line>();
  const tpArr2 = createRef<Line>();
  view.add(<Line ref={tpArr1} points={[[-250, 0], [-195, 0]]} stroke="#334155" lineWidth={3} endArrow opacity={0} />);
  view.add(<Line ref={tpArr2} points={[[195, 0], [250, 0]]} stroke="#334155" lineWidth={3} endArrow opacity={0} />);

  yield* tpTitle().opacity(1, 0.4);
  yield* sequence(0.2, tp1().opacity(1, 0.4), tp2().opacity(1, 0.4), tp3().opacity(1, 0.4));
  yield* all(tpArr1().opacity(1, 0.3), tpArr2().opacity(1, 0.3));
  yield* waitFor(10.5);
  yield* all(tpTitle().opacity(0, 0.3), tp1().opacity(0, 0.3),
    tp2().opacity(0, 0.3), tp3().opacity(0, 0.3),
    tpArr1().opacity(0, 0.3), tpArr2().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: script-vs-goal  (stick figure — split scroll vs sticky note, 2.8s)
  // ═══════════════════════════════════════════════════════════════════════════
  const bgSvG = createRef<Img>();
  const svgLabel = createRef<Rect>();

  view.add(<Img ref={bgSvG} src={BACKPLATE('script-vs-goal')}
    width={1920} height={1080} opacity={0} />);
  view.add(
    <Rect ref={svgLabel} y={320} width={760} height={90} radius={16}
      fill="#0d1117cc" stroke="#f59e0b" lineWidth={2} opacity={0}>
      <Txt text="📜 Script vs 🎯 Goal — which do YOU hand your agent?" fontSize={24} fontWeight={700} fill="#fcd34d" />
    </Rect>
  );

  yield* all(bgSvG().opacity(1, 0.5), svgLabel().opacity(1, 0.4));
  yield* waitFor(2.0);
  yield* all(bgSvG().opacity(0, 0.4), svgLabel().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: brief-with-goals  (diagram — 13.7s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const bgTitle = createRef<Txt>();
  const badCard = createRef<Rect>();
  const goodCard = createRef<Rect>();

  view.add(<Txt ref={bgTitle} text="Brief with Goals — Not Micro-Scripts"
    fontSize={46} fontWeight={800} fill="white" y={-330} opacity={0} />);
  view.add(
    <Rect ref={badCard} y={-100} width={900} height={130} radius={16}
      fill="#450a0a" stroke="#ef4444" lineWidth={2} opacity={0}>
      <Txt text="❌ BAD: Step 1 do X. Step 2 do Y. Step 3 do Z." fontSize={24} fill="#fca5a5" />
    </Rect>
  );
  view.add(
    <Rect ref={goodCard} y={80} width={900} height={150} radius={16}
      fill="#064e3b" stroke="#10b981" lineWidth={2} opacity={0}>
      <Txt text="✅ GOOD: Achieve target state S." fontSize={24} fontWeight={700} fill="#6ee7b7" y={-25} />
      <Txt text="Verify with criteria V. Solve edge cases yourself." fontSize={20} fill="#ecfdf5" y={25} />
    </Rect>
  );

  yield* bgTitle().opacity(1, 0.4);
  yield* badCard().opacity(1, 0.5);
  yield* waitFor(1.0);
  yield* goodCard().opacity(1, 0.5);
  yield* waitFor(10.0);
  yield* all(bgTitle().opacity(0, 0.3), badCard().opacity(0, 0.3), goodCard().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // CH3 TRANSITION
  // ═══════════════════════════════════════════════════════════════════════════
  yield* chapterTxt().text("Chapter 3 · Order & Speed", 0.4);

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: dominoes  (stick figure — broken domino chain, 2.8s)
  // ═══════════════════════════════════════════════════════════════════════════
  const bgDominoes = createRef<Img>();
  const dominoesLabel = createRef<Rect>();

  view.add(<Img ref={bgDominoes} src={BACKPLATE('dominoes')}
    width={1920} height={1080} opacity={0} />);
  view.add(
    <Rect ref={dominoesLabel} y={320} width={720} height={90} radius={16}
      fill="#0d1117cc" stroke="#f59e0b" lineWidth={2} opacity={0}>
      <Txt text="🎯 One backwards block... kills the whole chain!" fontSize={24} fontWeight={700} fill="#fcd34d" />
    </Rect>
  );

  yield* all(bgDominoes().opacity(1, 0.5), dominoesLabel().opacity(1, 0.4));
  yield* waitFor(2.0);
  yield* all(bgDominoes().opacity(0, 0.4), dominoesLabel().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: forced-first  (diagram — 13.8s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const ffTitle = createRef<Txt>();
  const ffCard = createRef<Rect>();
  const ffStep2 = createRef<Rect>();

  view.add(<Txt ref={ffTitle} text="Has Dependencies? Force tool_choice First!"
    fontSize={44} fontWeight={800} fill="white" y={-330} opacity={0} />);
  view.add(
    <Rect ref={ffCard} y={-80} width={900} height={180} radius={18}
      fill="#291e05" stroke="#f59e0b" lineWidth={3} opacity={0}>
      <Txt text="Turn 1: tool_choice = {type:'tool', name:'read_file'}" fontSize={24} fontWeight={700}
        fill="#fcd34d" fontFamily="monospace" y={-35} />
      <Txt text="Force the prerequisite tool call — guarantee data is fetched BEFORE decisions"
        fontSize={20} fill="#fef3c7" y={30} />
    </Rect>
  );
  view.add(
    <Rect ref={ffStep2} y={150} width={900} height={100} radius={16}
      fill="#0c4a6e" stroke="#38bdf8" lineWidth={2} opacity={0}>
      <Txt text="Turn 2+: Release to tool_choice = 'auto' — agent decides freely from here"
        fontSize={20} fill="#e0f2fe" />
    </Rect>
  );

  yield* ffTitle().opacity(1, 0.4);
  yield* ffCard().opacity(1, 0.5);
  yield* waitFor(2.0);
  yield* ffStep2().opacity(1, 0.5);
  yield* waitFor(9.0);
  yield* all(ffTitle().opacity(0, 0.3), ffCard().opacity(0, 0.3), ffStep2().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: twelve-at-once  (diagram — 14.0s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const taTitle = createRef<Txt>();
  const taCard = createRef<Rect>();
  const taskNodes = createRef<Node>();

  view.add(<Txt ref={taTitle} text="No Dependencies? Fire 12 Tasks Concurrently!"
    fontSize={44} fontWeight={800} fill="white" y={-330} opacity={0} />);

  // Visual: 12 small task circles exploding outward from center
  view.add(<Node ref={taskNodes} y={-50} opacity={0}>
    {Array.from({length: 12}).map((_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const r = 280;
      return (
        <Circle
          x={Math.cos(angle) * r}
          y={Math.sin(angle) * r}
          size={80}
          fill="#1e293b"
          stroke="#38bdf8"
          lineWidth={2}
        >
          <Txt text={`T${i+1}`} fontSize={18} fontWeight={700} fill="#38bdf8" />
        </Circle>
      );
    })}
  </Node>);

  view.add(
    <Rect ref={taCard} y={250} width={800} height={90} radius={16}
      fill="#0c4a6e" stroke="#38bdf8" lineWidth={2} opacity={0}>
      <Txt text="⚡ 1 turn → 12 parallel tasks → up to 10× faster execution"
        fontSize={22} fontWeight={700} fill="#7dd3fc" />
    </Rect>
  );

  yield* taTitle().opacity(1, 0.4);
  yield* taskNodes().opacity(1, 0.5);
  yield* taCard().opacity(1, 0.4);
  yield* waitFor(10.5);
  yield* all(taTitle().opacity(0, 0.3), taskNodes().opacity(0, 0.3), taCard().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // CH4 TRANSITION
  // ═══════════════════════════════════════════════════════════════════════════
  yield* chapterTxt().text("Chapter 4 · What Falls Between Cracks", 0.4);

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: canyon-shout  (stick figure — paper plane into abyss, 2.8s)
  // ═══════════════════════════════════════════════════════════════════════════
  const bgCanyon = createRef<Img>();
  const canyonLabel = createRef<Rect>();

  view.add(<Img ref={bgCanyon} src={BACKPLATE('canyon-shout')}
    width={1920} height={1080} opacity={0} />);
  view.add(
    <Rect ref={canyonLabel} y={320} width={760} height={90} radius={16}
      fill="#0d1117cc" stroke="#ec4899" lineWidth={2} opacity={0}>
      <Txt text="📨 Context thrown across agents... falls into the abyss!" fontSize={24} fontWeight={700} fill="#f472b6" />
    </Rect>
  );

  yield* all(bgCanyon().opacity(1, 0.5), canyonLabel().opacity(1, 0.4));
  yield* waitFor(2.0);
  yield* all(bgCanyon().opacity(0, 0.4), canyonLabel().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: no-inheritance  (diagram — 12.6s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const niTitle = createRef<Txt>();
  const niCard = createRef<Rect>();
  const niRule = createRef<Rect>();

  view.add(<Txt ref={niTitle} text="Subagents Start with ZERO Context"
    fontSize={48} fontWeight={800} fill="white" y={-330} opacity={0} />);
  view.add(
    <Rect ref={niCard} y={-80} width={900} height={180} radius={18}
      fill="#1e1b4b" stroke="#818cf8" lineWidth={3} opacity={0}>
      <Txt text="🧠 Each subagent = fresh empty context window" fontSize={26} fontWeight={700}
        fill="#c7d2fe" y={-40} />
      <Txt text="Never assume it 'knows' what parent agents did"
        fontSize={20} fill="#e0e7ff" y={20} />
    </Rect>
  );
  view.add(
    <Rect ref={niRule} y={150} width={900} height={100} radius={16}
      fill="#064e3b" stroke="#10b981" lineWidth={2} opacity={0}>
      <Txt text="✅ YOU must pass: schemas, rules, key variables — explicitly every time"
        fontSize={20} fontWeight={700} fill="#6ee7b7" />
    </Rect>
  );

  yield* niTitle().opacity(1, 0.4);
  yield* niCard().opacity(1, 0.5);
  yield* waitFor(1.5);
  yield* niRule().opacity(1, 0.5);
  yield* waitFor(7.5);
  yield* all(niTitle().opacity(0, 0.3), niCard().opacity(0, 0.3), niRule().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: two-numbers  (diagram — 13.0s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const tnTitle = createRef<Txt>();
  const tnBad = createRef<Rect>();
  const tnGood = createRef<Rect>();

  view.add(<Txt ref={tnTitle} text="Never Average Conflicting Scores!"
    fontSize={48} fontWeight={800} fill="white" y={-330} opacity={0} />);
  view.add(
    <Rect ref={tnBad} y={-80} width={900} height={180} radius={18}
      fill="#450a0a" stroke="#ef4444" lineWidth={3} opacity={0}>
      <Txt text="Agent A: 0.9 confidence   +   Agent B: 0.1 confidence" fontSize={24} fill="#fef2f2" y={-35} />
      <Txt text="❌ Average = 0.5  →  MEANINGLESS NUMBER" fontSize={24} fontWeight={800} fill="#f43f5e" y={30} />
    </Rect>
  );
  view.add(
    <Rect ref={tnGood} y={150} width={900} height={100} radius={16}
      fill="#064e3b" stroke="#10b981" lineWidth={2} opacity={0}>
      <Txt text="✅ Investigate the ROOT CONFLICT — why do they disagree?"
        fontSize={22} fontWeight={700} fill="#6ee7b7" />
    </Rect>
  );

  yield* tnTitle().opacity(1, 0.4);
  yield* tnBad().opacity(1, 0.5);
  yield* waitFor(1.5);
  yield* tnGood().opacity(1, 0.5);
  yield* waitFor(8.0);
  yield* all(tnTitle().opacity(0, 0.3), tnBad().opacity(0, 0.3), tnGood().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: citation-id  (diagram — 14.9s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const ciTitle = createRef<Txt>();
  const ciCard = createRef<Rect>();
  const ciTimeline = createRef<Node>();

  view.add(<Txt ref={ciTitle} text="Tag citation_id From the FIRST Agent!"
    fontSize={46} fontWeight={800} fill="white" y={-330} opacity={0} />);

  view.add(<Node ref={ciTimeline} y={-50} opacity={0}>
    {[
      {x: -480, label: "Agent 1\nFetches source", color: "#38bdf8"},
      {x: -160, label: "Agent 2\nAnalyses", color: "#10b981"},
      {x: 160, label: "Agent 3\nSummarises", color: "#a855f7"},
      {x: 480, label: "Output\nWith audit trail", color: "#f59e0b"},
    ].map((n, i) => (
      <Node x={n.x}>
        <Circle size={90} fill="#1e293b" stroke={n.color} lineWidth={3} />
        <Txt text={`${i + 1}`} fontSize={30} fontWeight={800} fill={n.color} />
        <Txt text={n.label} fontSize={16} fill="#94a3b8" y={70} />
        {i < 3 && <Line points={[[45, 0], [115, 0]]} stroke="#334155" lineWidth={3} endArrow />}
      </Node>
    ))}
  </Node>);

  view.add(
    <Rect ref={ciCard} y={220} width={900} height={90} radius={16}
      fill="#1e293b" stroke="#f59e0b" lineWidth={2} opacity={0}>
      <Txt text="🔗 citation_id stamped at Agent 1 → survives every handoff unbroken"
        fontSize={22} fontWeight={700} fill="#fcd34d" />
    </Rect>
  );

  yield* ciTitle().opacity(1, 0.4);
  yield* ciTimeline().opacity(1, 0.5);
  yield* ciCard().opacity(1, 0.4);
  yield* waitFor(11.5);
  yield* all(ciTitle().opacity(0, 0.3), ciTimeline().opacity(0, 0.3), ciCard().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // CH5 TRANSITION
  // ═══════════════════════════════════════════════════════════════════════════
  yield* chapterTxt().text("Chapter 5 · When It Collapses", 0.4);

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: burst-pipes  (stick figure — wrench + spraying pipes, 2.8s)
  // ═══════════════════════════════════════════════════════════════════════════
  const bgBurst = createRef<Img>();
  const burstLabel = createRef<Rect>();

  view.add(<Img ref={bgBurst} src={BACKPLATE('burst-pipes')}
    width={1920} height={1080} opacity={0} />);
  view.add(
    <Rect ref={burstLabel} y={320} width={760} height={90} radius={16}
      fill="#0d1117cc" stroke="#a855f7" lineWidth={2} opacity={0}>
      <Txt text="💧 When the pipeline bursts... here's your repair kit!" fontSize={24} fontWeight={700} fill="#e9d5ff" />
    </Rect>
  );

  yield* all(bgBurst().opacity(1, 0.5), burstLabel().opacity(1, 0.4));
  yield* waitFor(2.0);
  yield* all(bgBurst().opacity(0, 0.4), burstLabel().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: tell-it-what-changed  (diagram — 12.6s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const tiwcTitle = createRef<Txt>();
  const deltaCard = createRef<Rect>();

  view.add(<Txt ref={tiwcTitle} text="Tell It EXACTLY What Changed"
    fontSize={48} fontWeight={800} fill="white" y={-330} opacity={0} />);
  view.add(
    <Rect ref={deltaCard} y={0} width={900} height={300} radius={20}
      fill="#3b0764" stroke="#c084fc" lineWidth={3} opacity={0}>
      <Txt text="📝 Explicit Delta Protocol" fontSize={32} fontWeight={800} fill="#e9d5ff" y={-100} />
      <Txt text="Don't re-upload the whole codebase on error" fontSize={22} fill="#f3e8ff" y={-35} />
      <Txt text={`✅ Say: "I changed file_a.ts, file_b.ts, and file_c.ts"`}
        fontSize={22} fontWeight={700} fill="#86efac" y={20} />
      <Txt text="Focuses agent on the diff — not the entire repo"
        fontSize={20} fill="#d8b4fe" y={70} />
    </Rect>
  );

  yield* tiwcTitle().opacity(1, 0.4);
  yield* deltaCard().opacity(1, 0.5);
  yield* waitFor(9.5);
  yield* all(tiwcTitle().opacity(0, 0.3), deltaCard().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: checkpoint  (diagram — 14.2s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  const cpTitle = createRef<Txt>();
  const cpSteps = createRef<Rect>();

  view.add(<Txt ref={cpTitle} text="Checkpoint → Kill → Fresh Start"
    fontSize={48} fontWeight={800} fill="white" y={-330} opacity={0} />);
  view.add(
    <Rect ref={cpSteps} y={0} width={900} height={300} radius={20}
      fill="#064e3b" stroke="#10b981" lineWidth={3} opacity={0}>
      <Txt text="🏁 3-Step Recovery Protocol" fontSize={30} fontWeight={800} fill="#6ee7b7" y={-100} />
      <Txt text="1️⃣  git checkpoint — save clean state" fontSize={22} fill="#ecfdf5" y={-40} />
      <Txt text="2️⃣  Kill the stuck / hallucinating session" fontSize={22} fill="#ecfdf5" y={10} />
      <Txt text="3️⃣  New conversation + fresh context summary" fontSize={22} fill="#6ee7b7" y={60} />
    </Rect>
  );

  yield* cpTitle().opacity(1, 0.4);
  yield* cpSteps().opacity(1, 0.5);
  yield* waitFor(11.0);
  yield* all(cpTitle().opacity(0, 0.3), cpSteps().opacity(0, 0.3));

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: thirteen-doors  (stick figure — outro, 2.8s)
  // ═══════════════════════════════════════════════════════════════════════════
  yield* chapterTxt().text("Domain 1 · Outro", 0.4);

  const bgThirteen = createRef<Img>();
  const thirteenLabel = createRef<Rect>();

  view.add(<Img ref={bgThirteen} src={BACKPLATE('thirteen-doors')}
    width={1920} height={1080} opacity={0} />);
  view.add(
    <Rect ref={thirteenLabel} y={320} width={820} height={90} radius={16}
      fill="#0d1117cc" stroke="#4f8ef7" lineWidth={2} opacity={0}>
      <Txt text="🚪 13 buildings. 13 breakages. Now you know them all." fontSize={24} fontWeight={700} fill="#93c5fd" />
    </Rect>
  );

  yield* all(bgThirteen().opacity(1, 0.5), thirteenLabel().opacity(1, 0.4));
  yield* waitFor(2.5);

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAT: go-find-out  (final call to action — 14.0s narration)
  // ═══════════════════════════════════════════════════════════════════════════
  yield* all(bgThirteen().opacity(0, 0.5), thirteenLabel().opacity(0, 0.3));

  const gfoTitle = createRef<Txt>();
  const gfoCard = createRef<Rect>();

  view.add(<Txt ref={gfoTitle} text="Now Go Build Something Real"
    fontSize={52} fontWeight={800} fill="white" y={-280} opacity={0} />);
  view.add(
    <Rect ref={gfoCard} y={50} width={900} height={360} radius={24}
      fill="#0d1117ee" stroke="#4f8ef7" lineWidth={4} opacity={0}>
      <Txt text="You now know:" fontSize={26} fontWeight={700} fill="#94a3b8" y={-140} />
      <Txt text="✅ stop_reason is your brake" fontSize={24} fill="#6ee7b7" y={-85} />
      <Txt text="✅ Don't delegate until you must" fontSize={24} fill="#6ee7b7" y={-40} />
      <Txt text="✅ Force tool_choice for dependencies" fontSize={24} fill="#6ee7b7" y={10} />
      <Txt text="✅ Subagents inherit nothing — pass everything" fontSize={24} fill="#6ee7b7" y={60} />
      <Txt text="✅ Checkpoint early, restart clean" fontSize={24} fill="#6ee7b7" y={110} />
    </Rect>
  );

  yield* all(gfoTitle().opacity(1, 0.5), gfoCard().opacity(1, 0.6));
  yield* waitFor(12.0);
});
