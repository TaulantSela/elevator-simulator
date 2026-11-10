import {
  carPosition,
  createElevator,
  describe as describeState,
  doorOpenness,
  ElevatorState,
  isSettled,
  plannedStops,
  pressCabin,
  pressDoorClose,
  pressDoorOpen,
  pressHall,
  step,
} from "./engine";

type Action = [atMs: number, apply: (state: ElevatorState) => ElevatorState];

const TICK = 50;

/**
 * Runs the engine in fixed ticks, applying each action at its time, until the
 * car settles. Records every stop as "<floor><departure arrow>", e.g. "4↑".
 */
function simulate(actions: Action[], start: ElevatorState = createElevator(), limitMs = 120_000) {
  const queue = [...actions].sort((a, b) => a[0] - b[0]);
  let state = start;
  let time = 0;
  const stops: string[] = [];
  let reopens = 0;
  let movedWithDoorsOpen = false;

  while (time <= limitMs) {
    while (queue.length && queue[0][0] <= time) state = queue.shift()![1](state);

    const before = state;
    state = step(state, TICK);
    time += TICK;

    const startedDoorCycle =
      (before.phase === "idle" || before.phase === "moving") && state.phase === "doorsOpening";
    if (startedDoorCycle) {
      const arrow = state.direction === "up" ? "↑" : state.direction === "down" ? "↓" : "";
      stops.push(`${state.floor}${arrow}`);
    }
    if (before.phase === "doorsClosing" && state.phase === "doorsOpening") reopens += 1;
    if (doorOpenness(state) > 0 && !Number.isInteger(carPosition(state))) movedWithDoorsOpen = true;

    if (!queue.length && isSettled(state)) break;
  }

  return { state, time, stops, reopens, movedWithDoorsOpen };
}

const hall = (floor: number, direction: "up" | "down") => (state: ElevatorState) =>
  pressHall(state, floor, direction);
const cabin = (floor: number) => (state: ElevatorState) => pressCabin(state, floor);
const floors = (stops: string[]) => stops.map((stop) => parseInt(stop, 10));

describe("dispatching", () => {
  test("answers a down call from above the car", () => {
    const run = simulate([[0, hall(5, "down")]]);
    expect(floors(run.stops)).toEqual([5]);
    expect(run.state.floor).toBe(5);
    expect(run.state.hallCalls).toEqual({ up: [], down: [] });
  });

  test("answers an up call from below the car", () => {
    const run = simulate([[0, hall(2, "up")]], createElevator({ startFloor: 7 }));
    expect(floors(run.stops)).toEqual([2]);
    expect(run.state.floor).toBe(2);
  });

  test("opens the doors once per stop", () => {
    const run = simulate([[0, cabin(3)]]);
    expect(run.stops).toEqual(["3"]);
    // Two floors of travel plus one door cycle, not two.
    expect(run.time).toBeLessThanOrEqual(2 * 1500 + 1000 + 2500 + 1000 + TICK);
  });

  test("keeps its travel direction before turning around", () => {
    // Going up to 3 and 6; someone at 3 asks for 2 while the doors are open.
    const run = simulate([
      [0, cabin(3)],
      [0, cabin(6)],
      [3500, cabin(2)],
    ]);
    expect(floors(run.stops)).toEqual([3, 6, 2]);
  });

  test("picks the nearest call when it has no travel direction", () => {
    const run = simulate(
      [
        [0, cabin(6)],
        [0, cabin(3)],
      ],
      createElevator({ startFloor: 4 })
    );
    expect(floors(run.stops)).toEqual([3, 6]);
  });

  test("stops for an opposite-direction call only when turning around", () => {
    // 3↓ is on the way up to 5↓, but the car only answers it on the way down.
    const run = simulate([
      [0, hall(3, "down")],
      [0, hall(5, "down")],
    ]);
    expect(run.stops).toEqual(["5↓", "3↓"]);
  });
});

describe("hall calls", () => {
  test("only clears the arrow the stop is answering", () => {
    const run = simulate([
      [0, hall(4, "up")],
      [0, hall(4, "down")],
      [0, cabin(6)],
    ]);
    expect(run.stops).toEqual(["4↑", "6↓", "4↓"]);
  });

  test("keeps an opposite-direction call pressed while the doors close", () => {
    // Doors at 4 start closing at 3500ms, with the car about to leave for 6.
    const run = simulate(
      [
        [0, hall(4, "up")],
        [0, cabin(6)],
        [3800, hall(4, "down")],
      ],
      createElevator({ startFloor: 4 })
    );
    expect(run.reopens).toBe(0);
    expect(run.stops).toEqual(["4↑", "6↓", "4↓"]);
  });

  test("ignores calls that cannot exist", () => {
    const state = createElevator();
    expect(pressHall(state, 7, "up")).toBe(state);
    expect(pressHall(state, 1, "down")).toBe(state);
    expect(pressHall(state, 9, "down")).toBe(state);
    expect(pressCabin(state, 0)).toBe(state);
    expect(pressCabin(state, 2.5)).toBe(state);
  });

  test("ignores a repeated press", () => {
    const once = pressHall(createElevator(), 3, "up");
    expect(pressHall(once, 3, "up")).toBe(once);
  });
});

