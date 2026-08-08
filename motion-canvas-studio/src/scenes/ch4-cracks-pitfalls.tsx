import {makeScene2D, Circle, Rect, Txt, Line, Node} from '@motion-canvas/2d';
import {createRef, all, waitFor, sequence} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  view.fill('#0b0f19');

  // Chapter 4 Header Badge
  const headerBadge = createRef<Rect>();
  view.add(
    <Rect
      ref={headerBadge}
      y={-480}
      height={56}
      padding={[0, 32]}
      radius={28}
      fill="#1a233a"
      stroke="#ec4899"
      lineWidth={2}
    >
      <Txt
        text="Chapter 4 · Pitfalls That Fall Between Cracks"
        fontSize={24}
        fontWeight={700}
        fill="#ec4899"
      />
    </Rect>
  );

  // -------------------------------------------------------------
  // Beat 9: No context inheritance
  // -------------------------------------------------------------
  const titleBeat9 = createRef<Txt>();
  const cardInh = createRef<Rect>();

  view.add(
    <Txt
      ref={titleBeat9}
      text="Pitfall #1: Context Does NOT Auto-Inherit!"
      fontSize={40}
      fontWeight={800}
      fill="white"
      y={-260}
      opacity={0}
    />
  );
  yield* titleBeat9().opacity(1, 0.4);

  view.add(
    <Rect
      ref={cardInh}
      y={40}
      width={840}
      height={320}
      radius={20}
      fill="#312e81"
      stroke="#818cf8"
      lineWidth={3}
      opacity={0}
    >
      <Txt text="🧠 Subagent Context Isolation" fontSize={28} fontWeight={700} fill="#c7d2fe" y={-110} />
      <Txt text="• Subagents start with a completely fresh, empty context window" fontSize={20} fill="#e0e7ff" y={-40} x={-60} />
      <Txt text="• YOU must explicitly pass critical variables, schemas, and rules" fontSize={20} fill="#e0e7ff" y={10} x={-60} />
      <Txt text="• Never assume a subagent 'knows' what happened in parent steps!" fontSize={20} fill="#fca5a5" y={60} x={-60} />
    </Rect>
  );

  yield* cardInh().opacity(1, 0.5);
  yield* waitFor(2.5);

  yield* all(
    titleBeat9().opacity(0, 0.3),
    cardInh().opacity(0, 0.3),
  );

  // -------------------------------------------------------------
  // Beat 10 & 11: Two Numbers & Citation ID
  // -------------------------------------------------------------
  const titleBeat10 = createRef<Txt>();
  const cardNum = createRef<Rect>();
  const cardCite = createRef<Rect>();

  view.add(
    <Txt
      ref={titleBeat10}
      text="Pitfall #2 & #3: Conflicting Data & Evidence Chains"
      fontSize={40}
      fontWeight={800}
      fill="white"
      y={-280}
      opacity={0}
    />
  );
  yield* titleBeat10().opacity(1, 0.4);

  view.add(
    <Node y={50}>
      <Rect
        ref={cardNum}
        x={-320}
        width={460}
        height={300}
        radius={16}
        fill="#1e293b"
        stroke="#f43f5e"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="📊 Never Average Scores" fontSize={24} fontWeight={700} fill="#fda4af" y={-100} />
        <Txt text="If Agent A says 0.9 confidence" fontSize={18} fill="#e2e8f0" y={-40} />
        <Txt text="and Agent B says 0.1 confidence..." fontSize={18} fill="#e2e8f0" y={0} />
        <Txt text="DO NOT average to 0.5!" fontSize={20} fontWeight={700} fill="#f43f5e" y={50} />
        <Txt text="Investigate the root conflict." fontSize={16} fill="#94a3b8" y={90} />
      </Rect>

      <Rect
        ref={cardCite}
        x={320}
        width={460}
        height={300}
        radius={16}
        fill="#1e293b"
        stroke="#10b981"
        lineWidth={3}
        opacity={0}
      >
        <Txt text="🔗 Tag citation_id Early" fontSize={24} fontWeight={700} fill="#6ee7b7" y={-100} />
        <Txt text="Tag citation_id from the very first" fontSize={18} fill="#e2e8f0" y={-40} />
        <Txt text="agent that fetches the source." fontSize={18} fill="#e2e8f0" y={0} />
        <Txt text="Preserves unbreakable audit trail" fontSize={20} fontWeight={700} fill="#10b981" y={50} />
        <Txt text="across multi-agent handoffs." fontSize={16} fill="#94a3b8" y={90} />
      </Rect>
    </Node>
  );

  yield* all(
    cardNum().opacity(1, 0.5),
    cardCite().opacity(1, 0.5),
  );
  yield* waitFor(3.0);
});
