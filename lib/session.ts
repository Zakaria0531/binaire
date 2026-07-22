import type { Grid } from "@/lib/solver/types";

// Everything is client-side, so the extracted grid is handed from the upload
// flow to the solve page via sessionStorage rather than a server round-trip.

const KEY = "binary-solver:pending-puzzle";

export interface PendingPuzzle {
  n: number;
  grid: Grid;
}

export function savePendingPuzzle(puzzle: PendingPuzzle): void {
  sessionStorage.setItem(KEY, JSON.stringify(puzzle));
}

export function loadPendingPuzzle(): PendingPuzzle | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPuzzle;
    if (!Array.isArray(parsed.grid) || typeof parsed.n !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPuzzle(): void {
  sessionStorage.removeItem(KEY);
}
