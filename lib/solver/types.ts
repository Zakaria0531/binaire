// Core domain types shared across the solver and UI.

// A single cell value. `null` means empty/unknown.
export type CellValue = 0 | 1 | null;

// The grid is a square N x N matrix of cell values, row-major.
export type Grid = CellValue[][];

// A single step emitted by the solver, describing one cell assignment and the
// rule that produced it. `rule` is a deduction rule name, or "search" for a
// backtracking guess (see AGENTS.md solver spec).
export type StepRule =
  | "avoid-triple"
  | "sandwich"
  | "quota"
  | "search";

export interface Step {
  row: number;
  col: number;
  value: 0 | 1;
  rule: StepRule;
  // Whether this step was applied along a row or a column direction.
  direction?: "row" | "col";
  // Human-readable explanation for the SolutionStepper.
  detail: string;
}

// The three terminal outcomes of a solve attempt.
export type SolveOutcome = "unique" | "multiple" | "unsolvable";

export interface SolveResult {
  outcome: SolveOutcome;
  // The solved grid on a unique solution, otherwise the furthest-deduced grid.
  grid: Grid;
  steps: Step[];
}

// Allowed grid sizes must be even (binary puzzle constraint).
export function isValidSize(n: number): boolean {
  return Number.isInteger(n) && n >= 4 && n % 2 === 0;
}

// Create an empty N x N grid.
export function emptyGrid(n: number): Grid {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => null));
}
