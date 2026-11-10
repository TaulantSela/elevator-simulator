import React from "react";
import "./App.css";
import { describe, doorOpenness } from "./elevator/engine";
import { useElevator } from "./elevator/useElevator";

const FLOORS = [7, 6, 5, 4, 3, 2, 1];
const TOP_FLOOR = FLOORS[0];
const BOTTOM_FLOOR = FLOORS[FLOORS.length - 1];

function App() {
  const { state, callElevator, selectFloor } = useElevator({ bottomFloor: BOTTOM_FLOOR, topFloor: TOP_FLOOR });
  const doorsOpen = doorOpenness(state) > 0;

  return (
    <div className="app">
      <div className="elevator-card">
        <header className="elevator-header">
          <h1 className="title">Elevator Simulator</h1>
          <p className="status">{describe(state)}</p>
          <p className="status">Current floor: {state.floor}</p>
        </header>

        <div className="instructions">
          <p><strong>How to use:</strong></p>
          <ol>
            <li>Press ↑ or ↓ on your floor; if the elevator is already there, the doors open.</li>
            <li>When the status shows <q>Doors open</q>, tap your destination inside.</li>
            <li>The elevator serves active arrows in its travel direction before turning around.</li>
          </ol>
        </div>

        <div className="door-visual" aria-label="Elevator doors indicator">
          <button
            type="button"
            className={`door-icon${doorsOpen ? " open" : ""}`}
            disabled
            aria-pressed={doorsOpen}
          >
            <span className="door-panel left" aria-hidden="true" />
            <span className="door-panel right" aria-hidden="true" />
            <span className="door-icon-label">{doorsOpen ? "Doors Open" : "Doors Closed"}</span>
          </button>
        </div>

        <div className="elevator-body">
          <section className="floor-column" aria-label="Hall call buttons">
            {FLOORS.map((floor) => {
              const isCurrent = floor === state.floor;
              const isDoorOpen = doorsOpen && isCurrent;
              const upQueued = state.hallCalls.up.includes(floor);
              const downQueued = state.hallCalls.down.includes(floor);

              return (
                <div key={`hall-${floor}`} className={`floor-row${isCurrent ? " active" : ""}${isDoorOpen ? " door-open" : ""}`}>
                  <div className="floor-number-badge">{floor}</div>
                  <div className="hall-controls">
                    {floor !== TOP_FLOOR && (
                      <button
                        type="button"
                        className={`hall-button up${upQueued ? " queued" : ""}`}
                        onClick={() => callElevator(floor, "up")}
                        aria-pressed={upQueued}
                        aria-label={`Call elevator up from floor ${floor}`}
                      >
                        <span aria-hidden="true">↑</span>
                      </button>
                    )}
                    {floor !== BOTTOM_FLOOR && (
                      <button
                        type="button"
                        className={`hall-button down${downQueued ? " queued" : ""}`}
                        onClick={() => callElevator(floor, "down")}
                        aria-pressed={downQueued}
                        aria-label={`Call elevator down from floor ${floor}`}
                      >
                        <span aria-hidden="true">↓</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="cabin-panel" aria-label="Cabin destination panel">
            <div className="panel-grid">
              {FLOORS.map((floor) => {
                const isQueued = state.cabinCalls.includes(floor);
                const isCurrent = state.floor === floor;

                return (
                  <button
                    key={`panel-${floor}`}
                    type="button"
                    className={`panel-button${isQueued ? " queued" : ""}${isCurrent ? " current" : ""}`}
                    onClick={() => selectFloor(floor)}
                    aria-pressed={isQueued}
                  >
                    {floor}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
