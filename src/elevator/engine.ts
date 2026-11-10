// A single-car elevator as a pure state machine.
//
// `step(state, dt)` advances the simulation by `dt` milliseconds and the
// `press*` functions register calls. Nothing here owns a timer, so the same
// code drives the UI (one step per animation frame) and the tests (fixed
// steps), and every transition happens in exactly one place.
//
// Dispatching is collective control with LOOK: the car keeps its travel
// direction while any call lies ahead of it, stops for cabin calls and for
// hall calls going its way, and turns around at the last call in that
// direction.

export type Direction = "up" | "down";
export type Phase = "idle" | "moving" | "doorsOpening" | "doorsOpen" | "doorsClosing";

export type Timing = {
  /** Time to travel one floor. */
  floorTravel: number;
  doorOpening: number;
  /** How long the doors stay fully open before closing on their own. */
  doorDwell: number;
  doorClosing: number;
};

export const DEFAULT_TIMING: Timing = {
  floorTravel: 1500,
  doorOpening: 1000,
  doorDwell: 2500,
  doorClosing: 1000,
};

export type ElevatorState = {
  readonly bottomFloor: number;
  readonly topFloor: number;
  readonly timing: Timing;
  /** The floor the car is at, or last left while moving. */
  readonly floor: number;
  readonly phase: Phase;
  /** Milliseconds spent in the current phase. */
  readonly elapsed: number;
  /** Travel direction while moving; the announced departure direction while stopped. */
  readonly direction: Direction | null;
  readonly cabinCalls: readonly number[];
  readonly hallCalls: { readonly up: readonly number[]; readonly down: readonly number[] };
};

type Options = {
  bottomFloor?: number;
  topFloor?: number;
  startFloor?: number;
  timing?: Partial<Timing>;
};

export function createElevator({
  bottomFloor = 1,
  topFloor = 7,
  startFloor = bottomFloor,
  timing,
}: Options = {}): ElevatorState {
  return {
    bottomFloor,
    topFloor,
    timing: { ...DEFAULT_TIMING, ...timing },
    floor: startFloor,
    phase: "idle",
    elapsed: 0,
    direction: null,
    cabinCalls: [],
    hallCalls: { up: [], down: [] },
  };
}

const opposite = (direction: Direction): Direction => (direction === "up" ? "down" : "up");
const sign = (direction: Direction) => (direction === "up" ? 1 : -1);
const addFloor = (list: readonly number[], floor: number) =>
  list.includes(floor) ? list : [...list, floor].sort((a, b) => a - b);
const removeFloor = (list: readonly number[], floor: number) =>
  list.includes(floor) ? list.filter((value) => value !== floor) : list;

const isFloor = (state: ElevatorState, floor: number) =>
  Number.isInteger(floor) && floor >= state.bottomFloor && floor <= state.topFloor;

export function pressHall(state: ElevatorState, floor: number, direction: Direction): ElevatorState {
  if (!isFloor(state, floor)) return state;
  if (direction === "up" && floor === state.topFloor) return state;
  if (direction === "down" && floor === state.bottomFloor) return state;

  const calls = state.hallCalls[direction];
  if (calls.includes(floor)) return state;
  return { ...state, hallCalls: { ...state.hallCalls, [direction]: addFloor(calls, floor) } };
}

export function pressCabin(state: ElevatorState, floor: number): ElevatorState {
  if (!isFloor(state, floor) || state.cabinCalls.includes(floor)) return state;
  return { ...state, cabinCalls: addFloor(state.cabinCalls, floor) };
}

export function hasCalls(state: ElevatorState) {
  return state.cabinCalls.length > 0 || state.hallCalls.up.length > 0 || state.hallCalls.down.length > 0;
}

/** True when nothing will change until the next press. */
export function isSettled(state: ElevatorState) {
  return state.phase === "idle" && !hasCalls(state);
}

