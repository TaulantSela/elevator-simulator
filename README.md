# 🛗 Elevator Simulator

A single elevator car you drive from the browser: call it from any of seven
floors, choose destinations on the cabin panel, hold or close the doors, and
watch how it decides where to go next. Built with React and TypeScript.

**▶ [Try it live →](https://elevator-simulator-system.vercel.app/)** — press
↑ or ↓ on a floor to call the car.

It behaves like a real collective-control elevator rather than a box that
chases the last button pressed: it keeps going while there is a call ahead,
answers each hall arrow only for the direction it asks for, and shows you its
plan before it gets there.

## Features

- **Collective-control dispatcher (LOOK)**: the car answers every call in its
  direction of travel, then turns around at the last one.
- **Per-direction hall arrows**: a down call isn't cleared by a car heading up.
- **Next stops**: the order the car will serve its calls in, with an arrow on
  each stop that answers a hall call.
- **Animated shaft** with a moving car and sliding doors, plus a lobby-style
  floor and direction indicator and a status line ("Going up to floor 5").
- **Door buttons**: open holds the doors or reopens them mid-close; close skips
  the rest of the dwell. Doors also close on their own and reopen for a
  same-direction call.
- **Passenger mode**: people arrive at random floors (light, about 4 a minute,
  or busy, about 10), ride to their destination, and the stats track
  deliveries, average wait, average trip and the longest wait.
- **Pause** and **1× / 2× / 4×** speed. Presses still register while paused.
- **Works on phones**: the status stays pinned at the top and the cabin panel
  at the bottom.

## How it works

The car is a pure state machine in `src/elevator/engine.ts`. Its state is the
current floor, a phase (`idle`, `moving`, `doorsOpening`, `doorsOpen`,
`doorsClosing`), a direction, the cabin calls, and two separate lists of hall
calls, one for ↑ and one for ↓. `step(state, dt)` advances it by `dt`
milliseconds; `pressHall`, `pressCabin`, `pressDoorOpen` and `pressDoorClose`
register presses.

The dispatcher follows three rules:

1. **Leaving a floor.** A car that already has a direction keeps it while any
   call lies further that way (or a hall call for that direction waits right
   here). Otherwise it reverses if there is anything the other way, or rests
   with no direction. A resting car takes a hall arrow at its own floor first,
   then heads for the nearest call; ties go up.
2. **Stopping on the way.** At each floor it reaches, the car stops for a
   cabin call or a hall call in its direction of travel. A hall call for the
   opposite direction only stops it when nothing lies further ahead: that is
   where it turns around.
3. **Clearing calls.** A stop clears the cabin call and only the hall arrow
   for the direction the car leaves in. The other arrow stays lit for the
   return trip.

For example, with the car at floor 1 and calls at 3↓ and 5↓, it passes 3 on
the way up (that call wants to go down), answers 5↓, then stops at 3 on the
way down.

Doors take 1 s to open, stay open for 2.5 s and take 1 s to close; travel is
1.5 s per floor. While the car is stopped, a new call it can answer from this
floor holds the doors: open doors restart their dwell, and closing doors turn
around from wherever they are, without counting as a second stop.

Around the engine:

- **Next stops** come from `plannedStops`, which runs the engine forward on a
  copy one phase at a time, so the plan can't disagree with what the car does.
- **Passengers** (`src/elevator/passengers.ts`) are pure functions too.
  Traffic follows an office pattern: 40% go from the lobby up, 40% come down
  to the lobby, 20% travel between upper floors. Passengers press the hall
  arrow for their direction, board only when the doors open going their way,
  press their floor once inside, and keep their buttons pressed, so doors
  closed early never strand anyone. Arrivals come from a seeded random number
  generator kept in the state, so a run is reproducible from its seed.
- **The loop** (`src/elevator/useSimulation.ts`) drives both with
  `requestAnimationFrame`, only while something is happening, scaled by the
  speed setting. A frame longer than 100 ms (a background tab) counts as
  100 ms, so the car pauses instead of jumping several floors.

Because nothing in the engine owns a timer, the tests run whole scenarios in
fixed steps, including twenty simulated minutes of busy traffic.

## Run locally

Built with Vite, React 19 and TypeScript, tested with Vitest. No environment
variables needed.

```bash
npm install
npm run dev      # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on http://localhost:3000 |
| `npm test` | Run the tests once (`npm run test:watch` re-runs them on changes) |
| `npm run typecheck` | Type-check with TypeScript 7 |
| `npm run lint` | Lint with ESLint |
| `npm run build` | Type-check and build the static site into `dist/`, ready for Vercel or any static host |
| `npm run preview` | Serve the built `dist/` locally |
