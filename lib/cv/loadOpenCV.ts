import type { OpenCV } from "./opencv";

// Lazy CDN loader for the OpenCV.js WASM build. The bundle is several MB, so it
// is only injected on first call (i.e. when the user actually enters the
// detection flow), never on initial page load.

// Verified 200 on 2026-07-22: 7.9 MB WASM build, uses onRuntimeInitialized.
const OPENCV_URL = "https://cdn.jsdelivr.net/npm/opencv.js@1.2.1/opencv.js";

type MaybeCv = {
  cv?: unknown;
};

// A cv instance is "ready" once its WASM runtime has initialized, which we
// detect by the presence of the Mat constructor.
function isReady(candidate: unknown): candidate is OpenCV {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof (candidate as { Mat?: unknown }).Mat === "function"
  );
}

let cvPromise: Promise<OpenCV> | null = null;

export function loadOpenCV(): Promise<OpenCV> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV.js can only be loaded in the browser."));
  }
  if (cvPromise) return cvPromise;

  cvPromise = new Promise<OpenCV>((resolve, reject) => {
    const w = window as Window & MaybeCv;

    if (isReady(w.cv)) {
      resolve(w.cv);
      return;
    }

    const finish = (instance: OpenCV) => {
      w.cv = instance;
      resolve(instance);
    };

    const onScriptReady = () => {
      const loaded = w.cv;

      // Some builds expose a thenable module factory; others attach a runtime
      // callback; others are already ready synchronously.
      if (loaded && typeof (loaded as { then?: unknown }).then === "function") {
        (loaded as Promise<OpenCV>).then(finish, reject);
      } else if (isReady(loaded)) {
        finish(loaded);
      } else if (loaded && typeof loaded === "object") {
        (loaded as { onRuntimeInitialized?: () => void }).onRuntimeInitialized = () => {
          if (isReady(w.cv)) finish(w.cv);
          else reject(new Error("OpenCV.js initialized without a usable runtime."));
        };
      } else {
        reject(new Error("OpenCV.js loaded but did not expose the cv module."));
      }
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${OPENCV_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", onScriptReady, { once: true });
      existing.addEventListener(
        "error",
        () => {
          existing.remove();
          cvPromise = null;
          reject(new Error("Failed to load OpenCV.js from CDN."));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = OPENCV_URL;
    script.async = true;
    script.onload = onScriptReady;
    script.onerror = () => {
      script.remove();
      cvPromise = null;
      reject(new Error("Failed to load OpenCV.js from CDN."));
    };
    document.body.appendChild(script);
  });

  return cvPromise;
}
