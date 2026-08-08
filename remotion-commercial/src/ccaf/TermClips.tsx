/**
 * Term animations for the CCA-F Domain 1 film.
 *
 * These exist because of one specific failure: a viewer watched the film twice
 * and still could not say what `tool_use` was. The words were defined, but a
 * definition read aloud over a still drawing does not build a mental model —
 * the thing being described is a SEQUENCE, and a sequence needs time to show.
 *
 * So each clip animates the mechanism rather than illustrating it. The envelope
 * actually travels. The tag is actually read. The loop actually goes round a
 * second time because of what the tag said.
 *
 * Rendered silent, then spliced into the main film as beats. The narration lives
 * in domain1Script.ts as usual, so the content checks still govern what is said.
 */

import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import { Stage, Figure, Card, Label, Arrow, INK, AMBER, TEAL, RED, BLUE, PAPER } from './StickFigure';

/** Eased 0→1 over a window, clamped. The only timing primitive these need. */
const seg = (frame: number, from: number, to: number) =>
    interpolate(frame, [from, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/**
 * WHAT COMES BACK — the envelope and the tag stapled to the outside.
 *
 * The point being made: the reply is not a string. It is a structure, and the
 * field that drives your loop is on the outside of it, which is why people who
 * only read the text never find it.
 */
export const WhatComesBack: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = (t: number) => t * fps;

    const send = seg(frame, s(0.4), s(1.6));
    const back = seg(frame, s(2.0), s(3.4));
    const openUp = seg(frame, s(3.8), s(4.8));
    const tagPop = seg(frame, s(5.2), s(6.0));

    return (
        <Stage>
            <Figure x={230} y={640} scale={1.5} face="neutral" />
            <Label x={230} y={760} text="Leo's code" size={26} colour="#64748b" />

            {/* out */}
            <Arrow x1={360} y1={520} x2={760} y2={520} progress={send} colour="#94a3b8" />
            {send > 0.5 && <Label x={560} y={488} text="messages" size={24} colour="#64748b" mono />}

            <Card x={840} y={430} w={180} h={180} seed={3}>
                <circle cx={90} cy={90} r={44} fill="none" stroke={INK} strokeWidth={5} />
                <circle cx={74} cy={80} r={4} fill={INK} />
                <circle cx={106} cy={80} r={4} fill={INK} />
                <line x1={72} y1={104} x2={108} y2={104} stroke={INK} strokeWidth={4} strokeLinecap="round" />
            </Card>
            <Label x={930} y={660} text="the model" size={26} colour="#64748b" />

            {/* back — the envelope */}
            {back > 0 && (
                <g opacity={back}>
                    <Arrow x1={1020} y1={620} x2={1240} y2={700} progress={back} colour="#94a3b8" />
                    <Card x={1280} y={620} w={420} h={230} seed={5}>
                        <Label x={210} y={54} text="the reply" size={26} colour="#64748b" />
                        {/* inside: the content everybody reads */}
                        <g opacity={openUp}>
                            <line x1={40} y1={100} x2={380} y2={100} stroke="#cbd5e1" strokeWidth={9} strokeLinecap="round" />
                            <line x1={40} y1={130} x2={330} y2={130} stroke="#cbd5e1" strokeWidth={9} strokeLinecap="round" />
                            <line x1={40} y1={160} x2={360} y2={160} stroke="#cbd5e1" strokeWidth={9} strokeLinecap="round" />
                            <Label x={210} y={205} text="what it wrote" size={22} colour="#94a3b8" />
                        </g>
                    </Card>
                </g>
            )}

            {/* the tag stapled to the OUTSIDE — the actual subject of the clip */}
            {tagPop > 0 && (
                <g
                    opacity={tagPop}
                    transform={`translate(${1250 + (1 - tagPop) * 40} ${560}) rotate(${-6 + (1 - tagPop) * 10})`}
                >
                    <Card x={0} y={0} w={470} h={92} fill="#fff7ed" seed={7}>
                        <Label x={22} y={40} text="stop_reason" size={30} colour={AMBER} mono anchor="start" />
                        <Label x={22} y={72} text="why it stopped writing" size={22} colour="#9a3412" anchor="start" />
                    </Card>
                </g>
            )}

            {tagPop > 0.7 && (
                <Label x={960} y={980} text="Most people only open the envelope." size={34} colour="#334155" />
            )}
        </Stage>
    );
};

/**
 * WHY A LOOP EXISTS — the model cannot reach the hammer.
 *
 * The loop is usually presented as an architectural choice. It is not. It is a
 * consequence of the model having no hands, and once a viewer sees that, the
 * whole tool_use branch stops being arbitrary.
 */
export const WhyALoop: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = (t: number) => t * fps;

    const reach = seg(frame, s(0.6), s(1.8));
    const fail = seg(frame, s(2.0), s(2.6));
    const note = seg(frame, s(3.0), s(4.2));
    const run = seg(frame, s(4.6), s(5.6));
    const handBack = seg(frame, s(6.0), s(7.2));

    return (
        <Stage>
            {/* the model, reaching */}
            <Card x={180} y={420} w={200} h={200} seed={3}>
                <circle cx={100} cy={100} r={48} fill="none" stroke={INK} strokeWidth={5} />
                <circle cx={82} cy={88} r={4} fill={INK} />
                <circle cx={118} cy={88} r={4} fill={INK} />
                <path
                    d={fail > 0.4 ? 'M 78 124 Q 100 108 122 124' : 'M 78 116 L 122 116'}
                    stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round"
                />
            </Card>
            <Label x={280} y={670} text="the model" size={26} colour="#64748b" />

            <Arrow x1={400} y1={500} x2={400 + reach * 190} y2={500} progress={1} colour="#94a3b8" />

            {/* the tool, out of reach */}
            <g opacity={0.9}>
                <Card x={700} y={430} w={190} h={170} fill="#f0fdf4" seed={9}>
                    <path d="M 60 110 L 130 40" stroke={INK} strokeWidth={9} strokeLinecap="round" />
                    <rect x={112} y={20} width={54} height={34} rx={5} fill={TEAL} stroke={INK} strokeWidth={5} />
                    <Label x={95} y={152} text="a tool" size={24} colour="#166534" />
                </Card>
            </g>

            {fail > 0.3 && (
                <g opacity={fail}>
                    <Label x={555} y={430} text="✕" size={64} colour={RED} />
                    <Label x={560} y={620} text="cannot run it" size={26} colour={RED} />
                </g>
            )}

            {/* so it passes a note to you */}
            {note > 0 && (
                <g opacity={note}>
                    <Card
                        x={430 + note * 150} y={760} w={430} h={86} fill="#fff7ed" seed={11}
                    >
                        <Label x={20} y={38} text="tool_use" size={28} colour={AMBER} mono anchor="start" />
                        <Label x={20} y={68} text="please run this one for me" size={22} colour="#9a3412" anchor="start" />
                    </Card>
                </g>
            )}

            <Figure x={1500} y={640} scale={1.6} face={run > 0.5 ? 'happy' : 'neutral'} reach={run > 0.3} />
            <Label x={1500} y={760} text="Leo" size={26} colour="#64748b" />

            {run > 0.2 && (
                <g opacity={run}>
                    <Arrow x1={1420} y1={520} x2={900} y2={500} progress={run} colour={TEAL} />
                    <Label x={1160} y={470} text="Leo runs it" size={26} colour={TEAL} />
                </g>
            )}
            {handBack > 0 && (
                <g opacity={handBack}>
                    <Arrow x1={900} y1={640} x2={420} y2={620} progress={handBack} colour={BLUE} />
                    <Label x={660} y={690} text="result goes back in" size={26} colour={BLUE} mono />
                </g>
            )}
            {handBack > 0.7 && (
                <Label x={960} y={990} text="That hand-back IS the loop." size={36} colour="#334155" />
            )}
        </Stage>
    );
};

