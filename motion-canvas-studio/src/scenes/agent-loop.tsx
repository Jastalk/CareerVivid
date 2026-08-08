import {makeScene2D, Circle, Rect, Txt, Line} from '@motion-canvas/2d';
import {createRef, all, waitFor, sequence} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  view.fill('#0f0f1a');

  // Title
  const title = createRef<Txt>();
  const subtitle = createRef<Txt>();

  view.add(
    <Txt
      ref={title}
      text="One Agent, One Loop"
      fontSize={52}
      fontWeight={700}
      fill="white"
      y={-360}
      opacity={0}
    />
  );
  view.add(
    <Txt
      ref={subtitle}
      text="stop_reason is the brake — not a round counter"
      fontSize={26}
      fill="#a0a8c0"
      y={-310}
      opacity={0}
    />
  );

  yield* all(
    title().opacity(1, 0.5),
    subtitle().opacity(1, 0.5),
  );
  yield* waitFor(0.3);

  // Agent circle
  const agentCircle = createRef<Circle>();
  const agentLabel = createRef<Txt>();
  view.add(
    <Circle
      ref={agentCircle}
      size={140}
      stroke="#4f8ef7"
      lineWidth={3}
      fill="#4f8ef715"
      x={-450}
      y={0}
      opacity={0}
    />
  );
  view.add(
    <Txt
      ref={agentLabel}
      text="Agent"
      fontSize={28}
      fontWeight={700}
      fill="#4f8ef7"
      x={-450}
      y={0}
      opacity={0}
    />
  );

  // Tool box
  const toolRect = createRef<Rect>();
  const toolLabel = createRef<Txt>();
  view.add(
    <Rect
      ref={toolRect}
      width={220}
      height={90}
      radius={12}
      stroke="#f7c94f"
      lineWidth={3}
      fill="#f7c94f15"
      x={0}
      y={0}
      opacity={0}
    />
  );
  view.add(
    <Txt
      ref={toolLabel}
      text="Tool Call"
      fontSize={26}
      fontWeight={700}
      fill="#f7c94f"
      x={0}
      y={0}
      opacity={0}
    />
  );

  // Stop box
  const stopRect = createRef<Rect>();
  const stopLabel = createRef<Txt>();
  view.add(
    <Rect
      ref={stopRect}
      width={230}
      height={90}
      radius={12}
      stroke="#f74f4f"
      lineWidth={3}
      fill="#f74f4f15"
      x={450}
      y={0}
      opacity={0}
    />
  );
  view.add(
    <Txt
      ref={stopLabel}
      text={"stop_reason\n= end_turn"}
      fontSize={22}
      fontWeight={700}
      fill="#f74f4f"
      x={450}
      y={0}
      opacity={0}
    />
  );

  // Fade in all boxes
  yield* all(
    agentCircle().opacity(1, 0.4),
    agentLabel().opacity(1, 0.4),
    toolRect().opacity(1, 0.4),
    toolLabel().opacity(1, 0.4),
    stopRect().opacity(1, 0.4),
    stopLabel().opacity(1, 0.4),
  );
  yield* waitFor(0.3);

  // Lines with arrowheads
  const arrow1 = createRef<Line>();
  const arrow2 = createRef<Line>();
  view.add(
    <Line
      ref={arrow1}
      points={[[-380, 0], [-120, 0]]}
      stroke="#4f8ef7"
      lineWidth={4}
      endArrow
      end={0}
    />
  );
  view.add(
    <Line
      ref={arrow2}
      points={[[120, 0], [340, 0]]}
      stroke="#ef4444"
      lineWidth={4}
      endArrow
      end={0}
    />
  );

  yield* arrow1().end(1, 0.5);
  yield* waitFor(0.2);
  yield* arrow2().end(1, 0.5);
  yield* waitFor(0.5);

  // Wrong/Right labels
  const wrongLabel = createRef<Txt>();
  const rightLabel = createRef<Txt>();
  view.add(
    <Txt
      ref={wrongLabel}
      text="❌  NOT: after N rounds"
      fontSize={26}
      fill="#ff6b6b"
      y={200}
      opacity={0}
    />
  );
  view.add(
    <Txt
      ref={rightLabel}
      text="✅  YES: when end_turn fires"
      fontSize={26}
      fill="#6bff9e"
      y={250}
      opacity={0}
    />
  );

  yield* wrongLabel().opacity(1, 0.4);
  yield* waitFor(0.3);
  yield* rightLabel().opacity(1, 0.4);
  yield* waitFor(1.0);

  // Pulse stop box
  yield* stopRect().stroke('#ff2222', 0.3);
  yield* stopRect().stroke('#f74f4f', 0.3);
  yield* waitFor(1.0);
});
