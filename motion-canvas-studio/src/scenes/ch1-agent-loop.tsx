import {makeScene2D, Circle, Rect, Txt, Line, Node} from '@motion-canvas/2d';
import {createRef, all, waitFor, sequence} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  view.fill('#0b0f19');

  // Chapter 1 Header Badge
  const headerBadge = createRef<Rect>();
  const headerText = createRef<Txt>();

  view.add(
    <Rect
      ref={headerBadge}
      y={-440}
      height={56}
      padding={[0, 32]}
      radius={28}
      fill="#1a233a"
      stroke="#4f8ef7"
      lineWidth={2}
    >
      <Txt
        ref={headerText}
        text="Chapter 1 · One Agent, One Loop"
        fontSize={24}
        fontWeight={700}
        fill="#4f8ef7"
      />
    </Rect>
  );

  // -------------------------------------------------------------
  // Beat 1: Intro / Title
  // -------------------------------------------------------------
  const title = createRef<Txt>();
  const subtitle = createRef<Txt>();

  view.add(
    <Txt
      ref={title}
      text="The One-Person Agency"
      fontSize={64}
      fontWeight={800}
      fill="white"
      y={-220}
      opacity={0}
    />
  );
  view.add(
    <Txt
      ref={subtitle}
      text="When a single agent runs smoothly vs. when everything breaks"
      fontSize={28}
      fill="#94a3b8"
      y={-140}
      opacity={0}
    />
  );

  yield* all(
    title().opacity(1, 0.6),
    subtitle().opacity(1, 0.6),
  );
  yield* waitFor(1.5);

  // Fade out intro titles
  yield* all(
    title().opacity(0, 0.4),
    subtitle().opacity(0, 0.4),
  );

  // -------------------------------------------------------------
  // Beat 2: stop_reason is the brake (NOT a round counter)
  // -------------------------------------------------------------
  const agentCard = createRef<Rect>();
  const toolCard = createRef<Rect>();
  const stopCard = createRef<Rect>();

  view.add(
    <Node y={-50}>
      {/* Agent Box */}
      <Rect
        ref={agentCard}
        x={-420}
        width={240}
        height={130}
        radius={16}
        fill="#1e293b"
        stroke="#38bdf8"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="🤖 Agent" fontSize={28} fontWeight={700} fill="#38bdf8" y={-20} />
        <Txt text="Re-evaluates state" fontSize={18} fill="#94a3b8" y={22} />
      </Rect>

      {/* Tool Call Box */}
      <Rect
        ref={toolCard}
        x={0}
        width={240}
        height={130}
        radius={16}
        fill="#1e293b"
        stroke="#f59e0b"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="⚡ Tool Call" fontSize={28} fontWeight={700} fill="#f59e0b" y={-20} />
        <Txt text="Executes action" fontSize={18} fill="#94a3b8" y={22} />
      </Rect>

      {/* Stop Reason Box */}
      <Rect
        ref={stopCard}
        x={420}
        width={240}
        height={130}
        radius={16}
        fill="#1e293b"
        stroke="#ef4444"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="🛑 stop_reason" fontSize={26} fontWeight={700} fill="#ef4444" y={-20} />
        <Txt text="end_turn brake" fontSize={18} fill="#94a3b8" y={22} />
      </Rect>
    </Node>
  );

  const arr1 = createRef<Line>();
  const arr2 = createRef<Line>();

  view.add(
    <Line
      ref={arr1}
      points={[[-300, -50], [-120, -50]]}
      stroke="#38bdf8"
      lineWidth={4}
      endArrow
      end={0}
    />
  );
  view.add(
    <Line
      ref={arr2}
      points={[[120, -50], [300, -50]]}
      stroke="#ef4444"
      lineWidth={4}
      endArrow
      end={0}
    />
  );

  yield* all(
    agentCard().opacity(1, 0.4),
    toolCard().opacity(1, 0.4),
    stopCard().opacity(1, 0.4),
  );
  yield* arr1().end(1, 0.4);
  yield* arr2().end(1, 0.4);
  yield* waitFor(0.5);

  // Comparison banners below
  const trapBanner = createRef<Rect>();
  const correctBanner = createRef<Rect>();

  view.add(
    <Rect
      ref={trapBanner}
      x={-280}
      y={180}
      width={480}
      height={80}
      radius={12}
      fill="#450a0a"
      stroke="#ef4444"
      lineWidth={2}
      opacity={0}
    >
      <Txt text="❌ Common Trap: Stop by loop counter (N rounds)" fontSize={20} fill="#fca5a5" />
    </Rect>
  );
  view.add(
    <Rect
      ref={correctBanner}
      x={280}
      y={180}
      width={480}
      height={80}
      radius={12}
      fill="#064e3b"
      stroke="#10b981"
      lineWidth={2}
      opacity={0}
    >
      <Txt text="✅ Correct: Stop strictly on end_turn signal" fontSize={20} fill="#6ee7b7" />
    </Rect>
  );

  yield* trapBanner().opacity(1, 0.4);
  yield* waitFor(0.3);
  yield* correctBanner().opacity(1, 0.4);
  yield* waitFor(2.5);

  // Cleanup Beat 2
  yield* all(
    agentCard().opacity(0, 0.3),
    toolCard().opacity(0, 0.3),
    stopCard().opacity(0, 0.3),
    arr1().opacity(0, 0.3),
    arr2().opacity(0, 0.3),
    trapBanner().opacity(0, 0.3),
    correctBanner().opacity(0, 0.3),
  );

  // -------------------------------------------------------------
  // Beat 3: Three coats for three illnesses (Output Anomalies)
  // -------------------------------------------------------------
  const titleBeat3 = createRef<Txt>();
  view.add(
    <Txt
      ref={titleBeat3}
      text="Three Illnesses Wearing the Same Coat"
      fontSize={42}
      fontWeight={700}
      fill="white"
      y={-300}
      opacity={0}
    />
  );
  yield* titleBeat3().opacity(1, 0.4);

  const card1 = createRef<Rect>();
  const card2 = createRef<Rect>();
  const card3 = createRef<Rect>();

  view.add(
    <Node y={0}>
      {/* Illness 1 */}
      <Rect
        ref={card1}
        x={-420}
        width={340}
        height={320}
        radius={16}
        fill="#1e293b"
        stroke="#8b5cf6"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="⚠️ MAX_TOKENS" fontSize={26} fontWeight={700} fill="#c4b5fd" y={-110} />
        <Txt text="Symptom: Truncated code" fontSize={18} fill="#94a3b8" y={-50} />
        <Rect width={280} height={2} fill="#334155" y={-10} />
        <Txt text="Fix: Increase max_tokens" fontSize={18} fontWeight={700} fill="#10b981" y={40} />
        <Txt text="or split output chunks" fontSize={16} fill="#94a3b8" y={75} />
      </Rect>

      {/* Illness 2 */}
      <Rect
        ref={card2}
        x={0}
        width={340}
        height={320}
        radius={16}
        fill="#1e293b"
        stroke="#f59e0b"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="⚡ tool_use Pending" fontSize={26} fontWeight={700} fill="#fcd34d" y={-110} />
        <Txt text="Symptom: Missing result" fontSize={18} fill="#94a3b8" y={-50} />
        <Rect width={280} height={2} fill="#334155" y={-10} />
        <Txt text="Fix: Pass tool output" fontSize={18} fontWeight={700} fill="#10b981" y={40} />
        <Txt text="back to the LLM loop" fontSize={16} fill="#94a3b8" y={75} />
      </Rect>

      {/* Illness 3 */}
      <Rect
        ref={card3}
        x={420}
        width={340}
        height={320}
        radius={16}
        fill="#1e293b"
        stroke="#ec4899"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="🛑 stop_sequence" fontSize={26} fontWeight={700} fill="#f472b6" y={-110} />
        <Txt text="Symptom: Early cutoff" fontSize={18} fill="#94a3b8" y={-50} />
        <Rect width={280} height={2} fill="#334155" y={-10} />
        <Txt text="Fix: Remove conflicting" fontSize={18} fontWeight={700} fill="#10b981" y={40} />
        <Txt text="stop tokens from prompt" fontSize={16} fill="#94a3b8" y={75} />
      </Rect>
    </Node>
  );

  yield* sequence(
    0.2,
    card1().opacity(1, 0.4),
    card2().opacity(1, 0.4),
    card3().opacity(1, 0.4),
  );
  yield* waitFor(3.0);
});
