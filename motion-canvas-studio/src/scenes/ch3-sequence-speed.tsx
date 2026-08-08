import {makeScene2D, Circle, Rect, Txt, Line, Node} from '@motion-canvas/2d';
import {createRef, all, waitFor, sequence} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  view.fill('#0b0f19');

  // Chapter 3 Header Badge
  const headerBadge = createRef<Rect>();
  view.add(
    <Rect
      ref={headerBadge}
      y={-480}
      height={56}
      padding={[0, 32]}
      radius={28}
      fill="#1a233a"
      stroke="#f59e0b"
      lineWidth={2}
    >
      <Txt
        text="Chapter 3 · Action Sequence & Concurrency"
        fontSize={24}
        fontWeight={700}
        fill="#f59e0b"
      />
    </Rect>
  );

  // -------------------------------------------------------------
  // Beat 7: Forced Tool Choice
  // -------------------------------------------------------------
  const titleBeat7 = createRef<Txt>();
  const seqCard = createRef<Rect>();

  view.add(
    <Txt
      ref={titleBeat7}
      text="Has Dependencies? Force tool_choice on Turn 1!"
      fontSize={40}
      fontWeight={800}
      fill="white"
      y={-260}
      opacity={0}
    />
  );
  yield* titleBeat7().opacity(1, 0.4);

  view.add(
    <Rect
      ref={seqCard}
      y={40}
      width={840}
      height={320}
      radius={20}
      fill="#291e05"
      stroke="#f59e0b"
      lineWidth={3}
      opacity={0}
    >
      <Txt text="🔒 Sequential Protocol: Turn-1 Forced Tool Choice" fontSize={28} fontWeight={700} fill="#fcd34d" y={-110} />
      <Txt text="1. Force initial tool call: tool_choice = { type: 'tool', name: 'read_file' }" fontSize={20} fill="#fef3c7" y={-40} x={-80} />
      <Txt text="2. Guarantees prerequisite data is retrieved BEFORE decisions happen" fontSize={20} fill="#fef3c7" y={10} x={-80} />
      <Txt text="3. Once prerequisite succeeds → Release tool_choice to 'auto'" fontSize={20} fill="#6ee7b7" y={60} x={-80} />
    </Rect>
  );

  yield* seqCard().opacity(1, 0.5);
  yield* waitFor(2.5);

  yield* all(
    titleBeat7().opacity(0, 0.3),
    seqCard().opacity(0, 0.3),
  );

  // -------------------------------------------------------------
  // Beat 8: Twelve at once (Parallel Tasks)
  // -------------------------------------------------------------
  const titleBeat8 = createRef<Txt>();
  const paraCard = createRef<Rect>();

  view.add(
    <Txt
      ref={titleBeat8}
      text="No Dependencies? Fire 12 Tasks Concurrently!"
      fontSize={40}
      fontWeight={800}
      fill="white"
      y={-260}
      opacity={0}
    />
  );
  yield* titleBeat8().opacity(1, 0.4);

  view.add(
    <Rect
      ref={paraCard}
      y={40}
      width={840}
      height={320}
      radius={20}
      fill="#0c4a6e"
      stroke="#38bdf8"
      lineWidth={3}
      opacity={0}
    >
      <Txt text="⚡ Synchronous Raid: Concurrent Execution" fontSize={28} fontWeight={700} fill="#7dd3fc" y={-110} />
      <Txt text="• Zero shared state? Dispatch 12 tasks in a single turn" fontSize={20} fill="#e0f2fe" y={-40} x={-100} />
      <Txt text="• Subagents work asynchronously without blocking each other" fontSize={20} fill="#e0f2fe" y={10} x={-100} />
      <Txt text="• Reduces multi-step latency by up to 10x" fontSize={20} fill="#a7f3d0" y={60} x={-100} />
    </Rect>
  );

  yield* paraCard().opacity(1, 0.5);
  yield* waitFor(3.0);
});
