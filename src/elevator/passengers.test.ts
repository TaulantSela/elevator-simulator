import { pressDoorClose } from "./engine";
import {
  addPassenger,
  createSimulation,
  isSimulationSettled,
  Simulation,
  stepSimulation,
} from "./passengers";

const TICK = 50;

function run(sim: Simulation, ms: number) {
  let current = sim;
  for (let time = 0; time < ms; time += TICK) current = stepSimulation(current, TICK);
  return current;
}

function runUntil(sim: Simulation, done: (sim: Simulation) => boolean, limitMs = 600_000) {
  let current = sim;
  for (let time = 0; time < limitMs && !done(current); time += TICK) current = stepSimulation(current, TICK);
  if (!done(current)) throw new Error("condition never met");
  return current;
}

/** Stops new arrivals and runs until everyone has been delivered. */
const drain = (sim: Simulation) => runUntil({ ...sim, traffic: "off" }, isSimulationSettled);

describe("passengers", () => {
  test("board only when the car is going their way", () => {
    let sim = createSimulation();
    sim = addPassenger(sim, 4, 6); // up
    sim = addPassenger(sim, 4, 2); // down

    sim = runUntil(sim, (s) => s.riding.length > 0);
    expect(sim.riding.map((p) => p.destination)).toEqual([6]);
    expect(sim.waiting.map((p) => p.destination)).toEqual([2]);

    // The down passenger is still waiting when the first one arrives at 6...
    sim = runUntil(sim, (s) => s.stats.delivered === 1);
    expect(sim.waiting.map((p) => p.destination)).toEqual([2]);

    // ...and gets picked up on the way back down.
    sim = drain(sim);
    expect(sim.stats.delivered).toBe(2);
  });

  test("aren't stranded when the doors are closed early", () => {
    let sim = addPassenger(createSimulation(), 3, 5);
    sim = runUntil(sim, (s) => s.elevator.floor === 3 && s.elevator.phase === "doorsOpening");
    sim = { ...sim, elevator: pressDoorClose(sim.elevator) };
    sim = drain(sim);
    expect(sim.stats.delivered).toBe(1);
  });

  test("ride from their floor to their destination", () => {
    let sim = addPassenger(createSimulation({ startFloor: 7 }), 2, 5);
    sim = runUntil(sim, (s) => s.riding.length === 1);
    expect(sim.elevator.floor).toBe(2);
    sim = runUntil(sim, (s) => s.stats.delivered === 1);
    expect(sim.elevator.floor).toBe(5);
  });

  test("ignore impossible trips", () => {
    const sim = createSimulation();
    expect(addPassenger(sim, 3, 3)).toBe(sim);
    expect(addPassenger(sim, 0, 3)).toBe(sim);
    expect(addPassenger(sim, 3, 8)).toBe(sim);
  });

  test("record wait and trip times", () => {
    let sim = addPassenger(createSimulation(), 1, 3);
    sim = drain(sim);
    // Doors open at once on floor 1, then two floors of travel and a door opening.
    expect(sim.stats.totalWait).toBeLessThanOrEqual(1000 + TICK);
    expect(sim.stats.totalTrip).toBeGreaterThanOrEqual(1000 + 2500 + 1000 + 2 * 1500 + 1000);
    expect(sim.stats.longestWait).toBe(sim.stats.totalWait);
  });
});

describe("traffic", () => {
  test("delivers everyone who arrived once it stops", () => {
    let sim = run(createSimulation({ seed: 7, traffic: "busy" }), 10 * 60_000);
    sim = drain(sim);
    expect(sim.waiting).toEqual([]);
    expect(sim.riding).toEqual([]);
    expect(sim.stats.delivered).toBe(sim.nextId - 1);
    expect(sim.stats.delivered).toBeGreaterThan(50);
  });

  test("keeps up with busy traffic", () => {
    for (const seed of [1, 2, 3]) {
      const sim = run(createSimulation({ seed, traffic: "busy" }), 20 * 60_000);
      // Nobody piles up: a growing queue would mean the car can't keep up.
      expect(sim.waiting.length).toBeLessThan(10);
      expect(sim.stats.totalWait / sim.stats.delivered).toBeLessThan(30_000);
    }
  });

  test("is reproducible from its seed", () => {
    const a = run(createSimulation({ seed: 42, traffic: "light" }), 5 * 60_000);
    const b = run(createSimulation({ seed: 42, traffic: "light" }), 5 * 60_000);
    expect(a.stats).toEqual(b.stats);
    expect(a.stats.delivered).toBeGreaterThan(0);
  });

  test("generates only real trips", () => {
    let sim = createSimulation({ seed: 3, traffic: "busy" });
    const arrivals = new Map<number, { origin: number; destination: number }>();
    for (let time = 0; time < 30 * 60_000; time += TICK) {
      sim = stepSimulation(sim, TICK);
      for (const passenger of sim.waiting) arrivals.set(passenger.id, passenger);
    }
    const trips = Array.from(arrivals.values());
    expect(trips.length).toBeGreaterThan(100);
    expect(trips.filter((trip) => trip.origin === trip.destination)).toEqual([]);
    expect(trips.filter((trip) => trip.origin < 1 || trip.origin > 7 || trip.destination < 1 || trip.destination > 7)).toEqual([]);
    // Both directions and some upper-floor-to-upper-floor trips occur.
    expect(new Set(trips.map((trip) => (trip.destination > trip.origin ? "up" : "down")))).toEqual(new Set(["up", "down"]));
    expect(trips.some((trip) => trip.origin > 1 && trip.destination > 1)).toBe(true);
  });

  test("leave a settled simulation untouched", () => {
    const sim = createSimulation();
    expect(stepSimulation(sim, 1000)).toBe(sim);
  });
});
