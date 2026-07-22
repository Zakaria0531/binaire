"use client";

import { useCallback, useRef, useState } from "react";

interface ImageUploaderProps {
  // Called with a loaded HTMLImageElement plus the source object URL, so callers
  // can both display a preview and hand the bitmap to OpenCV downstream.
  onImageSelected: (image: HTMLImageElement, objectUrl: string) => void;
  previewUrl: string | null;
}

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"];

export default function ImageUploader({ onImageSelected, previewUrl }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        setError("Please choose an image file (PNG, JPG, WEBP, …).");
        return;
      }
      setError(null);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => onImageSelected(img, url);
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setError("That image could not be loaded.");
      };
      img.src = url;
    },
    [onImageSelected],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={
          "relative flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition-colors " +
          (dragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
            : "border-zinc-300 bg-zinc-50 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-indigo-500")
        }
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Uploaded puzzle preview"
            className="max-h-72 w-auto rounded-lg object-contain shadow-sm"
          />
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-6 w-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V6m0 0L7.5 10.5M12 6l4.5 4.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5v1.5A2.25 2.25 0 006.75 20.25h10.5A2.25 2.25 0 0019.5 18v-1.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Drop a puzzle photo here, or click to browse
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                A clear, straight-on shot works best.
              </p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadFile(file);
            // Reset so re-selecting the same file fires change again.
            e.target.value = "";
          }}
        />
      </div>
      {previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="self-start text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Choose a different image
        </button>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
