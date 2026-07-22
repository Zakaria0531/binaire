import type { Grid, SolveResult, Step } from "./types";
import { deduce } from "./deduce";
import { countSolutions } from "./backtrack";

// Orchestrate the two-stage solve: logical deduction first, then a backtracking
// search for whatever remains. The search also counts a second solution so we
// can distinguish a unique solution from an ambiguous grid (which usually means
// the extraction misread a cell) and from an unsolvable one.
export function solve(input: Grid): SolveResult {
  const n = input.length;
  const { grid: deduced, steps } = deduce(input);

  const { count, solution } = countSolutions(deduced, 2);

  if (count === 0) {
    return { outcome: "unsolvable", grid: deduced, steps };
  }
  if (count >= 2) {
    return { outcome: "multiple", grid: deduced, steps };
  }

  // Unique solution. Any cell the deduction left empty was resolved by the
  // search; record those as distinctly-labeled "search" steps so the step
  // display never presents a guess as a logical deduction.
  const solved = solution as Grid;
  const searchSteps: Step[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (deduced[r][c] === null && solved[r][c] !== null) {
        const value = solved[r][c] as 0 | 1;
        searchSteps.push({
          row: r,
          col: c,
          value,
          rule: "search",
          detail: `Search: no direct deduction remained here, so the solver tried values and confirmed ${value} as the only one consistent with a unique solution.`,
        });
      }
    }
  }

  return {
    outcome: "unique",
    grid: solved,
    steps: [...steps, ...searchSteps],
  };
}
