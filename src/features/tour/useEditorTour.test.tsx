import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorTour, TOUR_MIN_WIDTH } from './useEditorTour';
import { TOUR_STEPS } from './tourSteps';
import { hasSeenTour } from './tourStorage';

/** A stand-in editor carrying the same data-tour anchors as the real one. */
const Harness: React.FC<{ uid?: string; requested?: boolean; ready?: boolean }> = ({
    uid = 'user-1',
    requested = true,
    ready = true,
}) => {
    const tour = useEditorTour({ uid, requested, ready });
    return (
        <div>
            <span data-testid="state">{tour.active ? `${tour.stepIndex}:${tour.step?.id}` : 'inactive'}</span>
            <span data-testid="finished">{String(tour.finished)}</span>
            <span data-testid="seen">{String(tour.seen)}</span>
            <button onClick={tour.start}>replay</button>
            <button onClick={tour.skip}>skip</button>
            {TOUR_STEPS.map((s) => (
                <button key={s.id} data-tour={s.anchor}>
                    {s.anchor}
                </button>
            ))}
        </div>
    );
};

const setWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
};

const clickAnchor = (anchor: string) => fireEvent.click(screen.getByRole('button', { name: anchor }));

describe('useEditorTour', () => {
    beforeEach(() => {
        localStorage.clear();
        setWidth(1440);
    });

    it('auto-starts on the first step when requested', () => {
        render(<Harness />);
        expect(screen.getByTestId('state')).toHaveTextContent('0:score');
    });

    /*
     * The whole mechanic: there is no Next button, so clicking the real control
     * has to be what advances. If this breaks, the tour is a dead end.
     */
    it('advances only when the step\'s own control is clicked', () => {
        render(<Harness />);

        // A different step's anchor must not count.
        clickAnchor('download-pdf');
        expect(screen.getByTestId('state')).toHaveTextContent('0:score');

        clickAnchor('score-pill');
        expect(screen.getByTestId('state')).toHaveTextContent('1:suggestions');
    });

    it('walks all five steps and finishes', async () => {
        render(<Harness />);

        for (const step of TOUR_STEPS) {
            clickAnchor(step.anchor);
        }
        // Completion is deferred a microtask so it does not set state while the
        // clicked control is still running its own handler.
        await act(async () => {});

        expect(screen.getByTestId('state')).toHaveTextContent('inactive');
        expect(screen.getByTestId('finished')).toHaveTextContent('true');
        expect(hasSeenTour('user-1')).toBe(true);
    });

    it('remembers a skip, so it does not ambush them again', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'skip' }));

        expect(screen.getByTestId('state')).toHaveTextContent('inactive');
        expect(screen.getByTestId('finished')).toHaveTextContent('false');
        expect(hasSeenTour('user-1')).toBe(true);
    });

    it('leaves on Escape — a tour with no exit is a trap', () => {
        render(<Harness />);
        fireEvent.keyDown(window, { key: 'Escape' });

        expect(screen.getByTestId('state')).toHaveTextContent('inactive');
    });

    it('does not auto-start for someone who has already seen it', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'skip' }));

        render(<Harness />);
        expect(screen.getAllByTestId('state').at(-1)).toHaveTextContent('inactive');
    });

    it('replays on request even after it has been seen', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'skip' }));
        fireEvent.click(screen.getByRole('button', { name: 'replay' }));

        expect(screen.getByTestId('state')).toHaveTextContent('0:score');
    });

    it('stays out of the way when the tour was not requested', () => {
        render(<Harness requested={false} />);
        expect(screen.getByTestId('state')).toHaveTextContent('inactive');
    });

    it('waits for the editor to have something to point at', () => {
        const { rerender } = render(<Harness ready={false} />);
        expect(screen.getByTestId('state')).toHaveTextContent('inactive');

        rerender(<Harness ready />);
        expect(screen.getByTestId('state')).toHaveTextContent('0:score');
    });

    /*
     * Below this width the editor collapses to one column and these controls
     * are not all on screen, so the steps would point at nothing.
     */
    it('does not auto-start on a narrow viewport', () => {
        setWidth(TOUR_MIN_WIDTH - 1);
        render(<Harness />);

        expect(screen.getByTestId('state')).toHaveTextContent('inactive');
    });

    it('bows out if the window is shrunk mid-tour', () => {
        render(<Harness />);
        expect(screen.getByTestId('state')).toHaveTextContent('0:score');

        act(() => {
            setWidth(600);
            window.dispatchEvent(new Event('resize'));
        });

        expect(screen.getByTestId('state')).toHaveTextContent('inactive');
    });

    it('counts a click on something inside the control', () => {
        const Nested: React.FC = () => {
            const tour = useEditorTour({ uid: 'u', requested: true, ready: true });
            return (
                <div>
                    <span data-testid="nested-state">{tour.step?.id ?? 'inactive'}</span>
                    <button data-tour="score-pill">
                        <span>Resume Score 85</span>
                    </button>
                </div>
            );
        };
        render(<Nested />);

        // Real controls wrap their label in spans; the click lands on the span.
        fireEvent.click(screen.getByText('Resume Score 85'));
        expect(screen.getByTestId('nested-state')).toHaveTextContent('suggestions');
    });
});
