import React, { useEffect, useMemo } from "react";
import "./App.css";
import { Building } from "./components/Building";
import { CabinPanel } from "./components/CabinPanel";
import { Instructions, markInstructionsSeen } from "./components/Instructions";
import { StatusHeader } from "./components/StatusHeader";
import { TrafficStats } from "./components/TrafficStats";
import { Toolbar } from "./components/Toolbar";
import { carPosition, describe, doorOpenness, hasCalls, plannedStops } from "./elevator/engine";
import { useSimulation } from "./elevator/useSimulation";

const BOTTOM_FLOOR = 1;
const TOP_FLOOR = 7;
/** Top floor first: the order the floors appear on screen. */
const FLOORS = Array.from({ length: TOP_FLOOR - BOTTOM_FLOOR + 1 }, (_, index) => TOP_FLOOR - index);

function App({ seed }: { seed?: number }) {
  const {
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
  } = useSimulation({ bottomFloor: BOTTOM_FLOOR, topFloor: TOP_FLOOR, ...(seed === undefined ? {} : { seed }) });
  const state = sim.elevator;
  const showStats = sim.traffic !== "off" || sim.stats.delivered > 0 || sim.waiting.length > 0 || sim.riding.length > 0;
  const position = carPosition(state);
  const plan = useMemo(() => plannedStops(state), [state]);
  const status = paused ? `Paused · ${describe(state)}` : describe(state);

  useEffect(() => {
    if (hasCalls(state)) markInstructionsSeen();
  }, [state]);

  return (
    <div className="app">
      <div className="elevator-card">
        <StatusHeader floor={Math.round(position)} direction={state.direction} status={status} plan={plan} />

        <Instructions>
          <li>Press ↑ or ↓ on a floor to call the car.</li>
          <li>When its doors open, choose a destination on the cabin panel. The door buttons below it hold the doors open or close them early.</li>
          <li>The car answers every call in its direction of travel before turning around. <q>Next stops</q> shows its plan.</li>
          <li>Turn on <q>Passengers</q> to watch it handle traffic: people arrive at random floors, ride, and the panel tracks how long they wait.</li>
        </Instructions>

        <Toolbar
          paused={paused}
          onPausedChange={setPaused}
          speed={speed}
          onSpeedChange={setSpeed}
          traffic={sim.traffic}
          onTrafficChange={setTraffic}
        />

        <main className="elevator-body">
          <Building
            floors={FLOORS}
            elevator={state}
            position={position}
            openness={doorOpenness(state)}
            waiting={sim.waiting}
            riding={sim.riding}
            onCall={callElevator}
          />
          <CabinPanel
            floors={FLOORS}
            elevator={state}
            onSelect={selectFloor}
            onOpenDoors={openDoors}
            onCloseDoors={closeDoors}
          />
          {showStats && <TrafficStats sim={sim} onReset={resetStats} />}
        </main>
      </div>
    </div>
  );
}

export default App;
