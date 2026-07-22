"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GridEditor from "@/components/GridEditor";
import SolutionStepper from "@/components/SolutionStepper";
import { solve } from "@/lib/solver/solve";
import type { Grid, SolveResult } from "@/lib/solver/types";
import { loadPendingPuzzle } from "@/lib/session";

interface Solved {
  result: SolveResult;
  // The grid exactly as submitted, so the stepper can replay from it.
  submitted: Grid;
}

export default function SolvePage() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [solved, setSolved] = useState<Solved | null>(null);

  useEffect(() => {
    // Read the handed-off puzzle on the client only: sessionStorage is
    // unavailable during SSR, and reading it in a lazy initializer would cause a
    // hydration mismatch. A one-time mount read is the correct place for this.
    const pending = loadPendingPuzzle();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pending) setGrid(pending.grid);
  }, []);

  if (!grid) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No puzzle to solve yet
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Upload a photo of a binary puzzle to get started.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            ← Upload a puzzle
          </Link>
        </div>
      </div>
    );
  }

  const outcome = solved?.result.outcome;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <main className="w-full max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
            Review &amp; solve
          </h1>
          <Link href="/" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            ← New puzzle
          </Link>
        </header>

        {!solved && (
          <section className="flex flex-col items-center gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Check the reading against your photo. Click any cell to cycle it
              through <span className="font-mono">·</span> → 0 → 1. When it matches, solve.
            </p>
            <GridEditor grid={grid} onChange={setGrid} />
            <button
              type="button"
              onClick={() => setSolved({ result: solve(grid), submitted: grid.map((r) => r.slice()) })}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Solve
            </button>
          </section>
        )}

        {solved && (
          <section className="flex flex-col gap-5">
            <OutcomeBanner outcome={outcome!} />

            {outcome === "unique" && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <SolutionStepper baseGrid={solved.submitted} steps={solved.result.steps} />
              </div>
            )}

            {outcome !== "unique" && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Your grid as entered:
                </p>
                <GridEditor grid={solved.submitted} />
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSolved(null)}
                className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                ← Edit the grid
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function OutcomeBanner({ outcome }: { outcome: SolveResult["outcome"] }) {
  const config = {
    unique: {
      tone: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
      title: "Solved — unique solution",
      body: "Step through the moves below to see exactly how it resolves.",
    },
    multiple: {
      tone: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
      title: "Multiple solutions",
      body: "A valid binary puzzle has exactly one solution, so this usually means a cell was misread. Go back and correct the grid against your photo.",
    },
    unsolvable: {
      tone: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
      title: "No solution",
      body: "The grid as entered breaks the rules and can't be completed. Check for a misread digit and try again.",
    },
  }[outcome];

  return (
    <div className={"rounded-xl border p-4 " + config.tone}>
      <p className="font-semibold">{config.title}</p>
      <p className="mt-1 text-sm opacity-90">{config.body}</p>
    </div>
  );
}
