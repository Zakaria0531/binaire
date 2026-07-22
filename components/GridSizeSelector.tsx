"use client";

import { useState } from "react";
import { isValidSize } from "@/lib/solver/types";

const PRESETS = [6, 8, 10, 12, 14];

interface GridSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
}

export default function GridSizeSelector({ value, onChange }: GridSizeSelectorProps) {
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPreset = PRESETS.includes(value);

  function applyCustom(raw: string) {
    setCustom(raw);
    if (raw.trim() === "") {
      setError(null);
      return;
    }
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      setError("Enter a whole number.");
      return;
    }
    if (!isValidSize(n)) {
      setError("Size must be an even number of at least 4.");
      return;
    }
    setError(null);
    onChange(n);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Grid size
      </label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                setCustom("");
                setError(null);
                onChange(n);
              }}
              aria-pressed={active}
              className={
                "min-w-16 rounded-lg border px-4 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "border-indigo-500 bg-indigo-500 text-white shadow-sm"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-indigo-500")
              }
            >
              {n}×{n}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Custom:</span>
          <input
            type="number"
            inputMode="numeric"
            min={4}
            step={2}
            placeholder="e.g. 16"
            value={custom}
            onChange={(e) => applyCustom(e.target.value)}
            aria-invalid={error !== null}
            className={
              "w-28 rounded-lg border bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 dark:bg-zinc-900 dark:text-zinc-100 " +
              (error
                ? "border-red-400 focus:border-red-500"
                : !isPreset && custom
                  ? "border-indigo-500"
                  : "border-zinc-300 dark:border-zinc-700")
            }
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
