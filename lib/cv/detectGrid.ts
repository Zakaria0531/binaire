import { loadOpenCV } from "./loadOpenCV";
import type { OpenCV } from "./opencv";

// A corner point in source-image pixel coordinates.
export interface Corner {
  x: number;
  y: number;
}

// Four corners ordered top-left, top-right, bottom-right, bottom-left.
export type Quad = [Corner, Corner, Corner, Corner];

export interface WarpResult {
  // The perspective-corrected square as a canvas, ready for cell slicing.
  canvas: HTMLCanvasElement;
  // The corners that were used, in source-image coordinates.
  corners: Quad;
  // Side length in pixels of the square canvas.
  side: number;
}

// Pixels allocated per cell in the warped output. The square side is n*cellPx so
// it always divides evenly into an n x n grid.
const CELL_PX = 44;

function outputSide(n: number): number {
  return n * CELL_PX;
}

// Order four arbitrary points into [tl, tr, br, bl] using coordinate sums and
// differences, the standard document-scanner trick.
function orderCorners(points: Corner[]): Quad {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const tl = bySum[0];
  const br = bySum[bySum.length - 1];
  const byDiff = [...points].sort((a, b) => a.x - a.y - (b.x - b.y));
  const bl = byDiff[0];
  const tr = byDiff[byDiff.length - 1];
  return [tl, tr, br, bl];
}

// Find the largest 4-sided contour in the image — the puzzle grid boundary.
// Returns null when nothing plausible is found (caller falls back to manual
// corner selection).
export function findGridQuad(cv: OpenCV, image: HTMLImageElement | HTMLCanvasElement): Quad | null {
  const src = cv.imread(image);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  let best: Quad | null = null;

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 50, 150);
    // Close small gaps in the border so the outer rectangle is one contour.
    const kernel = new cv.Mat();
    cv.dilate(edges, edges, kernel);
    kernel.delete();

    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE,
    );

    const imageArea = src.rows * src.cols;
    let bestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      // Ignore small noise; the grid should occupy a meaningful fraction.
      if (area > bestArea && area > imageArea * 0.2) {
        const approx = new cv.Mat();
        const peri = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approx, 0.02 * peri, true);
        if (approx.rows === 4) {
          const pts: Corner[] = [];
          for (let p = 0; p < 4; p++) {
            pts.push({ x: approx.data32S[p * 2], y: approx.data32S[p * 2 + 1] });
          }
          best = orderCorners(pts);
          bestArea = area;
        }
        approx.delete();
      }
      contour.delete();
    }
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }

  return best;
}

// Warp the region bounded by `corners` to a flat square canvas of side n*CELL_PX.
export function warpToSquare(
  cv: OpenCV,
  image: HTMLImageElement | HTMLCanvasElement,
  corners: Quad,
  n: number,
): WarpResult {
  const side = outputSide(n);
  const src = cv.imread(image);
  const dst = new cv.Mat();

  const [tl, tr, br, bl] = corners;
  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y,
    tr.x, tr.y,
    br.x, br.y,
    bl.x, bl.y,
  ]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    side, 0,
    side, side,
    0, side,
  ]);
  const M = cv.getPerspectiveTransform(srcTri, dstTri);

  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;

  try {
    cv.warpPerspective(src, dst, M, new cv.Size(side, side));
    cv.imshow(canvas, dst);
  } finally {
    src.delete();
    dst.delete();
    srcTri.delete();
    dstTri.delete();
    M.delete();
  }

  return { canvas, corners, side };
}

// End-to-end: load OpenCV, auto-detect the grid quad, and warp it. Returns null
// (with the loaded cv still cached) when auto-detection fails, so the UI can
// switch to the manual four-corner tool and call `warpToSquare` directly.
export async function detectAndWarp(
  image: HTMLImageElement,
  n: number,
): Promise<WarpResult | null> {
  const cv = await loadOpenCV();
  const quad = findGridQuad(cv, image);
  if (!quad) return null;
  return warpToSquare(cv, image, quad, n);
}

// A sensible default quad (inset rectangle) to seed the manual corner tool when
// auto-detection fails.
export function defaultQuad(width: number, height: number): Quad {
  const mx = width * 0.1;
  const my = height * 0.1;
  return [
    { x: mx, y: my },
    { x: width - mx, y: my },
    { x: width - mx, y: height - my },
    { x: mx, y: height - my },
  ];
}

// Re-export a manual warp helper that loads cv itself, for the fallback path.
export async function warpWithCorners(
  image: HTMLImageElement | HTMLCanvasElement,
  corners: Quad,
  n: number,
): Promise<WarpResult> {
  const cv = await loadOpenCV();
  return warpToSquare(cv, image, corners, n);
}
