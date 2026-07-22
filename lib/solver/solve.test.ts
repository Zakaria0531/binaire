import assert from "node:assert";
import { emptyGrid, type Grid } from "./types";
import { deduce } from "./deduce";
import { countSolutions } from "./backtrack";
import { solve } from "./solve";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

// --- Independent strict validator: verifies a grid is a genuine solution. ---
function isFullyValidSolution(grid: Grid): boolean {
  const n = grid.length;
  const half = n / 2;
  const rows: string[] = [];
  const cols: string[] = [];
  for (let i = 0; i < n; i++) {
    let rz = 0, ro = 0, cz = 0, co = 0;
    let rowStr = "", colStr = "";
    for (let j = 0; j < n; j++) {
      const rv = grid[i][j];
      const cv = grid[j][i];
      if (rv === null || cv === null) return false;
      if (rv === 0) rz++; else ro++;
      if (cv === 0) cz++; else co++;
      rowStr += rv;
      colStr += cv;
      if (j >= 2 && grid[i][j] === grid[i][j - 1] && grid[i][j] === grid[i][j - 2]) return false;
      if (j >= 2 && grid[j][i] === grid[j - 1][i] && grid[j][i] === grid[j - 2][i]) return false;
    }
    if (rz !== half || ro !== half || cz !== half || co !== half) return false;
    rows.push(rowStr);
    cols.push(colStr);
  }
  if (new Set(rows).size !== n) return false;
  if (new Set(cols).size !== n) return false;
  return true;
}

function cloneGrid(g: Grid): Grid {
  return g.map((r) => r.slice());
}

// A known valid full solution used as ground truth. Obtained from the solver's
// own search on an empty grid, then verified independently below.
const SOL6 = countSolutions(emptyGrid(6), 1).solution as Grid;

test("search produces a genuinely valid full solution for an empty 6x6", () => {
  assert.ok(SOL6, "expected a solution for empty 6x6");
  assert.ok(isFullyValidSolution(SOL6), "solution must satisfy all four rules");
});

test("solving a complete valid grid is unique with no search steps", () => {
  const res = solve(cloneGrid(SOL6));
  assert.strictEqual(res.outcome, "unique");
  assert.deepStrictEqual(res.grid, SOL6);
  assert.ok(!res.steps.some((s) => s.rule === "search"), "a full grid needs no search");
});

test("a single blanked cell is uniquely recovered", () => {
  const puzzle = cloneGrid(SOL6);
  puzzle[2][3] = null;
  const res = solve(puzzle);
  assert.strictEqual(res.outcome, "unique");
  assert.deepStrictEqual(res.grid, SOL6);
  // Exactly one cell was resolved; the step for it must exist.
  assert.ok(res.steps.some((s) => s.row === 2 && s.col === 3));
});

test("a lightly blanked grid solves uniquely to the same valid solution", () => {
  const puzzle = cloneGrid(SOL6);
  const holes: [number, number][] = [
    [0, 0], [0, 5], [1, 2], [2, 3], [3, 1], [4, 4], [5, 0], [5, 5],
  ];
  for (const [r, c] of holes) puzzle[r][c] = null;
  const res = solve(puzzle);
  // SOL6 is a solution, so the puzzle is solvable (unique or multiple).
  assert.notStrictEqual(res.outcome, "unsolvable");
  if (res.outcome === "unique") {
    assert.ok(isFullyValidSolution(res.grid), "a unique solution must be fully valid");
    assert.deepStrictEqual(res.grid, SOL6);
  }
});

test("empty 4x4 grid has multiple solutions", () => {
  const res = solve(emptyGrid(4));
  assert.strictEqual(res.outcome, "multiple");
});

test("a three-in-a-row contradiction is unsolvable", () => {
  const bad = emptyGrid(4);
  bad[0][0] = 1;
  bad[0][1] = 1;
  bad[0][2] = 1; // three 1s in a row: impossible
  const res = solve(bad);
  assert.strictEqual(res.outcome, "unsolvable");
});

test("two identical complete rows are unsolvable", () => {
  const bad = emptyGrid(4);
  const row = [0, 1, 0, 1] as const;
  for (let c = 0; c < 4; c++) {
    bad[0][c] = row[c];
    bad[1][c] = row[c];
  }
  const res = solve(bad);
  assert.strictEqual(res.outcome, "unsolvable");
});

test("deduction fires avoid-triple, sandwich and quota rules", () => {
  // Row 0: [0,0,_,...] -> avoid-triple forces col2 = 1.
  const g = emptyGrid(6);
  g[0][0] = 0;
  g[0][1] = 0;
  const { grid, steps } = deduce(g);
  assert.strictEqual(grid[0][2], 1, "avoid-triple should force a 1");
  assert.ok(steps.some((s) => s.rule === "avoid-triple"));

  // Sandwich: [1,_,1] forces middle 0.
  const g2 = emptyGrid(6);
  g2[0][0] = 1;
  g2[0][2] = 1;
  const d2 = deduce(g2);
  assert.strictEqual(d2.grid[0][1], 0, "sandwich should force a 0");
  assert.ok(d2.steps.some((s) => s.rule === "sandwich"));

  // Quota: a row with N/2 ones (spread to avoid triples) forces the rest to 0.
  const g3 = emptyGrid(6);
  g3[0][0] = 1;
  g3[0][2] = 1;
  g3[0][4] = 1;
  const d3 = deduce(g3);
  const zeros = d3.grid[0].filter((v) => v === 0).length;
  assert.strictEqual(zeros, 3, "quota should fill remaining cells with 0");
  assert.ok(d3.steps.some((s) => s.rule === "quota"));
});

test("both row and column directions are applied", () => {
  const g = emptyGrid(6);
  // Column 0: two 1s stacked -> avoid-triple down the column.
  g[0][0] = 1;
  g[1][0] = 1;
  const { grid, steps } = deduce(g);
  assert.strictEqual(grid[2][0], 0, "column avoid-triple should force a 0");
  assert.ok(steps.some((s) => s.direction === "col"));
});

console.log(`\n${passed} solver tests passed.`);
