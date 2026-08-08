import {makeScene2D, Circle, Rect, Txt, Line, Node} from '@motion-canvas/2d';
import {createRef, all, waitFor, sequence} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  view.fill('#0b0f19');

  // Chapter 2 Header Badge
  const headerBadge = createRef<Rect>();
  view.add(
    <Rect
      ref={headerBadge}
      y={-480}
      height={56}
      padding={[0, 32]}
      radius={28}
      fill="#1a233a"
      stroke="#10b981"
      lineWidth={2}
    >
      <Txt
        text="Chapter 2 · Splitting Work & Agent Hiring"
        fontSize={24}
        fontWeight={700}
        fill="#10b981"
      />
    </Rect>
  );

  // -------------------------------------------------------------
  // Beat 4: Don't delegate ("Most of the time, don't hire extra agents")
  // -------------------------------------------------------------
  const titleBeat4 = createRef<Txt>();
  const cardSingle = createRef<Rect>();
  const cardMulti = createRef<Rect>();

  view.add(
    <Txt
      ref={titleBeat4}
      text="Rule #1: Most of the time, DON'T hire extra agents!"
      fontSize={40}
      fontWeight={800}
      fill="white"
      y={-280}
      opacity={0}
    />
  );
  yield* titleBeat4().opacity(1, 0.4);

  view.add(
    <Node y={50}>
      {/* Recommended: Single Agent */}
      <Rect
        ref={cardSingle}
        x={-320}
        width={480}
        height={320}
        radius={16}
        fill="#064e3b"
        stroke="#10b981"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="✅ Single Agent (Recommended)" fontSize={26} fontWeight={700} fill="#6ee7b7" y={-110} />
        <Txt text="• Context is completely intact" fontSize={20} fill="#ecfdf5" y={-40} x={-100} />
        <Txt text="• Zero communication overhead" fontSize={20} fill="#ecfdf5" y={10} x={-100} />
        <Txt text="• Simple & predictable debugging" fontSize={20} fill="#ecfdf5" y={60} x={-100} />
      </Rect>

      {/* Avoid: Over-hiring */}
      <Rect
        ref={cardMulti}
        x={320}
        width={480}
        height={320}
        radius={16}
        fill="#450a0a"
        stroke="#ef4444"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="❌ Over-Hiring Multi-Agents" fontSize={26} fontWeight={700} fill="#fca5a5" y={-110} />
        <Txt text="• Context gets lost in handoffs" fontSize={20} fill="#fef2f2" y={-40} x={-100} />
        <Txt text="• High latency & API cost spike" fontSize={20} fill="#fef2f2" y={10} x={-100} />
        <Txt text="• Hard to trace compounding errors" fontSize={20} fill="#fef2f2" y={60} x={-100} />
      </Rect>
    </Node>
  );

  yield* all(
    cardSingle().opacity(1, 0.5),
    cardMulti().opacity(1, 0.5),
  );
  yield* waitFor(2.5);

  // Cleanup Beat 4
  yield* all(
    titleBeat4().opacity(0, 0.3),
    cardSingle().opacity(0, 0.3),
    cardMulti().opacity(0, 0.3),
  );

  // -------------------------------------------------------------
  // Beat 5: Split by Thinking Style (Three Passes)
  // -------------------------------------------------------------
  const titleBeat5 = createRef<Txt>();
  view.add(
    <Txt
      ref={titleBeat5}
      text="If You MUST Split, Split by Thinking Style!"
      fontSize={40}
      fontWeight={800}
      fill="white"
      y={-280}
      opacity={0}
    />
  );
  yield* titleBeat5().opacity(1, 0.4);

  const pass1 = createRef<Rect>();
  const pass2 = createRef<Rect>();
  const pass3 = createRef<Rect>();

  view.add(
    <Node y={50}>
      <Rect
        ref={pass1}
        x={-420}
        width={340}
        height={300}
        radius={16}
        fill="#1e293b"
        stroke="#6366f1"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="🔍 Pass 1: Research" fontSize={24} fontWeight={700} fill="#a5b4fc" y={-100} />
        <Txt text="Deep exploration" fontSize={18} fill="#cbd5e1" y={-40} />
        <Txt text="Gather raw facts & clues" fontSize={16} fill="#94a3b8" y={0} />
        <Txt text="Read-only scope" fontSize={16} fill="#818cf8" y={60} />
      </Rect>

      <Rect
        ref={pass2}
        x={0}
        width={340}
        height={300}
        radius={16}
        fill="#1e293b"
        stroke="#8b5cf6"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="📐 Pass 2: Architecture" fontSize={24} fontWeight={700} fill="#c4b5fd" y={-100} />
        <Txt text="Deconstruct contract" fontSize={18} fill="#cbd5e1" y={-40} />
        <Txt text="Plan step-by-step design" fontSize={16} fill="#94a3b8" y={0} />
        <Txt text="Clear boundaries" fontSize={16} fill="#a78bfa" y={60} />
      </Rect>

      <Rect
        ref={pass3}
        x={420}
        width={340}
        height={300}
        radius={16}
        fill="#1e293b"
        stroke="#ec4899"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="⚙️ Pass 3: Execution" fontSize={24} fontWeight={700} fill="#f472b6" y={-100} />
        <Txt text="Recruit targeted agents" fontSize={18} fill="#cbd5e1" y={-40} />
        <Txt text="Isolated implementation" fontSize={16} fill="#94a3b8" y={0} />
        <Txt text="Strict scope control" fontSize={16} fill="#f472b6" y={60} />
      </Rect>
    </Node>
  );

  yield* sequence(
    0.2,
    pass1().opacity(1, 0.4),
    pass2().opacity(1, 0.4),
    pass3().opacity(1, 0.4),
  );
  yield* waitFor(2.5);

  // Cleanup Beat 5
  yield* all(
    titleBeat5().opacity(0, 0.3),
    pass1().opacity(0, 0.3),
    pass2().opacity(0, 0.3),
    pass3().opacity(0, 0.3),
  );

  // -------------------------------------------------------------
  // Beat 6: Brief with Goals (Not Scripts)
  // -------------------------------------------------------------
  const titleBeat6 = createRef<Txt>();
  const goalCard = createRef<Rect>();

  view.add(
    <Txt
      ref={titleBeat6}
      text="Brief with GOALS — Not Micro-Managed Scripts"
      fontSize={40}
      fontWeight={800}
      fill="white"
      y={-240}
      opacity={0}
    />
  );
  yield* titleBeat6().opacity(1, 0.4);

  view.add(
    <Rect
      ref={goalCard}
      y={60}
      width={800}
      height={320}
      radius={20}
      fill="#1e1b4b"
      stroke="#6366f1"
      lineWidth={3}
      opacity={0}
    >
      <Txt text="🎯 Give Subagents Objective Goals" fontSize={28} fontWeight={700} fill="#a5b4fc" y={-110} />
      <Txt text="• BAD: Step 1 do X, Step 2 do Y, Step 3 do Z (Rigid Script)" fontSize={20} fill="#fca5a5" y={-30} x={-60} />
      <Txt text="• GOOD: Achieve Target State S with Verification Criteria V (Goal)" fontSize={20} fill="#86efac" y={30} x={-60} />
      <Txt text="Subagents solve edge cases autonomously when handed clear goals!" fontSize={18} fill="#cbd5e1" y={90} />
    </Rect>
  );

  yield* goalCard().opacity(1, 0.5);
  yield* waitFor(3.0);
});
