import React from "react";
import { Simulation } from "../elevator/passengers";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export function TrafficStats({ sim, onReset }: { sim: Simulation; onReset: () => void }) {
  const { stats, waiting, riding } = sim;
  const average = (total: number) => (stats.delivered ? seconds(total / stats.delivered) : "–");

  const items: [label: string, value: string | number, title?: string][] = [
    ["Delivered", stats.delivered],
    ["Waiting", waiting.length],
    ["In the car", riding.length],
    ["Avg wait", average(stats.totalWait), "From pressing the hall button to boarding"],
    ["Avg trip", average(stats.totalTrip), "From pressing the hall button to arriving"],
    ["Longest wait", stats.delivered ? seconds(stats.longestWait) : "–"],
  ];

  return (
    <section className="traffic-stats" aria-labelledby="traffic-stats-title">
      <div className="stats-header">
        <h2 id="traffic-stats-title" className="panel-title">
          Passengers
        </h2>
        <button type="button" className="text-button" onClick={onReset}>
          Reset stats
        </button>
      </div>
      <dl className="stats-grid">
        {items.map(([label, value, title]) => (
          <div key={label} title={title}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
