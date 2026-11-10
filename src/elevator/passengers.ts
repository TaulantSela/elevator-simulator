// Simulated passengers on top of the elevator engine.
//
// Like the engine this is pure: `stepSimulation(sim, dt)` returns the next
// state. Arrivals come from a seeded random number generator kept in the
// state, so a run is reproducible from its seed.
//
// Passengers behave the way people do: they press the hall arrow for their
// direction, board only when the car opens its doors going their way (or
// with no direction announced), press their floor once inside, and leave
// when the car opens its doors there. Anyone still waiting keeps their
// button pressed, so a door closed early never strands them.

import { createElevator, Direction, ElevatorState, isSettled, pressCabin, pressHall, step } from "./engine";

export type TrafficLevel = "off" | "light" | "busy";

/** Average arrivals per minute of simulated time. */
export const ARRIVALS_PER_MINUTE: Record<TrafficLevel, number> = { off: 0, light: 4, busy: 10 };

export type Passenger = {
  readonly id: number;
  readonly origin: number;
  readonly destination: number;
  readonly arrivedAt: number;
  readonly boardedAt: number | null;
};

export type TripStats = {
  readonly delivered: number;
  /** Arrival at the hall until boarding, summed over delivered passengers, in ms. */
  readonly totalWait: number;
  /** Arrival at the hall until reaching the destination, summed, in ms. */
  readonly totalTrip: number;
  readonly longestWait: number;
};

export type Simulation = {
  readonly elevator: ElevatorState;
  readonly traffic: TrafficLevel;
  /** Simulated milliseconds since the start. */
  readonly time: number;
  readonly seed: number;
  readonly nextId: number;
  readonly waiting: readonly Passenger[];
  readonly riding: readonly Passenger[];
  readonly stats: TripStats;
};

export const EMPTY_STATS: TripStats = { delivered: 0, totalWait: 0, totalTrip: 0, longestWait: 0 };

type Options = Parameters<typeof createElevator>[0] & { seed?: number; traffic?: TrafficLevel };

export function createSimulation({ seed = 1, traffic = "off", ...elevatorOptions }: Options = {}): Simulation {
  return {
    elevator: createElevator(elevatorOptions),
    traffic,
    time: 0,
    seed,
    nextId: 1,
    waiting: [],
    riding: [],
    stats: EMPTY_STATS,
  };
}

export const tripDirection = (passenger: Passenger): Direction =>
  passenger.destination > passenger.origin ? "up" : "down";

/** mulberry32: returns a number in [0, 1) and the next seed. */
function random(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/**
 * Office-building traffic: 40% leave the lobby for an upper floor, 40% head
 * down to the lobby, and 20% travel between upper floors.
 */
function pickTrip(seed: number, bottom: number, top: number) {
  const [kind, s1] = random(seed);
  const [a, s2] = random(s1);
  const [b, s3] = random(s2);
  const upperFloors = top - bottom;
  const upper = (roll: number) => bottom + 1 + Math.floor(roll * upperFloors);

  if (kind < 0.4 || upperFloors < 2) return { origin: bottom, destination: upper(a), seed: s3 };
  if (kind < 0.8) return { origin: upper(a), destination: bottom, seed: s3 };

  const origin = upper(a);
  // Pick among the other upper floors.
  const offset = 1 + Math.floor(b * (upperFloors - 1));
  const destination = bottom + 1 + ((origin - bottom - 1 + offset) % upperFloors);
  return { origin, destination, seed: s3 };
}

const isFloor = (elevator: ElevatorState, floor: number) =>
  Number.isInteger(floor) && floor >= elevator.bottomFloor && floor <= elevator.topFloor;

/** Adds one passenger waiting at `origin`. */
export function addPassenger(sim: Simulation, origin: number, destination: number): Simulation {
  if (origin === destination || !isFloor(sim.elevator, origin) || !isFloor(sim.elevator, destination)) return sim;
  const passenger: Passenger = { id: sim.nextId, origin, destination, arrivedAt: sim.time, boardedAt: null };
  return { ...sim, nextId: sim.nextId + 1, waiting: [...sim.waiting, passenger] };
}

/** True while the car is at `floor` with its doors opening or open, going `direction` or announcing none. */
function doorsOpenFor(elevator: ElevatorState, floor: number, direction: Direction | null) {
  return (
    elevator.floor === floor &&
    (elevator.phase === "doorsOpening" || elevator.phase === "doorsOpen") &&
    (direction === null || elevator.direction === null || elevator.direction === direction)
  );
}

export function isSimulationSettled(sim: Simulation) {
  return sim.traffic === "off" && sim.waiting.length === 0 && sim.riding.length === 0 && isSettled(sim.elevator);
}

export function stepSimulation(sim: Simulation, dt: number): Simulation {
  if (sim.traffic === "off" && sim.waiting.length === 0 && sim.riding.length === 0) {
    const elevator = step(sim.elevator, dt);
    return elevator === sim.elevator ? sim : { ...sim, elevator, time: sim.time + dt };
  }

  let next: Simulation = { ...sim, time: sim.time + dt };

  // A new arrival, at most one per step.
  if (dt > 0 && next.traffic !== "off") {
    const chance = 1 - Math.exp((-ARRIVALS_PER_MINUTE[next.traffic] / 60_000) * dt);
    const [roll, seed] = random(next.seed);
    next = { ...next, seed };
    if (roll < chance) {
      const trip = pickTrip(next.seed, next.elevator.bottomFloor, next.elevator.topFloor);
      next = addPassenger({ ...next, seed: trip.seed }, trip.origin, trip.destination);
    }
  }

  // Everyone keeps their button pressed until the car is there for them.
  let elevator = next.elevator;
  for (const passenger of next.waiting) {
    if (!doorsOpenFor(elevator, passenger.origin, tripDirection(passenger))) {
      elevator = pressHall(elevator, passenger.origin, tripDirection(passenger));
    }
  }
  for (const passenger of next.riding) {
    if (!doorsOpenFor(elevator, passenger.destination, null)) elevator = pressCabin(elevator, passenger.destination);
  }

  elevator = step(elevator, dt);
  let { waiting, riding, stats } = next;

  // Once the doors are fully open, riders for this floor leave and people
  // going the car's way get on.
  if (elevator.phase === "doorsOpen") {
    const { floor, direction } = elevator;
    const leaving = riding.filter((passenger) => passenger.destination === floor);
    if (leaving.length) {
      riding = riding.filter((passenger) => passenger.destination !== floor);
      for (const passenger of leaving) {
        const wait = (passenger.boardedAt ?? next.time) - passenger.arrivedAt;
        stats = {
          delivered: stats.delivered + 1,
          totalWait: stats.totalWait + wait,
          totalTrip: stats.totalTrip + (next.time - passenger.arrivedAt),
          longestWait: Math.max(stats.longestWait, wait),
        };
      }
    }

    const boarding = waiting.filter(
      (passenger) => passenger.origin === floor && (direction === null || tripDirection(passenger) === direction)
    );
    if (boarding.length) {
      waiting = waiting.filter((passenger) => !boarding.includes(passenger));
      riding = [...riding, ...boarding.map((passenger) => ({ ...passenger, boardedAt: next.time }))];
      for (const passenger of boarding) elevator = pressCabin(elevator, passenger.destination);
    }
  }

  return { ...next, elevator, waiting, riding, stats };
}
