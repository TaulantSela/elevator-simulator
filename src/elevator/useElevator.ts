import { useCallback, useEffect, useRef, useState } from "react";
import {
  createElevator,
  Direction,
  ElevatorState,
  isSettled,
  pressCabin,
  pressDoorClose,
  pressDoorOpen,
  pressHall,
  step,
} from "./engine";

export type Speed = 1 | 2 | 4;

// A frame longer than this (a background tab, a debugger pause) is treated as
// this long, so the car pauses instead of jumping several floors at once.
const MAX_FRAME_MS = 100;

/**
 * Runs the elevator engine on animation frames. The loop only runs while the
 * car has something to do and the simulation isn't paused. Presses still
 * register while paused.
 */
export function useElevator(options?: Parameters<typeof createElevator>[0]) {
  const [state, setState] = useState(() => createElevator(options));
  const [speed, setSpeedState] = useState<Speed>(1);
  const [paused, setPausedState] = useState(false);
  const stateRef = useRef(state);
  const speedRef = useRef<Speed>(1);
  const pausedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const commit = useCallback((next: ElevatorState) => {
    if (next === stateRef.current) return;
    stateRef.current = next;
    setState(next);
  }, []);

  const stopLoop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    lastFrameRef.current = null;
  }, []);

  const tick = useCallback(
    (now: number) => {
      const frame = lastFrameRef.current === null ? 0 : Math.min(now - lastFrameRef.current, MAX_FRAME_MS);
      lastFrameRef.current = now;
      commit(step(stateRef.current, frame * speedRef.current));

      if (isSettled(stateRef.current)) {
        frameRef.current = null;
        lastFrameRef.current = null;
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    },
    [commit]
  );

  const wake = useCallback(() => {
    if (!pausedRef.current && frameRef.current === null) frameRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => stopLoop, [stopLoop]);

  const press = useCallback(
    (apply: (current: ElevatorState) => ElevatorState) => {
      commit(apply(stateRef.current));
      wake();
    },
    [commit, wake]
  );

  const callElevator = useCallback(
    (floor: number, direction: Direction) => press((current) => pressHall(current, floor, direction)),
    [press]
  );
  const selectFloor = useCallback((floor: number) => press((current) => pressCabin(current, floor)), [press]);
  const openDoors = useCallback(() => press(pressDoorOpen), [press]);
  const closeDoors = useCallback(() => press(pressDoorClose), [press]);

  const setSpeed = useCallback((next: Speed) => {
    speedRef.current = next;
    setSpeedState(next);
  }, []);

  const setPaused = useCallback(
    (next: boolean) => {
      pausedRef.current = next;
      setPausedState(next);
      if (next) stopLoop();
      else wake();
    },
    [stopLoop, wake]
  );

  return { state, callElevator, selectFloor, openDoors, closeDoors, speed, setSpeed, paused, setPaused };
}