function hasCallsBeyond(state: ElevatorState, floor: number, direction: Direction) {
  const beyond = (value: number) => (direction === "up" ? value > floor : value < floor);
  return (
    state.cabinCalls.some(beyond) || state.hallCalls.up.some(beyond) || state.hallCalls.down.some(beyond)
  );
}

function nearestCallDistance(state: ElevatorState, direction: Direction) {
  const all = [...state.cabinCalls, ...state.hallCalls.up, ...state.hallCalls.down];
  const distances = all
    .map((floor) => (floor - state.floor) * sign(direction))
    .filter((distance) => distance > 0);
  return distances.length ? Math.min(...distances) : null;
}

/** The direction the car should leave its current floor in, if any. */
function chooseDirection(state: ElevatorState): Direction | null {
  const { floor, direction, hallCalls } = state;

  if (direction) {
    if (hasCallsBeyond(state, floor, direction) || hallCalls[direction].includes(floor)) return direction;
    const reverse = opposite(direction);
    if (hasCallsBeyond(state, floor, reverse) || hallCalls[reverse].includes(floor)) return reverse;
    return null;
  }

  if (hallCalls.up.includes(floor)) return "up";
  if (hallCalls.down.includes(floor)) return "down";
  const up = nearestCallDistance(state, "up");
  const down = nearestCallDistance(state, "down");
  if (up === null && down === null) return null;
  if (down === null || (up !== null && up <= down)) return "up";
  return "down";
}

function shouldStopAt(state: ElevatorState, floor: number, direction: Direction) {
  return (
    state.cabinCalls.includes(floor) ||
    state.hallCalls[direction].includes(floor) ||
    (!hasCallsBeyond(state, floor, direction) && state.hallCalls[opposite(direction)].includes(floor))
  );
}

/** Clears the calls a stop answers: the cabin call, and only the hall call going `direction`. */
function serve(state: ElevatorState, direction: Direction | null): ElevatorState {
  const { floor } = state;
  return {
    ...state,
    direction,
    cabinCalls: removeFloor(state.cabinCalls, floor),
    hallCalls: direction
      ? { ...state.hallCalls, [direction]: removeFloor(state.hallCalls[direction], floor) }
      : state.hallCalls,
  };
}

function openDoors(state: ElevatorState, direction: Direction | null): ElevatorState {
  return { ...serve(state, direction), phase: "doorsOpening", elapsed: 0 };
}

/** While stopped with the doors in motion or open: answer a new call at this floor by holding the doors. */
function holdDoors(state: ElevatorState): ElevatorState {
  const { floor, hallCalls } = state;
  let direction = state.direction;
  let wanted = state.cabinCalls.includes(floor);

  if (direction) {
    wanted = wanted || hallCalls[direction].includes(floor);
  } else if (hallCalls.up.includes(floor)) {
    direction = "up";
    wanted = true;
  } else if (hallCalls.down.includes(floor)) {
    direction = "down";
    wanted = true;
  }

  if (!wanted) return state;

  const served = serve(state, direction);
  const { timing } = state;
  if (state.phase === "doorsOpen") return { ...served, elapsed: 0 };
  if (state.phase === "doorsClosing") {
    const openness = 1 - state.elapsed / timing.doorClosing;
    return { ...served, phase: "doorsOpening", elapsed: openness * timing.doorOpening };
  }
  return served;
}

type Advance = { state: ElevatorState; used: number; waiting: boolean };

function phaseDuration(state: ElevatorState) {
  switch (state.phase) {
    case "moving":
      return state.timing.floorTravel;
    case "doorsOpening":
      return state.timing.doorOpening;
    case "doorsOpen":
      return state.timing.doorDwell;
    case "doorsClosing":
      return state.timing.doorClosing;
    default:
      return Infinity;
  }
}

