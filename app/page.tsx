"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GridSizeSelector from "@/components/GridSizeSelector";
import ImageUploader from "@/components/ImageUploader";
import ManualCorners from "@/components/ManualCorners";
import TemplateCapture from "@/components/TemplateCapture";
import {
  detectAndWarp,
  warpWithCorners,
  defaultQuad,
  type Quad,
  type WarpResult,
} from "@/lib/cv/detectGrid";
import {
  sampleCells,
  classifyCells,
  type CellSample,
  type Templates,
} from "@/lib/cv/classifyCells";
import { savePendingPuzzle } from "@/lib/session";

type Phase = "input" | "working" | "manual" | "capture";

export default function Home() {
  const router = useRouter();

  const [size, setSize] = useState(10);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("input");
  const [warp, setWarp] = useState<WarpResult | null>(null);
  const [samples, setSamples] = useState<CellSample[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function enterCapture(result: WarpResult) {
    setWarp(result);
    setSamples(sampleCells(result.canvas, size));
    setPhase("capture");
  }

  async function handleDetect() {
    if (!image) return;
    setError(null);
    setPhase("working");
    try {
      const result = await detectAndWarp(image, size);
      if (result) {
        enterCapture(result);
      } else {
        // Auto-detection failed; fall back to manual corner selection.
        setPhase("manual");
      }
    } catch {
      setError("Could not load the vision engine. Check your connection and retry.");
      setPhase("input");
    }
  }

  async function handleManualConfirm(corners: Quad) {
    if (!image) return;
    setError(null);
    setPhase("working");
    try {
      const result = await warpWithCorners(image, corners, size);
      enterCapture(result);
    } catch {
      setError("Something went wrong warping the grid. Please retry.");
      setPhase("manual");
    }
  }

  function handleTemplates(templates: Templates) {
    if (!samples) return;
    const { grid } = classifyCells(samples, size, templates);
    savePendingPuzzle({ n: size, grid });
    router.push("/solve");
  }

  function reset() {
    setPhase("input");
    setWarp(null);
    setSamples(null);
    setError(null);
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-12 dark:bg-black sm:py-16">
      <main className="w-full max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Binary Puzzle Solver
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Upload a photo of a Takuzu / Binairo puzzle, pick its size, and let the
            app read, review, and solve it — entirely in your browser.
          </p>
        </header>

        <div className="flex flex-col gap-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {phase === "input" && (
            <>
              <section>
                <GridSizeSelector value={size} onChange={setSize} />
              </section>

              <section className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Puzzle photo
                </span>
                <ImageUploader
                  previewUrl={previewUrl}
                  onImageSelected={(img, url) => {
                    setImage(img);
                    setPreviewUrl(url);
                  }}
                />
              </section>

              {error && (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Solving a {size}×{size} grid.
                </p>
                <button
                  type="button"
                  disabled={!image}
                  onClick={handleDetect}
                  className={
                    "rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors " +
                    (image
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600")
                  }
                >
                  Detect grid →
                </button>
              </div>
            </>
          )}

          {phase === "working" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Loading the vision engine and reading the grid…
              </p>
            </div>
          )}

          {phase === "manual" && image && (
            <ManualCorners
              image={image}
              initial={defaultQuad(image.naturalWidth, image.naturalHeight)}
              onConfirm={handleManualConfirm}
              onCancel={reset}
            />
          )}

          {phase === "capture" && warp && samples && (
            <div className="flex flex-col gap-4">
              <TemplateCapture
                canvas={warp.canvas}
                n={size}
                samples={samples}
                onReady={handleTemplates}
              />
              <button
                type="button"
                onClick={reset}
                className="self-start text-xs font-medium text-zinc-500 hover:underline dark:text-zinc-400"
              >
                ← Start over
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
