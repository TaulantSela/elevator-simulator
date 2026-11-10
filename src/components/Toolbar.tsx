import React from "react";
import { Speed } from "../elevator/useElevator";
import { Segmented } from "./Segmented";

type Props = {
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
  speed: Speed;
  onSpeedChange: (speed: Speed) => void;
};

const SPEEDS: { value: Speed; label: string }[] = [
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 4, label: "4×" },
];

export function Toolbar({ paused, onPausedChange, speed, onSpeedChange }: Props) {
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
    </div>
  );
}
