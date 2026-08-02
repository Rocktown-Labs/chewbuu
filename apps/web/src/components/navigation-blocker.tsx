import { Button } from "@chewbuu/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import { useBlocker } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

interface NavigationBlockerProps {
  cancelText?: string;
  confirmText?: string;
  description?: string;
  shouldBlock: boolean;
  title?: string;
}

export function NavigationBlocker({
  cancelText = "Stay on Page",
  confirmText = "Leave & Lose Progress",
  description = "You have unsaved changes or active progress that will be lost if you leave now. Are you sure you want to navigate away?",
  shouldBlock,
  title = "Unsaved Progress",
}: NavigationBlockerProps) {
  const blocker = useBlocker({
    shouldBlockFn: () => shouldBlock,
    withResolver: true,
  });

  const isBlocked = blocker.status === "blocked";

  return (
    <Dialog
      open={isBlocked}
      onOpenChange={(open) => {
        if (!open && blocker.status === "blocked") {
          blocker.reset?.();
        }
      }}
    >
      <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <DialogHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="size-6" />
          </div>
          <DialogTitle className="font-bold text-foreground text-lg">
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            className="w-full rounded-full sm:w-auto"
            onClick={() => blocker.reset?.()}
            variant="outline"
          >
            {cancelText}
          </Button>
          <Button
            className="w-full rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            onClick={() => blocker.proceed?.()}
            variant="destructive"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
