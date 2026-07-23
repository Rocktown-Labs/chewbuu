import { cn } from "@chewbuu/ui/lib/utils";
import { Check, Lock } from "lucide-react";

export type StepKey = "request" | "matcher" | "choice" | "date";

export interface StepItem {
  description: string;
  key: StepKey;
  label: string;
  locked?: boolean;
  tone: "done" | "live" | "muted";
}

interface HorizontalStepperProps {
  activeStep: StepKey;
  onSelectStep: (key: StepKey) => void;
  steps: StepItem[];
}

export function HorizontalStepper({
  activeStep,
  onSelectStep,
  steps,
}: HorizontalStepperProps) {
  const activeIndex = steps.findIndex((s) => s.key === activeStep);
  const activeStepObj = steps[activeIndex] ?? steps[0];

  return (
    <div className="w-full max-w-full overflow-x-hidden rounded-xl border border-border/80 bg-card/45 p-2 sm:p-3">
      <ol className="flex w-full items-center justify-between gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isActive = activeStep === step.key;
          const isDone = step.tone === "done";
          const isLocked = step.locked;
          const stepNumber = idx + 1;

          return (
            <li className="flex flex-1 items-center" key={step.key}>
              <button
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "group flex w-full min-w-0 items-center gap-1.5 rounded-lg p-1.5 text-left transition sm:gap-2 sm:p-2",
                  isActive
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-xs"
                    : "hover:bg-accent/40 text-muted-foreground",
                  isLocked && !isActive && "cursor-not-allowed opacity-60"
                )}
                disabled={isLocked && !isActive}
                onClick={() => onSelectStep(step.key)}
                type="button"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition sm:size-7",
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? (
                    <Check className="size-3.5" />
                  ) : isLocked ? (
                    <Lock className="size-3" />
                  ) : (
                    stepNumber
                  )}
                </span>
                <div className="hidden min-w-0 flex-1 sm:block">
                  <p
                    className={cn(
                      "truncate font-semibold text-xs",
                      isActive && "font-bold text-primary"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </button>
              {idx < steps.length - 1 ? (
                <div
                  className={cn(
                    "mx-0.5 h-0.5 w-2 shrink-0 sm:mx-1 sm:w-4 md:w-6",
                    isDone ? "bg-emerald-500/70" : "bg-border/70"
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Mobile step info summary bar */}
      <div className="mt-2 flex items-center justify-between border-border/60 border-t pt-2 px-1 text-[11px] font-semibold sm:hidden">
        <span className="font-bold text-primary">
          Step {activeIndex + 1} of {steps.length}: {activeStepObj.label}
        </span>
        <span className="max-w-[170px] truncate text-muted-foreground">
          {activeStepObj.description}
        </span>
      </div>
    </div>
  );
}
