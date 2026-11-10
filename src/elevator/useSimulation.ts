import { useCallback, useEffect, useRef, useState } from "react";
import { Direction, ElevatorState, pressCabin, pressDoorClose, pressDoorOpen, pressHall } from "./engine";
import {
  createSimulation,
  EMPTY_STATS,
  isSimulationSettled,
  Simulation,
  stepSimulation,
  TrafficLevel,
} from "./passengers";

export type Speed = 1 | 2 | 4;

// A frame longer than this (a background tab, a debugger pause) is treated as
// this long, so the car pauses instead of jumping several floors at once.
const MAX_FRAME_MS = 100;

/**
 * Runs the simulation on animation frames. The loop only runs while there is
 * something to do (the car has calls, passengers are around, or traffic is
 * on) and the simulation isn't paused. Presses still register while paused.
 */
export function useSimulation(options?: Parameters<typeof createSimulation>[0]) {
  const [sim, setSim] = useState(() => createSimulation({ seed: Date.now() % 2 ** 31, ...options }));
  const [speed, setSpeedState] = useState<Speed>(1);
  const [paused, setPausedState] = useState(false);
  const simRef = useRef(sim);
  const speedRef = useRef<Speed>(1);
  const pausedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const commit = useCallback((next: Simulation) => {
    if (next === simRef.current) return;
    simRef.current = next;
    setSim(next);
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
      commit(stepSimulation(simRef.current, frame * speedRef.current));

      if (isSimulationSettled(simRef.current)) {
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

  const update = useCallback(
    (apply: (current: Simulation) => Simulation) => {
      commit(apply(simRef.current));
      wake();
    },
    [commit, wake]
  );

  const press = useCallback(
    (apply: (elevator: ElevatorState) => ElevatorState) =>
      update((current) => {
        const elevator = apply(current.elevator);
        return elevator === current.elevator ? current : { ...current, elevator };
      }),
    [update]
  );

  const callElevator = useCallback(
    (floor: number, direction: Direction) => press((elevator) => pressHall(elevator, floor, direction)),
    [press]
  );
  const selectFloor = useCallback((floor: number) => press((elevator) => pressCabin(elevator, floor)), [press]);
  const openDoors = useCallback(() => press(pressDoorOpen), [press]);
  const closeDoors = useCallback(() => press(pressDoorClose), [press]);

  const setTraffic = useCallback(
    (traffic: TrafficLevel) => update((current) => (current.traffic === traffic ? current : { ...current, traffic })),
    [update]
  );
  const resetStats = useCallback(() => update((current) => ({ ...current, stats: EMPTY_STATS })), [update]);

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

  return {
    sim,
    callElevator,
    selectFloor,
    openDoors,
    closeDoors,
    setTraffic,
    resetStats,
    speed,
    setSpeed,
    paused,
    setPaused,
  };
}
