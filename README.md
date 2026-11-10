# Elevator Simulator

An elevator simulator built with React. Use it to visualize hall-call priorities, cabin selections, and dynamic door behavior.

https://elevator-simulator-system.vercel.app/

## Getting Started

```bash
npm install
npm start
```

The simulator runs at [http://localhost:3000](http://localhost:3000).

## Production Build

```bash
npm run build
```

The optimized bundle is emitted to `build/` and is ready for hosting (e.g. Vercel or any static host).

## Key Features

- Collective-control dispatcher (LOOK): the car answers every call in its direction of travel, then turns around at the last one
- Hall arrows are answered per direction, so a down call isn't cleared by a car heading up
- Animated shaft with a moving car and sliding doors, plus a lobby-style floor and direction indicator
- "Next stops" shows the order the car will serve its calls in
- Door open and close buttons; doors also close on their own and reopen for a same-direction call
- Passenger mode: people arrive at random floors (light or busy traffic), ride to their destination, and the stats track deliveries, average wait, average trip and the longest wait
- Pause and 1× / 2× / 4× speed
- Works on phones: the status stays pinned at the top and the cabin panel at the bottom

## How it works

- `src/elevator/engine.ts` is the elevator as a pure state machine: `step(state, dt)` advances it by `dt` milliseconds, and `pressHall`, `pressCabin`, `pressDoorOpen` and `pressDoorClose` register presses. `plannedStops` runs it forward on a copy to predict the stops.
- `src/elevator/passengers.ts` layers simulated passengers on top, also as pure functions. Arrivals come from a seeded random number generator kept in the state, so a run is reproducible from its seed.
- `src/elevator/useSimulation.ts` drives both with `requestAnimationFrame`, only while something is happening, scaled by the speed setting.

Because nothing in the engine owns a timer, the tests run whole scenarios in fixed steps, including twenty simulated minutes of busy traffic.

## Scripts

- `npm test` – run the tests in watch mode (`CI=true npm test` runs them once)
- `npm run eject` – copy CRA configs locally (irreversible)

## License

MIT