describe("doors", () => {
  test("never open while the car is between floors", () => {
    // Calling the car to its own floor, then choosing a floor right away.
    const run = simulate([
      [0, hall(1, "up")],
      [300, cabin(5)],
    ]);
    expect(run.movedWithDoorsOpen).toBe(false);
    expect(run.stops).toEqual(["1↑", "5"]);
  });

  test("close on their own after the dwell time", () => {
    const run = simulate([[0, hall(1, "up")]]);
    expect(run.stops).toEqual(["1↑"]);
    expect(run.state.phase).toBe("idle");
    expect(doorOpenness(run.state)).toBe(0);
    expect(run.time).toBeLessThanOrEqual(1000 + 2500 + 1000 + TICK);
  });

  test("reopen for a same-direction call while closing, without a second stop", () => {
    const run = simulate([
      [0, hall(4, "up")],
      [3800, hall(4, "up")],
    ], createElevator({ startFloor: 4 }));
    expect(run.reopens).toBe(1);
    expect(run.stops).toEqual(["4↑"]);
    expect(run.state.hallCalls.up).toEqual([]);
  });

  test("stay open longer when the floor's own cabin button is pressed", () => {
    let state = step(pressHall(createElevator(), 1, "up"), 2000); // fully open
    expect(state.phase).toBe("doorsOpen");
    state = step(pressCabin(state, 1), 2000); // dwell restarts, so still open
    expect(state.phase).toBe("doorsOpen");
  });
});

describe("door buttons", () => {
  const openAtFloor1 = () => step(pressHall(createElevator(), 1, "up"), 2000); // fully open, dwell running

  test("close skips the rest of the dwell", () => {
    const run = simulate([[0, pressDoorClose]], openAtFloor1());
    expect(run.state.phase).toBe("idle");
    expect(run.time).toBeLessThanOrEqual(1000 + TICK);
  });

  test("close turns opening doors around from where they are", () => {
    const halfOpen = step(pressHall(createElevator(), 1, "up"), 500);
    const closing = pressDoorClose(halfOpen);
    expect(closing.phase).toBe("doorsClosing");
    expect(doorOpenness(closing)).toBeCloseTo(doorOpenness(halfOpen));
  });

  test("open reopens closing doors from where they are", () => {
    const closing = step(openAtFloor1(), 1500 + 300); // 1000ms into the dwell, so 300ms into closing
    expect(closing.phase).toBe("doorsClosing");
    const reopened = pressDoorOpen(closing);
    expect(reopened.phase).toBe("doorsOpening");
    expect(doorOpenness(reopened)).toBeCloseTo(doorOpenness(closing));
  });

  test("open holds the doors while they are open", () => {
    const held = step(pressDoorOpen(openAtFloor1()), 2000);
    expect(held.phase).toBe("doorsOpen");
  });

  test("open works while stopped with no calls, and does nothing while moving", () => {
    const opened = pressDoorOpen(createElevator());
    expect(opened.phase).toBe("doorsOpening");
    expect(isSettled(step(opened, 10_000))).toBe(true);

    const moving = step(pressCabin(createElevator(), 4), 500);
    expect(pressDoorOpen(moving)).toBe(moving);
    expect(pressDoorClose(moving)).toBe(moving);
  });
});

describe("planned stops", () => {
  test("list the stops in the order the car will make them", () => {
    let state = pressCabin(pressCabin(createElevator(), 3), 6);
    state = step(state, 3000 + 500); // doors opening at 3
    state = pressCabin(state, 2);
    expect(plannedStops(state)).toEqual([
      { floor: 6, hall: null },
      { floor: 2, hall: null },
    ]);
  });

  test("mark the hall arrow each stop answers", () => {
    let state = createElevator();
    state = pressHall(state, 4, "up");
    state = pressHall(state, 4, "down");
    state = pressCabin(state, 6);
    expect(plannedStops(state)).toEqual([
      { floor: 4, hall: "up" },
      { floor: 6, hall: null },
      { floor: 4, hall: "down" },
    ]);
  });

  test("match what the car actually does", () => {
    let start = createElevator({ startFloor: 3 });
    start = pressHall(start, 5, "down");
    start = pressHall(start, 2, "down");
    start = pressCabin(start, 7);
    start = pressHall(start, 6, "up");

    const predicted = plannedStops(start).map((stop) => stop.floor);
    expect(predicted).toEqual([2, 6, 7, 5]);
    expect(floors(simulate([], start).stops)).toEqual(predicted);
  });

  test("are empty when there is nothing to do", () => {
    expect(plannedStops(createElevator())).toEqual([]);
  });
});

describe("state", () => {
  test("returns the same object when nothing changes", () => {
    const state = createElevator();
    expect(step(state, 1000)).toBe(state);
  });

  test("describes the next stop while moving", () => {
    let state = step(pressCabin(createElevator(), 5), 100);
    expect(describeState(state)).toBe("Going up to floor 5");
    state = pressCabin(state, 3);
    expect(describeState(state)).toBe("Going up to floor 3");
  });

  test("moves smoothly between floors", () => {
    const state = step(pressCabin(createElevator(), 2), 750);
    expect(carPosition(state)).toBeCloseTo(1.5);
  });
});
