import type {
  ModerationReportCategory,
  ModerationReportTargetType,
} from "@chewbuu/aws-blocks";
import { Button } from "@chewbuu/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { moderationApi } from "@/lib/dating-api";

const categoryLabels: Record<ModerationReportCategory, string> = {
  harassment_or_bullying: "Harassment or bullying",
  hate_or_discrimination: "Hate or discrimination",
  impersonation_or_fraud: "Impersonation or fraud",
  minor_safety: "Minor safety concern",
  non_consensual_intimate_content: "Non-consensual intimate content",
  other: "Something else",
  privacy_violation: "Privacy violation",
  scam_or_spam: "Scam or spam",
  self_harm: "Self-harm concern",
  sexual_content: "Sexual content",
  threats_or_violence: "Threats or violence",
};

const categories = Object.keys(categoryLabels) as ModerationReportCategory[];

export function ReportButton({
  className,
  label = "Report",
  targetId,
  targetType,
}: {
  className?: string;
  label?: string;
  targetId: string;
  targetType: ModerationReportTargetType;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        aria-label={label}
        className={className}
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Flag />
        {label}
      </Button>
      <ReportDialog
        onOpenChange={setOpen}
        open={open}
        targetId={targetId}
        targetType={targetType}
      />
    </>
  );
}

export function ReportDialog({
  onOpenChange,
  open,
  targetId,
  targetType,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  targetId: string;
  targetType: ModerationReportTargetType;
}) {
  const [category, setCategory] = useState<ModerationReportCategory>("other");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await moderationApi.createReport({
        category,
        details: details.trim() || undefined,
        targetId,
        targetType,
      });
      toast.success("Report submitted. Our team will review it.");
      setDetails("");
      setCategory("other");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit report."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle>Report this content</DialogTitle>
          <DialogDescription>
            Tell us what happened. Reports are reviewed by Chewbuu staff. If
            someone is in immediate danger, contact local emergency services.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" htmlFor="report-category">
              Reason
            </label>
            <select
              className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
              id="report-category"
              onChange={(event) =>
                setCategory(event.target.value as ModerationReportCategory)
              }
              value={category}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {categoryLabels[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" htmlFor="report-details">
              Details (optional)
            </label>
            <Textarea
              id="report-details"
              maxLength={2000}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Share the context a reviewer should know."
              rows={5}
              value={details}
            />
            <p className="text-xs text-muted-foreground">
              Do not include passwords, payment information, or emergency-only
              requests.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={submitting} onClick={handleSubmit} type="button">
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
