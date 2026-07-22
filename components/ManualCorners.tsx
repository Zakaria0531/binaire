"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Corner, Quad } from "@/lib/cv/detectGrid";

interface ManualCornersProps {
  image: HTMLImageElement;
  // Initial corners in source-image pixel coordinates.
  initial: Quad;
  onConfirm: (corners: Quad) => void;
  onCancel?: () => void;
}

const LABELS = ["Top-left", "Top-right", "Bottom-right", "Bottom-left"];

// A draggable four-corner tool used when auto-detection fails. Corners are held
// as normalized [0,1] coordinates so they survive image rescaling, and are
// converted back to source-image pixels on confirm.
export default function ManualCorners({ image, initial, onConfirm, onCancel }: ManualCornersProps) {
  const nw = image.naturalWidth || image.width;
  const nh = image.naturalHeight || image.height;

  const [norm, setNorm] = useState<Corner[]>(() =>
    initial.map((p) => ({ x: p.x / nw, y: p.y / nh })),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const idx = dragging.current;
    const el = containerRef.current;
    if (idx === null || !el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setNorm((prev) => prev.map((p, i) => (i === idx ? { x, y } : p)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const polygon = norm.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Auto-detection didn&apos;t find the grid. Drag the four handles to the
        corners of the puzzle, then continue.
      </p>

      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-md touch-none select-none overflow-hidden rounded-lg"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt="Uploaded puzzle" className="block w-full" draggable={false} />

        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <polygon
            points={polygon}
            className="fill-indigo-500/20 stroke-indigo-500"
            strokeWidth={2}
          />
        </svg>

        {norm.map((p, i) => (
          <button
            key={i}
            type="button"
            title={LABELS[i]}
            onPointerDown={(e) => {
              e.preventDefault();
              dragging.current = i;
            }}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white bg-indigo-600 shadow-md active:cursor-grabbing"
          />
        ))}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            onConfirm(
              norm.map((p) => ({ x: p.x * nw, y: p.y * nh })) as Quad,
            )
          }
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Use these corners
        </button>
      </div>
    </div>
  );
}
