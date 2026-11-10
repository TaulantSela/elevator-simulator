import React, { CSSProperties } from "react";
import "./App.css";
import { carPosition, describe, doorOpenness } from "./elevator/engine";
import { useElevator } from "./elevator/useElevator";

const BOTTOM_FLOOR = 1;
const TOP_FLOOR = 7;
/** Top floor first: the order the floors appear on screen. */
const FLOORS = Array.from({ length: TOP_FLOOR - BOTTOM_FLOOR + 1 }, (_, index) => TOP_FLOOR - index);

/**
 * Cabin buttons placed like a real two-column panel: ascending from the
 * bottom, odd floors on the left, a lone top floor centred.
 */
const PANEL_BUTTONS = (() => {
  const ascending = [...FLOORS].reverse();
  const rows = Math.ceil(ascending.length / 2);
  return ascending.map((floor, index) => {
    const isLoneTop = index === ascending.length - 1 && index % 2 === 0;
    return {
      floor,
      gridRow: rows - Math.floor(index / 2),
      gridColumn: isLoneTop ? "1 / span 2" : String((index % 2) + 1),
    };
  });
})();

function App() {
  const { state, callElevator, selectFloor } = useElevator({ bottomFloor: BOTTOM_FLOOR, topFloor: TOP_FLOOR });
  const position = carPosition(state);
  const openness = doorOpenness(state);
  const shownFloor = Math.round(position);
  const stopped = state.phase !== "moving";

  return (
    <div className="app">
      <div className="elevator-card">
        <header className="elevator-header">
          <h1 className="title">Elevator Simulator</h1>
          <div className="readout">
            <div className="indicator" aria-hidden="true">
              <span className="indicator-arrows">
                <span className={state.direction === "up" ? "lit" : undefined}>▲</span>
                <span className={state.direction === "down" ? "lit" : undefined}>▼</span>
              </span>
              <span className="indicator-floor">{shownFloor}</span>
            </div>
            <p className="status" role="status">
              {describe(state)}
            </p>
          </div>
        </header>

        <ol className="instructions">
          <li>Press ↑ or ↓ on a floor to call the car.</li>
          <li>When its doors open, choose a destination on the cabin panel.</li>
          <li>The car answers every call in its direction of travel before turning around.</li>
        </ol>

        <main className="elevator-body">
          <section className="building" aria-label="Floors">
            {FLOORS.map((floor, index) => {
              const carHere = floor === shownFloor;
              const doorsOpenHere = stopped && floor === state.floor && openness > 0;
              const upCalled = state.hallCalls.up.includes(floor);
              const downCalled = state.hallCalls.down.includes(floor);

              return (
                <div
                  key={floor}
                  className={`floor-row${carHere ? " car-here" : ""}${doorsOpenHere ? " doors-open" : ""}`}
                  style={{ gridRow: index + 1 }}
                >
                  <span className="floor-number">{floor}</span>
                  <div className="hall-controls">
                    {floor !== TOP_FLOOR && (
                      <button
                        type="button"
                        className={`hall-button up${upCalled ? " lit" : ""}`}
                        onClick={() => callElevator(floor, "up")}
                        aria-pressed={upCalled}
                        aria-label={`Call elevator up from floor ${floor}`}
                      >
                        <span aria-hidden="true">↑</span>
                      </button>
                    )}
                    {floor !== BOTTOM_FLOOR && (
                      <button
                        type="button"
                        className={`hall-button down${downCalled ? " lit" : ""}`}
                        onClick={() => callElevator(floor, "down")}
                        aria-pressed={downCalled}
                        aria-label={`Call elevator down from floor ${floor}`}
                      >
                        <span aria-hidden="true">↓</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="shaft" aria-hidden="true" style={{ gridRow: `1 / span ${FLOORS.length}` }}>
              <div
                className="car"
                style={{ "--pos": position - BOTTOM_FLOOR, "--door": openness } as CSSProperties}
              >
                <div className="car-doorway">
                  <span className="car-door left" />
                  <span className="car-door right" />
                </div>
              </div>
            </div>
          </section>

          <section className="cabin-panel" aria-labelledby="cabin-panel-title">
            <h2 id="cabin-panel-title" className="panel-title">
              Cabin panel
            </h2>
            <div className="panel-grid">
              {PANEL_BUTTONS.map(({ floor, gridRow, gridColumn }) => {
                const selected = state.cabinCalls.includes(floor);
                const here = stopped && state.floor === floor;

                return (
                  <button
                    key={floor}
                    type="button"
                    className={`panel-button${selected ? " lit" : ""}${here ? " here" : ""}`}
                    style={{ gridRow, gridColumn }}
                    onClick={() => selectFloor(floor)}
                    aria-pressed={selected}
                    aria-label={`Go to floor ${floor}`}
                  >
                    {floor}
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