/**
 * TWO LIMITS — the desk and the pen.
 *
 * `max_tokens` and `model_context_window_exceeded` are indistinguishable to a
 * beginner because both are described as "too much". Showing them on opposite
 * sides of the exchange is the whole lesson.
 */
export const TwoLimits: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = (t: number) => t * fps;

    const deskFill = seg(frame, s(0.8), s(3.0));
    const deskLabel = seg(frame, s(3.0), s(3.8));
    const penDraw = seg(frame, s(4.2), s(6.2));
    const penLabel = seg(frame, s(6.2), s(7.0));

    return (
        <Stage>
            <Label x={480} y={140} text="what goes IN" size={34} colour="#64748b" />
            <Label x={1440} y={140} text="what comes OUT" size={34} colour="#64748b" />
            <line x1={960} y1={180} x2={960} y2={900} stroke="#e2e8f0" strokeWidth={4} strokeDasharray="14 12" />

            {/* the desk filling up */}
            <Card x={200} y={300} w={560} h={380} seed={3}>
                {[0, 1, 2, 3, 4, 5].map(i => {
                    const on = deskFill > (i + 1) / 7;
                    return on ? (
                        <rect
                            key={i} x={40} y={330 - i * 50} width={480} height={40} rx={4}
                            fill={i >= 5 ? RED : '#cbd5e1'} stroke={INK} strokeWidth={4}
                        />
                    ) : null;
                })}
            </Card>
            <Label x={480} y={730} text="the desk — everything must fit on it" size={28} colour="#334155" />
            {deskLabel > 0 && (
                <g opacity={deskLabel}>
                    <Card x={190} y={790} w={580} h={92} fill="#fef2f2" seed={13}>
                        <Label x={20} y={40} text="model_context_window_exceeded" size={25} colour={RED} mono anchor="start" />
                        <Label x={20} y={70} text="the desk is full — trim or compact the input" size={21} colour="#7f1d1d" anchor="start" />
                    </Card>
                </g>
            )}

            {/* the pen running dry */}
            <Figure x={1240} y={600} scale={1.3} face="neutral" />
            <g>
                <line
                    x1={1360} y1={470}
                    x2={1360 + penDraw * 380} y2={470}
                    stroke={penDraw > 0.85 ? RED : INK} strokeWidth={10} strokeLinecap="round"
                />
                {penDraw > 0.85 && <Label x={1760} y={440} text="✕" size={54} colour={RED} />}
            </g>
            <Label x={1500} y={730} text="the pen — how much it may write back" size={28} colour="#334155" />
            {penLabel > 0 && (
                <g opacity={penLabel}>
                    <Card x={1180} y={790} w={580} h={92} fill="#fff7ed" seed={15}>
                        <Label x={20} y={40} text="max_tokens" size={28} colour={AMBER} mono anchor="start" />
                        <Label x={20} y={70} text="Leo's own ceiling — raise it, stream, or split" size={21} colour="#9a3412" anchor="start" />
                    </Card>
                </g>
            )}

            {penLabel > 0.6 && (
                <Label x={960} y={1010} text="Two limits. Two different places." size={38} colour="#334155" />
            )}
        </Stage>
    );
};

