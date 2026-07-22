"use client";

import { useMemo, useState } from "react";
import type { Grid, Step, StepRule } from "@/lib/solver/types";
import GridEditor from "./GridEditor";

interface SolutionStepperProps {
  // The grid as it stood when Solve was pressed (user-corrected extraction).
  baseGrid: Grid;
  steps: Step[];
}

const RULE_LABELS: Record<StepRule, string> = {
  "avoid-triple": "Avoid triple",
  sandwich: "Sandwich",
  quota: "Row/column quota",
  search: "Search",
};

const RULE_TONE: Record<StepRule, string> = {
  "avoid-triple": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  sandwich: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  quota: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
  search: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
};

export default function SolutionStepper({ baseGrid, steps }: SolutionStepperProps) {
  // 0 = nothing applied (just the base grid); steps.length = fully solved.
  const [cursor, setCursor] = useState(steps.length);

  // Grid with the first `cursor` steps applied.
  const shown = useMemo(() => {
    const g = baseGrid.map((row) => row.slice());
    for (let i = 0; i < cursor; i++) {
      const s = steps[i];
      g[s.row][s.col] = s.value;
    }
    return g;
  }, [baseGrid, steps, cursor]);

  const currentStep = cursor > 0 ? steps[cursor - 1] : null;
  const highlight = currentStep ? { row: currentStep.row, col: currentStep.col } : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <GridEditor grid={shown} baseGrid={baseGrid} highlight={highlight} />

        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Step {cursor} of {steps.length}
            </span>
            <div className="flex gap-1">
              <StepBtn label="⏮" title="First" onClick={() => setCursor(0)} disabled={cursor === 0} />
              <StepBtn label="‹" title="Previous" onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0} />
              <StepBtn label="›" title="Next" onClick={() => setCursor((c) => Math.min(steps.length, c + 1))} disabled={cursor === steps.length} />
              <StepBtn label="⏭" title="Last" onClick={() => setCursor(steps.length)} disabled={cursor === steps.length} />
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={steps.length}
            value={cursor}
            onChange={(e) => setCursor(Number(e.target.value))}
            className="w-full accent-indigo-600"
            aria-label="Solution step"
          />

          <div className="min-h-24 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            {currentStep ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + RULE_TONE[currentStep.rule]}>
                    {RULE_LABELS[currentStep.rule]}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    r{currentStep.row + 1}, c{currentStep.col + 1} → {currentStep.value}
                  </span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{currentStep.detail}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                The starting grid, before any moves. Step forward to watch it solve.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepBtn({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {label}
    </button>
  );
}
