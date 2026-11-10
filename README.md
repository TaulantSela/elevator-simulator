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
- Doors close on their own and reopen for a same-direction call while closing
- Works on phones: the status stays pinned at the top and the cabin panel at the bottom

## How it works

The engine in `src/elevator/engine.ts` is a pure state machine: `step(state, dt)` advances the simulation by `dt` milliseconds and `pressHall` / `pressCabin` register calls. The `useElevator` hook drives it with `requestAnimationFrame` only while the car has work. Because the engine owns no timers, the tests in `src/elevator/engine.test.ts` run whole scenarios in fixed steps.

## Scripts

- `npm test` – run the tests in watch mode (`CI=true npm test` runs them once)
- `npm run eject` – copy CRA configs locally (irreversible)

## License

MIT