function advance(state: ElevatorState, budget: number): Advance {
  if (state.phase === "idle") {
    if (!hasCalls(state)) {
      const rested = state.direction === null ? state : { ...state, direction: null };
      return { state: rested, used: budget, waiting: true };
    }
    const direction = chooseDirection(state);
    const opensHere =
      state.cabinCalls.includes(state.floor) ||
      (direction !== null && state.hallCalls[direction].includes(state.floor));
    if (opensHere) return { state: openDoors(state, direction), used: 0, waiting: false };
    if (direction) {
      return { state: { ...state, phase: "moving", direction, elapsed: 0 }, used: 0, waiting: false };
    }
    return { state, used: budget, waiting: true };
  }

  if (state.phase !== "moving") {
    const held = holdDoors(state);
    if (held !== state) return { state: held, used: 0, waiting: false };
  }

  const left = phaseDuration(state) - state.elapsed;
  if (budget < left) {
    const next = budget > 0 ? { ...state, elapsed: state.elapsed + budget } : state;
    return { state: next, used: budget, waiting: true };
  }

  switch (state.phase) {
    case "moving": {
      const travel = state.direction as Direction;
      const arrived = { ...state, floor: state.floor + sign(travel), elapsed: 0 };
      if (shouldStopAt(arrived, arrived.floor, travel)) {
        return { state: openDoors(arrived, chooseDirection(arrived)), used: left, waiting: false };
      }
      if (hasCallsBeyond(arrived, arrived.floor, travel)) {
        return { state: arrived, used: left, waiting: false };
      }
      return { state: { ...arrived, phase: "idle" }, used: left, waiting: false };
    }
    case "doorsOpening":
      return { state: { ...state, phase: "doorsOpen", elapsed: 0 }, used: left, waiting: false };
    case "doorsOpen":
      return { state: { ...state, phase: "doorsClosing", elapsed: 0 }, used: left, waiting: false };
    default:
      return { state: { ...state, phase: "idle", elapsed: 0 }, used: left, waiting: false };
  }
}

/** Advances the simulation by `dt` milliseconds. Returns the same object when nothing changed. */
export function step(state: ElevatorState, dt: number): ElevatorState {
  let current = state;
  let budget = Math.max(0, dt);
  // Each pass either waits (consumes the rest of the budget) or completes a
  // phase; the cap only guards against a logic error looping forever.
  for (let pass = 0; pass < 1000; pass += 1) {
    const result = advance(current, budget);
    current = result.state;
    budget -= result.used;
    if (result.waiting) return current;
  }
  throw new Error("Elevator engine did not settle");
}

/** Continuous car position in floors, for rendering. */
export function carPosition(state: ElevatorState) {
  if (state.phase !== "moving" || !state.direction) return state.floor;
  return state.floor + (sign(state.direction) * state.elapsed) / state.timing.floorTravel;
}

/** How far open the doors are, from 0 (closed) to 1 (open). */
export function doorOpenness(state: ElevatorState) {
  switch (state.phase) {
    case "doorsOpening":
      return state.elapsed / state.timing.doorOpening;
    case "doorsOpen":
      return 1;
    case "doorsClosing":
      return 1 - state.elapsed / state.timing.doorClosing;
    default:
      return 0;
  }
}

/** The floor the moving car will stop at next, given the calls registered so far. */
export function nextStop(state: ElevatorState): number | null {
  if (state.phase !== "moving" || !state.direction) return null;
  const travel = state.direction;
  for (
    let floor = state.floor + sign(travel);
    floor >= state.bottomFloor && floor <= state.topFloor;
    floor += sign(travel)
  ) {
    if (shouldStopAt(state, floor, travel)) return floor;
  }
  return null;
}

export function describe(state: ElevatorState): string {
  switch (state.phase) {
    case "moving": {
      const target = nextStop(state);
      return target === null ? `Going ${state.direction}` : `Going ${state.direction} to floor ${target}`;
    }
    case "doorsOpening":
      return `Doors opening at floor ${state.floor}`;
    case "doorsOpen":
      return `Doors open at floor ${state.floor}`;
    case "doorsClosing":
      return "Doors closing";
    default:
      return `Waiting at floor ${state.floor}`;
  }
}
