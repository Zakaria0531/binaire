import type { CellValue, Grid } from "./types";

// Backtracking fallback with second-solution counting. This lets the caller tell
// apart the three outcomes: unique solution, multiple solutions (usually an
// extraction error rather than a truly ambiguous puzzle), and no solution.

type Orient = "row" | "col";

function getLine(grid: Grid, n: number, orient: Orient, i: number): CellValue[] {
  const line: CellValue[] = [];
  for (let j = 0; j < n; j++) {
    line.push(orient === "row" ? grid[i][j] : grid[j][i]);
  }
  return line;
}

// A single line is valid if it has no three-in-a-row, and neither digit exceeds
// N/2. Ignores empty cells, so it holds for partial lines too.
function lineOk(line: CellValue[], n: number): boolean {
  const half = n / 2;
  let zeros = 0;
  let ones = 0;
  for (let k = 0; k < n; k++) {
    const v = line[k];
    if (v === 0) zeros++;
    else if (v === 1) ones++;
    if (k >= 2 && v !== null && v === line[k - 1] && v === line[k - 2]) {
      return false;
    }
  }
  return zeros <= half && ones <= half;
}

function isComplete(line: CellValue[]): boolean {
  return !line.includes(null);
}

function linesEqual(a: CellValue[], b: CellValue[]): boolean {
  for (let k = 0; k < a.length; k++) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

// No two completed rows may be identical, and likewise for columns.
function noDuplicateLines(grid: Grid, n: number, orient: Orient): boolean {
  const complete: CellValue[][] = [];
  for (let i = 0; i < n; i++) {
    const line = getLine(grid, n, orient, i);
    if (isComplete(line)) complete.push(line);
  }
  for (let a = 0; a < complete.length; a++) {
    for (let b = a + 1; b < complete.length; b++) {
      if (linesEqual(complete[a], complete[b])) return false;
    }
  }
  return true;
}

// Full validity check for the pre-filled cells of a grid, covering all four
// rules. Used once up front so fixed cells that already violate a rule are
// reported as unsolvable rather than silently accepted.
export function validateGrid(grid: Grid, n: number): boolean {
  for (const orient of ["row", "col"] as Orient[]) {
    for (let i = 0; i < n; i++) {
      if (!lineOk(getLine(grid, n, orient, i), n)) return false;
    }
    if (!noDuplicateLines(grid, n, orient)) return false;
  }
  return true;
}

export interface BacktrackResult {
  // Number of solutions found, capped at `limit`.
  count: number;
  // The first solution found, or null when there are none.
  solution: Grid | null;
}

// Incremental validity of the just-placed cell at (r, c): check only the row and
// column it touches. Combined with an up-front validateGrid on the fixed cells,
// this fully enforces all four rules, since every rule is a per-line property
// that first becomes violated when a cell in that line is set.
function placementOk(grid: Grid, n: number, r: number, c: number): boolean {
  const row = getLine(grid, n, "row", r);
  const col = getLine(grid, n, "col", c);
  if (!lineOk(row, n) || !lineOk(col, n)) return false;

  if (isComplete(row)) {
    for (let other = 0; other < n; other++) {
      if (other === r) continue;
      const o = getLine(grid, n, "row", other);
      if (isComplete(o) && linesEqual(o, row)) return false;
    }
  }
  if (isComplete(col)) {
    for (let other = 0; other < n; other++) {
      if (other === c) continue;
      const o = getLine(grid, n, "col", other);
      if (isComplete(o) && linesEqual(o, col)) return false;
    }
  }
  return true;
}

// Count solutions of the puzzle, stopping once `limit` are found. Treats every
// already-filled cell as fixed and only assigns the empty ones.
export function countSolutions(input: Grid, limit = 2): BacktrackResult {
  const n = input.length;
  if (!validateGrid(input, n)) return { count: 0, solution: null };

  const grid: Grid = input.map((r) => r.slice());
  const empties: [number, number][] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === null) empties.push([r, c]);
    }
  }

  let count = 0;
  let solution: Grid | null = null;

  // Returns true to signal "stop searching" once the limit is reached.
  const search = (k: number): boolean => {
    if (k === empties.length) {
      count++;
      if (!solution) solution = grid.map((r) => r.slice());
      return count >= limit;
    }
    const [r, c] = empties[k];
    for (const v of [0, 1] as const) {
      grid[r][c] = v;
      if (placementOk(grid, n, r, c) && search(k + 1)) {
        grid[r][c] = null;
        return true;
      }
    }
    grid[r][c] = null;
    return false;
  };

  search(0);
  return { count, solution };
}
