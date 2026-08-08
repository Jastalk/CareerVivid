import {makeScene2D, Circle, Rect, Txt, Line, Node} from '@motion-canvas/2d';
import {createRef, all, waitFor, sequence} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  view.fill('#0b0f19');

  // Chapter 5 Header Badge
  const headerBadge = createRef<Rect>();
  view.add(
    <Rect
      ref={headerBadge}
      y={-480}
      height={56}
      padding={[0, 32]}
      radius={28}
      fill="#1a233a"
      stroke="#a855f7"
      lineWidth={2}
    >
      <Txt
        text="Chapter 5 · What To Do When It Collapses"
        fontSize={24}
        fontWeight={700}
        fill="#a855f7"
      />
    </Rect>
  );

  // -------------------------------------------------------------
  // Beat 12: Tell it what changed
  // -------------------------------------------------------------
  const titleBeat12 = createRef<Txt>();
  const cardDelta = createRef<Rect>();

  view.add(
    <Txt
      ref={titleBeat12}
      text="Step 1: Tell it EXACTLY what changed!"
      fontSize={40}
      fontWeight={800}
      fill="white"
      y={-260}
      opacity={0}
    />
  );
  yield* titleBeat12().opacity(1, 0.4);

  view.add(
    <Rect
      ref={cardDelta}
      y={40}
      width={840}
      height={320}
      radius={20}
      fill="#3b0764"
      stroke="#c084fc"
      lineWidth={3}
      opacity={0}
    >
      <Txt text="📝 Explicit Delta Protocol" fontSize={28} fontWeight={700} fill="#e9d5ff" y={-110} />
      <Txt text="• Don't re-upload the entire codebase when things break" fontSize={20} fill="#f3e8ff" y={-40} x={-80} />
      <Txt text="• Explicitly list: 'I modified File A, File B, and File C'" fontSize={20} fill="#f3e8ff" y={10} x={-80} />
      <Txt text="• Focuses agent's attention strictly on the diff boundary" fontSize={20} fill="#86efac" y={60} x={-80} />
    </Rect>
  );

  yield* cardDelta().opacity(1, 0.5);
  yield* waitFor(2.5);

  yield* all(
    titleBeat12().opacity(0, 0.3),
    cardDelta().opacity(0, 0.3),
  );

  // -------------------------------------------------------------
  // Beat 13: Checkpoint & Fresh Conversation
  // -------------------------------------------------------------
  const titleBeat13 = createRef<Txt>();
  const cardCheck = createRef<Rect>();

  view.add(
    <Txt
      ref={titleBeat13}
      text="Step 2: Checkpoint & Start a Fresh Session!"
      fontSize={40}
      fontWeight={800}
      fill="white"
      y={-260}
      opacity={0}
    />
  );
  yield* titleBeat13().opacity(1, 0.4);

  view.add(
    <Rect
      ref={cardCheck}
      y={40}
      width={840}
      height={320}
      radius={20}
      fill="#064e3b"
      stroke="#10b981"
      lineWidth={3}
      opacity={0}
    >
      <Txt text="🏁 Clean Checkpoint Recovery" fontSize={28} fontWeight={700} fill="#6ee7b7" y={-110} />
      <Txt text="1. Save current clean state to git checkpoint branch" fontSize={20} fill="#ecfdf5" y={-40} x={-80} />
      <Txt text="2. Kill hallucinating or stuck session" fontSize={20} fill="#ecfdf5" y={10} x={-80} />
      <Txt text="3. Open a brand new conversation with fresh context & clean summary" fontSize={20} fill="#6ee7b7" y={60} x={-80} />
    </Rect>
  );

  yield* cardCheck().opacity(1, 0.5);
  yield* waitFor(3.0);
});
