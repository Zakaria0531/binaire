"use client";

import { useEffect, useMemo, useState } from "react";
import type { CellSample, Templates } from "@/lib/cv/classifyCells";

interface TemplateCaptureProps {
  // The perspective-corrected square grid.
  canvas: HTMLCanvasElement;
  n: number;
  samples: CellSample[];
  onReady: (templates: Templates, picks: { zero: number; one: number }) => void;
}

type Slot = "zero" | "one";

export default function TemplateCapture({ canvas, n, samples, onReady }: TemplateCaptureProps) {
  // Snapshot the warped canvas to an image once for display.
  const imageUrl = useMemo(() => canvas.toDataURL("image/png"), [canvas]);

  const [active, setActive] = useState<Slot>("zero");
  const [zeroIndex, setZeroIndex] = useState<number | null>(null);
  const [oneIndex, setOneIndex] = useState<number | null>(null);

  useEffect(() => {
    if (zeroIndex !== null && oneIndex !== null) {
      const zero = samples[zeroIndex]?.features;
      const one = samples[oneIndex]?.features;
      if (zero && one) {
        onReady({ zero, one }, { zero: zeroIndex, one: oneIndex });
      }
    }
    // onReady is expected to be stable; we intentionally react to picks only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zeroIndex, oneIndex, samples]);

  function pick(index: number) {
    if (active === "zero") {
      setZeroIndex(index);
      if (oneIndex === null) setActive("one");
    } else {
      setOneIndex(index);
      if (zeroIndex === null) setActive("zero");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Teach the reader your digits
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Click one cell you know shows a <strong>0</strong>, and one you know
          shows a <strong>1</strong>. These become the reference for reading the
          rest of the grid.
        </p>
      </div>

      <div className="flex gap-2">
        {(["zero", "one"] as Slot[]).map((slot) => {
          const label = slot === "zero" ? "0" : "1";
          const idx = slot === "zero" ? zeroIndex : oneIndex;
          const isActive = active === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => setActive(slot)}
              className={
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors " +
                (isActive
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200")
              }
            >
              <span className="font-mono text-base">{label}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {idx === null ? "not set" : `cell ${idx}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative mx-auto w-full max-w-md select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Perspective-corrected puzzle grid"
          className="block w-full rounded-lg"
        />
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gridTemplateRows: `repeat(${n}, 1fr)`,
          }}
        >
          {samples.map((s) => {
            const isZero = s.index === zeroIndex;
            const isOne = s.index === oneIndex;
            return (
              <button
                key={s.index}
                type="button"
                onClick={() => pick(s.index)}
                aria-label={`Cell row ${s.row + 1}, column ${s.col + 1}`}
                className={
                  "flex items-center justify-center border border-transparent transition-colors hover:bg-indigo-400/30 " +
                  (isZero
                    ? "bg-emerald-500/40 ring-2 ring-inset ring-emerald-500"
                    : isOne
                      ? "bg-sky-500/40 ring-2 ring-inset ring-sky-500"
                      : "")
                }
              >
                {isZero && <span className="font-mono text-xs font-bold text-emerald-900">0</span>}
                {isOne && <span className="font-mono text-xs font-bold text-sky-900">1</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
