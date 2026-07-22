"use client";

import type { CellValue, Grid } from "@/lib/solver/types";

interface GridEditorProps {
  grid: Grid;
  // When provided, cells are clickable and cycle blank → 0 → 1 → blank.
  onChange?: (grid: Grid) => void;
  // Cell to highlight (e.g. the current solution step).
  highlight?: { row: number; col: number } | null;
  // The pre-solve grid. Cells filled by the solver (null in base, set in grid)
  // are styled as accents to distinguish them from the user's own entries.
  baseGrid?: Grid;
}

function nextValue(v: CellValue): CellValue {
  if (v === null) return 0;
  if (v === 0) return 1;
  return null;
}

export default function GridEditor({ grid, onChange, highlight, baseGrid }: GridEditorProps) {
  const n = grid.length;
  const editable = typeof onChange === "function";

  function cycle(r: number, c: number) {
    if (!editable) return;
    const next = grid.map((row) => row.slice());
    next[r][c] = nextValue(grid[r][c]);
    onChange!(next);
  }

  return (
    <div
      className="grid w-full max-w-md gap-px rounded-lg bg-zinc-300 p-px dark:bg-zinc-700"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      role="grid"
      aria-label={`${n} by ${n} binary puzzle grid`}
    >
      {grid.map((row, r) =>
        row.map((value, c) => {
          const isHighlighted = highlight?.row === r && highlight?.col === c;
          const solverFilled = baseGrid ? baseGrid[r][c] === null && value !== null : false;

          const base =
            "flex aspect-square items-center justify-center font-mono text-sm sm:text-base font-semibold transition-colors ";
          const tone = solverFilled
            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
            : value === null
              ? "bg-white text-zinc-300 dark:bg-zinc-950 dark:text-zinc-700"
              : "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100";
          const ring = isHighlighted
            ? "outline outline-2 outline-amber-400 z-10 "
            : "";
          const interactive = editable ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 " : "";

          const content = value === null ? (editable ? "·" : "") : value;

          return editable ? (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => cycle(r, c)}
              aria-label={`Row ${r + 1}, column ${c + 1}: ${value === null ? "empty" : value}`}
              className={base + tone + ring + interactive}
            >
              {content}
            </button>
          ) : (
            <div
              key={`${r}-${c}`}
              role="gridcell"
              className={base + tone + ring}
            >
              {content}
            </div>
          );
        }),
      )}
    </div>
  );
}