/**
 * WHOSE FIELD IS IT — the distinction nobody draws.
 *
 * Half these names ship with the API. The other half are conventions you invent
 * in your own schema. A beginner has no way to tell them apart, and assuming
 * `citation_id` is something Anthropic provides sends them looking for a field
 * that does not exist.
 */
export const WhoseField: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = (t: number) => t * fps;

    const API = ['stop_reason', 'tool_use', 'end_turn', 'max_tokens', 'tool_choice', 'custom_id'];
    const YOURS = ['citation_id', 'conflict_detected'];

    return (
        <Stage>
            <Card x={140} y={200} w={740} h={720} fill="#f0f9ff" seed={3}>
                <Label x={370} y={70} text="the API gives you these" size={34} colour="#0369a1" />
                <Label x={370} y={112} text="they arrive whether you ask or not" size={24} colour="#0284c7" />
                {API.map((t, i) => {
                    const on = seg(frame, s(0.6 + i * 0.45), s(1.2 + i * 0.45));
                    return (
                        <g key={t} opacity={on} transform={`translate(0 ${(1 - on) * 12})`}>
                            <rect x={60} y={160 + i * 88} width={620} height={68} rx={10}
                                fill={PAPER} stroke={BLUE} strokeWidth={4} />
                            <Label x={90} y={203 + i * 88} text={t} size={30} colour="#0369a1" mono anchor="start" />
                        </g>
                    );
                })}
            </Card>

            <Card x={1040} y={200} w={740} h={720} fill="#fefce8" seed={5}>
                <Label x={370} y={70} text="YOU invent these" size={34} colour="#a16207" />
                <Label x={370} y={112} text="nothing gives them to you — you agree on them" size={24} colour="#ca8a04" />
                {YOURS.map((t, i) => {
                    const on = seg(frame, s(3.4 + i * 0.6), s(4.0 + i * 0.6));
                    return (
                        <g key={t} opacity={on} transform={`translate(0 ${(1 - on) * 12})`}>
                            <rect x={60} y={160 + i * 88} width={620} height={68} rx={10}
                                fill={PAPER} stroke={AMBER} strokeWidth={4} />
                            <Label x={90} y={203 + i * 88} text={t} size={30} colour="#a16207" mono anchor="start" />
                        </g>
                    );
                })}
                {seg(frame, s(5.0), s(5.8)) > 0.3 && (
                    <g opacity={seg(frame, s(5.0), s(5.8))}>
                        <Label x={370} y={420} text="Search the docs for these" size={26} colour="#a16207" />
                        <Label x={370} y={458} text="and you will find nothing." size={26} colour="#a16207" />
                    </g>
                )}
            </Card>
        </Stage>
    );
};
