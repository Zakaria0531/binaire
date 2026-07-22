import type { CellValue, Grid } from "@/lib/solver/types";

// Cell classification runs on the perspective-corrected square canvas produced
// by detectGrid. It uses plain Canvas 2D pixel access (no OpenCV needed here):
//   1. slice the square into n x n cells,
//   2. blank vs filled via an "ink ratio" (fraction of pixels that deviate from
//      the cell's background level), which is robust to dark-on-light and
//      light-on-dark alike,
//   3. 0 vs 1 via normalized cross-correlation against templates the user
//      captured from two cells of their own grid.

// Per-cell downsampled, contrast-normalized feature vector used for matching.
const FEAT = 24;

// Fraction of the cell (each side) to trim before sampling, to avoid the grid
// lines that bound every cell.
const DEFAULT_INSET = 0.16;

// Below this ink ratio a cell is considered blank.
const DEFAULT_BLANK_THRESHOLD = 0.035;

// A pixel counts as "ink" when its gray value deviates from the cell background
// by more than this (out of 255).
const INK_DEVIATION = 45;

export interface CellSample {
  row: number;
  col: number;
  index: number; // row-major index, = row * n + col
  inkRatio: number;
  features: Float32Array; // length FEAT*FEAT, zero-mean unit-norm (or all-zero if flat)
}

export interface Templates {
  zero: Float32Array;
  one: Float32Array;
}

export interface ClassifyOptions {
  inset?: number;
  blankThreshold?: number;
}

export interface ClassifyResult {
  grid: Grid;
  // Match margin per filled cell (|ncc0 - ncc1|); low margins flag likely
  // misreads for the user to double-check. null for blank cells.
  confidence: (number | null)[][];
}

function toGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Build a zero-mean, unit-norm feature vector from an already-computed FEAT*FEAT
// grayscale patch. Returns all-zeros when the patch is flat (no contrast).
function normalizeFeatures(patch: Float32Array): Float32Array {
  const n = patch.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += patch[i];
  mean /= n;

  const out = new Float32Array(n);
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = patch[i] - mean;
    out[i] = v;
    sumSq += v * v;
  }
  const norm = Math.sqrt(sumSq);
  if (norm < 1e-6) return out; // flat patch -> all zeros
  for (let i = 0; i < n; i++) out[i] /= norm;
  return out;
}

// Sample every cell of the warped square, returning ink ratio + features for
// each. The returned array is row-major and its features feed both blank
// detection and template capture/matching.
export function sampleCells(
  canvas: HTMLCanvasElement,
  n: number,
  options: ClassifyOptions = {},
): CellSample[] {
  const inset = options.inset ?? DEFAULT_INSET;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not obtain a 2D context for cell sampling.");

  const side = Math.min(canvas.width, canvas.height);
  const cell = side / n;
  const samples: CellSample[] = [];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x0 = Math.round(col * cell + cell * inset);
      const y0 = Math.round(row * cell + cell * inset);
      const w = Math.max(1, Math.round(cell * (1 - 2 * inset)));
      const h = w;
      const { data } = ctx.getImageData(x0, y0, w, h);

      // Grayscale for the whole inner cell.
      const grays = new Array<number>(w * h);
      for (let p = 0; p < w * h; p++) {
        grays[p] = toGray(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
      }

      // Background = median gray; ink = pixels far from it.
      const bg = median(grays);
      let ink = 0;
      for (let p = 0; p < w * h; p++) {
        if (Math.abs(grays[p] - bg) > INK_DEVIATION) ink++;
      }
      const inkRatio = ink / (w * h);

      // Downsample the inner cell to FEAT x FEAT by block-averaging.
      const patch = new Float32Array(FEAT * FEAT);
      for (let fy = 0; fy < FEAT; fy++) {
        for (let fx = 0; fx < FEAT; fx++) {
          const sx0 = Math.floor((fx * w) / FEAT);
          const sx1 = Math.max(sx0 + 1, Math.floor(((fx + 1) * w) / FEAT));
          const sy0 = Math.floor((fy * h) / FEAT);
          const sy1 = Math.max(sy0 + 1, Math.floor(((fy + 1) * h) / FEAT));
          let sum = 0;
          let count = 0;
          for (let yy = sy0; yy < sy1; yy++) {
            for (let xx = sx0; xx < sx1; xx++) {
              sum += grays[yy * w + xx];
              count++;
            }
          }
          patch[fy * FEAT + fx] = count ? sum / count : bg;
        }
      }

      samples.push({
        row,
        col,
        index: row * n + col,
        inkRatio,
        features: normalizeFeatures(patch),
      });
    }
  }

  return samples;
}

// Normalized cross-correlation of two equal-length, unit-norm vectors = dot.
function ncc(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// Classify all sampled cells into a Grid using captured 0/1 templates.
export function classifyCells(
  samples: CellSample[],
  n: number,
  templates: Templates,
  options: ClassifyOptions = {},
): ClassifyResult {
  const blankThreshold = options.blankThreshold ?? DEFAULT_BLANK_THRESHOLD;
  const grid: Grid = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => null as CellValue),
  );
  const confidence: (number | null)[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => null as number | null),
  );

  for (const s of samples) {
    if (s.inkRatio < blankThreshold) {
      grid[s.row][s.col] = null;
      continue;
    }
    const c0 = ncc(s.features, templates.zero);
    const c1 = ncc(s.features, templates.one);
    grid[s.row][s.col] = c1 >= c0 ? 1 : 0;
    confidence[s.row][s.col] = Math.abs(c1 - c0);
  }

  return { grid, confidence };
}
