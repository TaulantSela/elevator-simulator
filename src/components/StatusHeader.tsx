import React from "react";
import { PlannedStop } from "../elevator/engine";

type Props = {
  floor: number;
  direction: "up" | "down" | null;
  status: string;
  plan: PlannedStop[];
};

const MAX_SHOWN_STOPS = 6;

export function StatusHeader({ floor, direction, status, plan }: Props) {
  const shown = plan.slice(0, MAX_SHOWN_STOPS);

  return (
    <header className="elevator-header">
      <h1 className="title">Elevator Simulator</h1>
      <div className="readout">
        <div className="indicator" aria-hidden="true">
          <span className="indicator-arrows">
            <span className={direction === "up" ? "lit" : undefined}>▲</span>
            <span className={direction === "down" ? "lit" : undefined}>▼</span>
          </span>
          <span className="indicator-floor">{floor}</span>
        </div>
        <div className="readout-text">
          <p className="status" role="status">
            {status}
          </p>
          <div className="plan">
            <span className="plan-label" id="plan-label">
              Next stops
            </span>
            {shown.length ? (
              <ol className="plan-stops" aria-labelledby="plan-label">
                {shown.map((stop, index) => (
                  <li key={`${index}-${stop.floor}-${stop.hall}`} className={stop.hall ? `hall ${stop.hall}` : undefined}>
                    {stop.floor}
                    {stop.hall && (
                      <>
                        <span aria-hidden="true">{stop.hall === "up" ? "↑" : "↓"}</span>
                        <span className="sr-only"> {stop.hall}</span>
                      </>
                    )}
                  </li>
                ))}
                {plan.length > shown.length && <li className="more">+{plan.length - shown.length}</li>}
              </ol>
            ) : (
              <span className="plan-empty">none</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
