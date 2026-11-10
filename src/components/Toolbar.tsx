import React from "react";
import { TrafficLevel } from "../elevator/passengers";
import { Speed } from "../elevator/useSimulation";
import { Segmented } from "./Segmented";

type Props = {
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
  speed: Speed;
  onSpeedChange: (speed: Speed) => void;
  traffic: TrafficLevel;
  onTrafficChange: (traffic: TrafficLevel) => void;
};

const SPEEDS: { value: Speed; label: string }[] = [
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 4, label: "4×" },
];

const TRAFFIC: { value: TrafficLevel; label: string; title?: string }[] = [
  { value: "off", label: "Off" },
  { value: "light", label: "Light", title: "About 4 people a minute" },
  { value: "busy", label: "Busy", title: "About 10 people a minute" },
];

export function Toolbar({ paused, onPausedChange, speed, onSpeedChange, traffic, onTrafficChange }: Props) {
  return (
    <div className="toolbar">
      <button
        type="button"
        className={`toolbar-button${paused ? " paused" : ""}`}
        onClick={() => onPausedChange(!paused)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          {paused ? <path d="M4 2.5v11l9-5.5z" /> : <path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" />}
        </svg>
        {paused ? "Resume" : "Pause"}
      </button>
      <Segmented label="Speed" options={SPEEDS} value={speed} onChange={onSpeedChange} />
      <Segmented label="Passengers" options={TRAFFIC} value={traffic} onChange={onTrafficChange} />
    </div>
  );
}
