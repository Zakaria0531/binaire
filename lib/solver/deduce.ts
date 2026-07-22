import type { Grid, Step, StepRule } from "./types";

export interface DeduceResult {
  // The grid after applying every forced move deduction could find.
  grid: Grid;
  // The ordered list of deductions, each recorded with its rule.
  steps: Step[];
}

type Orient = "row" | "col";

function orientLabel(orient: Orient, i: number): string {
  return `${orient === "row" ? "Row" : "Column"} ${i + 1}`;
}

// Apply human-style logical rules repeatedly until no rule fires. Each of the
// three deduction rules (avoid-triple, sandwich, quota) is applied in both the
// row and column direction. Only forced moves are made, so no true solution is
// ever eliminated.
export function deduce(input: Grid): DeduceResult {
  const n = input.length;
  const half = n / 2;
  const grid: Grid = input.map((r) => r.slice());
  const steps: Step[] = [];

  // Set an empty cell, recording the step. No-op (returns false) if the cell is
  // already filled, which keeps the pass idempotent.
  const set = (
    r: number,
    c: number,
    value: 0 | 1,
    rule: StepRule,
    direction: Orient,
    detail: string,
  ): boolean => {
    if (grid[r][c] !== null) return false;
    grid[r][c] = value;
    steps.push({ row: r, col: c, value, rule, direction, detail });
    return true;
  };

  let changed = true;
  while (changed) {
    changed = false;

    for (const orient of ["row", "col"] as Orient[]) {
      for (let i = 0; i < n; i++) {
        // Coordinates of this line's cells in order.
        const coords: [number, number][] = [];
        for (let j = 0; j < n; j++) {
          coords.push(orient === "row" ? [i, j] : [j, i]);
        }
        const valueAt = (k: number) => grid[coords[k][0]][coords[k][1]];
        const label = orientLabel(orient, i);

        // --- Avoid-triple + sandwich over every 3-cell window ---
        for (let k = 0; k + 2 < n; k++) {
          const a = valueAt(k);
          const b = valueAt(k + 1);
          const c = valueAt(k + 2);

          // Pair on the left forces the cell after it.
          if (a !== null && a === b && c === null) {
            const [rr, cc] = coords[k + 2];
            const v = (1 - a) as 0 | 1;
            if (
              set(rr, cc, v, "avoid-triple", orient,
                `${label}: two ${a}s at positions ${k + 1}–${k + 2} force a ${v} at position ${k + 3} to avoid three in a row.`)
            ) changed = true;
          }
          // Pair on the right forces the cell before it.
          if (b !== null && b === c && a === null) {
            const [rr, cc] = coords[k];
            const v = (1 - b) as 0 | 1;
            if (
              set(rr, cc, v, "avoid-triple", orient,
                `${label}: two ${b}s at positions ${k + 2}–${k + 3} force a ${v} at position ${k + 1} to avoid three in a row.`)
            ) changed = true;
          }
          // Equal ends around a gap force the middle to the opposite value.
          if (a !== null && a === c && b === null) {
            const [rr, cc] = coords[k + 1];
            const v = (1 - a) as 0 | 1;
            if (
              set(rr, cc, v, "sandwich", orient,
                `${label}: a ${a} at positions ${k + 1} and ${k + 3} forces a ${v} between them at position ${k + 2}.`)
            ) changed = true;
          }
        }

        // --- Quota: once N/2 of a digit are placed, the rest are the other ---
        let zeros = 0;
        let ones = 0;
        for (let k = 0; k < n; k++) {
          const v = valueAt(k);
          if (v === 0) zeros++;
          else if (v === 1) ones++;
        }
        if (zeros === half && ones < half) {
          for (let k = 0; k < n; k++) {
            if (valueAt(k) === null) {
              const [rr, cc] = coords[k];
              if (
                set(rr, cc, 1, "quota", orient,
                  `${label} already has its ${half} zeros, so every remaining cell must be 1.`)
              ) changed = true;
            }
          }
        } else if (ones === half && zeros < half) {
          for (let k = 0; k < n; k++) {
            if (valueAt(k) === null) {
              const [rr, cc] = coords[k];
              if (
                set(rr, cc, 0, "quota", orient,
                  `${label} already has its ${half} ones, so every remaining cell must be 0.`)
              ) changed = true;
            }
          }
        }
      }
    }
  }

  return { grid, steps };
}
