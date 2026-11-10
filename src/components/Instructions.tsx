import React, { ReactNode, useState } from "react";

const STORAGE_KEY = "elevator-simulator:instructions";

type Stored = "open" | "closed";

function read(): Stored | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "open" || value === "closed" ? value : null;
  } catch {
    return null;
  }
}

function write(value: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable (private windows, blocked site data); the
    // instructions then just start open every visit.
  }
}

let seenMarked = false;

/**
 * Call once the visitor has used the simulator: from the next visit on, the
 * instructions start collapsed. Collapsing them now would shift the layout
 * under the pointer, so this only affects later visits.
 */
export function markInstructionsSeen() {
  if (seenMarked) return;
  seenMarked = true;
  if (read() === null) write("closed");
}

export function Instructions({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => read() !== "closed");

  return (
    <details
      className="instructions"
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        // The browser also fires toggle when React first sets `open`; only
        // remember changes the visitor made.
        if (next === open) return;
        setOpen(next);
        write(next ? "open" : "closed");
      }}
    >
      <summary>How to use</summary>
      <ol>{children}</ol>
    </details>
  );
}
