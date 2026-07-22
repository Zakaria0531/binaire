// Minimal type surface for OpenCV.js — only the pieces this project uses.
// OpenCV.js ships no official TypeScript types, so we declare a focused subset
// rather than pulling in a heavy third-party definition or resorting to `any`.

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Mat {
  rows: number;
  cols: number;
  data: Uint8Array;
  data32S: Int32Array;
  data32F: Float32Array;
  delete(): void;
  clone(): Mat;
  roi(rect: Rect): Mat;
  ucharAt(row: number, col: number): number;
  size(): Size;
  empty(): boolean;
}

export interface MatVector {
  size(): number;
  get(index: number): Mat;
  delete(): void;
}

export interface MatConstructor {
  new (): Mat;
  new (rows: number, cols: number, type: number): Mat;
}

export interface OpenCV {
  Mat: MatConstructor;
  MatVector: { new (): MatVector };
  Size: { new (width: number, height: number): Size };
  Rect: { new (x: number, y: number, width: number, height: number): Rect };

  imread(source: HTMLImageElement | HTMLCanvasElement | string): Mat;
  imshow(canvas: HTMLCanvasElement | string, mat: Mat): void;

  cvtColor(src: Mat, dst: Mat, code: number, dstCn?: number): void;
  GaussianBlur(
    src: Mat,
    dst: Mat,
    ksize: Size,
    sigmaX: number,
    sigmaY?: number,
    borderType?: number,
  ): void;
  Canny(
    src: Mat,
    dst: Mat,
    threshold1: number,
    threshold2: number,
    apertureSize?: number,
    L2gradient?: boolean,
  ): void;
  threshold(src: Mat, dst: Mat, thresh: number, maxval: number, type: number): number;
  adaptiveThreshold(
    src: Mat,
    dst: Mat,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    C: number,
  ): void;
  dilate(src: Mat, dst: Mat, kernel: Mat): void;

  findContours(
    image: Mat,
    contours: MatVector,
    hierarchy: Mat,
    mode: number,
    method: number,
  ): void;
  contourArea(contour: Mat, oriented?: boolean): number;
  arcLength(curve: Mat, closed: boolean): number;
  approxPolyDP(curve: Mat, approxCurve: Mat, epsilon: number, closed: boolean): void;

  matFromArray(rows: number, cols: number, type: number, array: number[]): Mat;
  getPerspectiveTransform(src: Mat, dst: Mat): Mat;
  warpPerspective(src: Mat, dst: Mat, M: Mat, dsize: Size): void;

  countNonZero(src: Mat): number;
  getBuildInformation?(): string;

  // Constants used by this project.
  COLOR_RGBA2GRAY: number;
  RETR_LIST: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  THRESH_BINARY: number;
  THRESH_BINARY_INV: number;
  THRESH_OTSU: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  CV_8UC1: number;
  CV_32FC2: number;
}
