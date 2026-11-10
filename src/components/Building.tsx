import React, { CSSProperties } from "react";
import { Direction, ElevatorState } from "../elevator/engine";
import { Passenger, tripDirection } from "../elevator/passengers";

type Props = {
  /** Top floor first: the order the floors appear on screen. */
  floors: number[];
  elevator: ElevatorState;
  position: number;
  openness: number;
  waiting: readonly Passenger[];
  riding: readonly Passenger[];
  onCall: (floor: number, direction: Direction) => void;
};

const MAX_FIGURES = 4;

function Figures({ people }: { people: readonly Passenger[] }) {
  const extra = people.length - MAX_FIGURES;
  return (
    <>
      {people.slice(0, MAX_FIGURES).map((person) => (
        <span key={person.id} className={`person ${tripDirection(person)}`} />
      ))}
      {extra > 0 && <span className="figures-more">+{extra}</span>}
    </>
  );
}

export function Building({ floors, elevator, position, openness, waiting, riding, onCall }: Props) {
  const top = floors[0];
  const bottom = floors[floors.length - 1];
  const shownFloor = Math.round(position);
  const stopped = elevator.phase !== "moving";

  return (
    <section className="building" aria-label="Floors">
      {floors.map((floor, index) => {
        const carHere = floor === shownFloor;
        const doorsOpenHere = stopped && floor === elevator.floor && openness > 0;
        const upCalled = elevator.hallCalls.up.includes(floor);
        const downCalled = elevator.hallCalls.down.includes(floor);
        const waitingHere = waiting.filter((person) => person.origin === floor);

        return (
          <div
            key={floor}
            className={`floor-row${carHere ? " car-here" : ""}${doorsOpenHere ? " doors-open" : ""}`}
            style={{ gridRow: index + 1 }}
          >
            <span className="floor-number">{floor}</span>
            {waitingHere.length > 0 && (
              <span className="waiting">
                <Figures people={waitingHere} />
                <span className="sr-only">{waitingHere.length} waiting</span>
              </span>
            )}
            <div className="hall-controls">
              {floor !== top && (
                <button
                  type="button"
                  className={`hall-button up${upCalled ? " lit" : ""}`}
                  onClick={() => onCall(floor, "up")}
                  aria-pressed={upCalled}
                  aria-label={`Call elevator up from floor ${floor}`}
                >
                  <span aria-hidden="true">↑</span>
                </button>
              )}
              {floor !== bottom && (
                <button
                  type="button"
                  className={`hall-button down${downCalled ? " lit" : ""}`}
                  onClick={() => onCall(floor, "down")}
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

      <div className="shaft" aria-hidden="true" style={{ gridRow: `1 / span ${floors.length}` }}>
        <div className="car" style={{ "--pos": position - bottom, "--door": openness } as CSSProperties}>
          <div className="car-doorway">
            {riding.length > 0 && (
              <span className="riders">
                <Figures people={riding} />
              </span>
            )}
            <span className="car-door left" />
            <span className="car-door right" />
          </div>
        </div>
      </div>
    </section>
  );
}
