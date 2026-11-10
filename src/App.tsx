import React, { useMemo } from "react";
import "./App.css";
import { Building } from "./components/Building";
import { CabinPanel } from "./components/CabinPanel";
import { StatusHeader } from "./components/StatusHeader";
import { carPosition, describe, doorOpenness, plannedStops } from "./elevator/engine";
import { useElevator } from "./elevator/useElevator";

const BOTTOM_FLOOR = 1;
const TOP_FLOOR = 7;
/** Top floor first: the order the floors appear on screen. */
const FLOORS = Array.from({ length: TOP_FLOOR - BOTTOM_FLOOR + 1 }, (_, index) => TOP_FLOOR - index);

function App() {
  const { state, callElevator, selectFloor, openDoors, closeDoors } = useElevator({
    bottomFloor: BOTTOM_FLOOR,
    topFloor: TOP_FLOOR,
  });
  const position = carPosition(state);
  const plan = useMemo(() => plannedStops(state), [state]);

  return (
    <div className="app">
      <div className="elevator-card">
        <StatusHeader floor={Math.round(position)} direction={state.direction} status={describe(state)} plan={plan} />

        <ol className="instructions">
          <li>Press ↑ or ↓ on a floor to call the car.</li>
          <li>When its doors open, choose a destination on the cabin panel.</li>
          <li>The car answers every call in its direction of travel before turning around.</li>
        </ol>

        <main className="elevator-body">
          <Building
            floors={FLOORS}
            elevator={state}
            position={position}
            openness={doorOpenness(state)}
            onCall={callElevator}
          />
          <CabinPanel
            floors={FLOORS}
            elevator={state}
            onSelect={selectFloor}
            onOpenDoors={openDoors}
            onCloseDoors={closeDoors}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
