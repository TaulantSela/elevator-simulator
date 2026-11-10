import React from "react";
import { ElevatorState } from "../elevator/engine";

type Props = {
  /** Top floor first. */
  floors: number[];
  elevator: ElevatorState;
  onSelect: (floor: number) => void;
  onOpenDoors: () => void;
  onCloseDoors: () => void;
};

/**
 * Buttons placed like a real two-column panel: ascending from the bottom,
 * odd floors on the left, a lone top floor centred.
 */
function panelLayout(floors: number[]) {
  const ascending = [...floors].reverse();
  const rows = Math.ceil(ascending.length / 2);
  return ascending.map((floor, index) => {
    const isLoneTop = index === ascending.length - 1 && index % 2 === 0;
    return {
      floor,
      gridRow: rows - Math.floor(index / 2),
      gridColumn: isLoneTop ? "1 / span 2" : String((index % 2) + 1),
    };
  });
}

export function CabinPanel({ floors, elevator, onSelect, onOpenDoors, onCloseDoors }: Props) {
  const stopped = elevator.phase !== "moving";

  return (
    <section className="cabin-panel" aria-labelledby="cabin-panel-title">
      <h2 id="cabin-panel-title" className="panel-title">
        Cabin panel
      </h2>
      <div className="panel-grid">
        {panelLayout(floors).map(({ floor, gridRow, gridColumn }) => {
          const selected = elevator.cabinCalls.includes(floor);
          const here = stopped && elevator.floor === floor;

          return (
            <button
              key={floor}
              type="button"
              className={`panel-button${selected ? " lit" : ""}${here ? " here" : ""}`}
              style={{ gridRow, gridColumn }}
              onClick={() => onSelect(floor)}
              aria-pressed={selected}
              aria-label={`Go to floor ${floor}`}
            >
              {floor}
            </button>
          );
        })}
      </div>
      <div className="door-buttons">
        <button type="button" className="door-button open" onClick={onOpenDoors} aria-label="Open doors">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12 9 7v10zM21 12l-6-5v10z" />
            <rect x="11" y="5" width="2" height="14" rx="1" />
          </svg>
        </button>
        <button type="button" className="door-button close" onClick={onCloseDoors} aria-label="Close doors">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 12 3 7v10zM15 12l6-5v10z" />
            <rect x="11" y="5" width="2" height="14" rx="1" />
          </svg>
        </button>
      </div>
    </section>
  );
}
