import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import { Progress } from "@chewbuu/ui/components/progress";
import { CalendarHeart, Flame, Sparkles, Star, Trophy } from "lucide-react";

interface AnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsDrawer({ isOpen, onClose }: AnalyticsDrawerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            <DialogTitle className="font-extrabold text-xl">
              Dating Analytics & Streaks
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Track your date streaks, monthly venue bookings, and food recap
            engagement.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-4">
          {/* Main Streak Banner */}
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500 text-white font-extrabold shadow-md">
                <Flame className="size-7 animate-pulse" />
              </div>
              <div>
                <Badge className="rounded-full bg-amber-500/20 text-amber-600 font-extrabold text-[9px] border-0 mb-0.5">
                  🔥 Active Streak
                </Badge>
                <h4 className="font-extrabold text-lg">3 Consecutive Dates</h4>
                <p className="text-xs text-muted-foreground">
                  Keep it going! Plan 1 more date this weekend for a 4-date
                  badge.
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Bookings & Goal Progress */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarHeart className="size-4 text-primary" />
                <h4 className="font-extrabold text-sm">July Date Goal</h4>
              </div>
              <span className="font-bold text-xs text-primary">
                4 / 5 Bookings
              </span>
            </div>
            <Progress className="h-2.5 rounded-full" value={80} />
            <p className="text-[11px] text-muted-foreground">
              You're 80% of the way to your monthly dating target!
            </p>
          </div>

          {/* Favorite Category Distribution */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Star className="size-4 text-amber-500" />
              <h4 className="font-extrabold text-sm">
                Venue Preference Breakdown
              </h4>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>☕ Eat & Coffee (40%)</span>
                  <span className="text-muted-foreground">5 Dates</span>
                </div>
                <Progress className="h-2 rounded-full" value={40} />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>🍸 Drink & Lounge (35%)</span>
                  <span className="text-muted-foreground">4 Dates</span>
                </div>
                <Progress className="h-2 rounded-full" value={35} />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>🎳 Play & Activities (25%)</span>
                  <span className="text-muted-foreground">3 Dates</span>
                </div>
                <Progress className="h-2 rounded-full" value={25} />
              </div>
            </div>
          </div>

          {/* Recap Video Engagement */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Sparkles className="size-4 text-purple-500" />
              <h4 className="font-extrabold text-sm">Food Recap Performance</h4>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border/60 bg-background/50 p-2.5">
                <span className="font-extrabold text-base text-foreground">
                  1,240
                </span>
                <span className="block text-[10px] text-muted-foreground font-semibold">
                  Views
                </span>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-2.5">
                <span className="font-extrabold text-base text-rose-500">
                  184
                </span>
                <span className="block text-[10px] text-muted-foreground font-semibold">
                  Likes
                </span>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-2.5">
                <span className="font-extrabold text-base text-primary">
                  32
                </span>
                <span className="block text-[10px] text-muted-foreground font-semibold">
                  Date Plans
                </span>
              </div>
            </div>
          </div>

          <Button
            className="w-full rounded-full font-bold text-xs"
            onClick={onClose}
            type="button"
          >
            Close Analytics
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
