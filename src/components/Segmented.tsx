import React, { useId } from "react";

type Option<T> = { value: T; label: string; title?: string };

type Props<T> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** A small group of mutually exclusive toggle buttons. */
export function Segmented<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  const labelId = useId();

  return (
    <div className="segmented" role="group" aria-labelledby={labelId}>
      <span className="segmented-label" id={labelId}>
        {label}
      </span>
      <span className="segmented-options">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            title={option.title}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </span>
    </div>
  );
}
