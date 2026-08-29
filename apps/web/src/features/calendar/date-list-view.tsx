import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import { Card, CardContent } from "@chewbuu/ui/components/card";
import {
  MiniCalendar,
  MiniCalendarDay,
  MiniCalendarDays,
  MiniCalendarNavigation,
} from "@chewbuu/ui/components/mini-calendar";
import { CalendarHeart, ChevronRight, MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import type { DatePlace, DatingSummary } from "@/lib/dating-api";

type ScheduledDate = DatingSummary["requests"][number];

interface DateListViewProps {
  dates: ScheduledDate[];
  onOpenDate: (dateId: string) => void;
  onPlanDate: (date: Date) => void;
}

const isSameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const getDateTitle = (date: ScheduledDate) => {
  const placeNames = date.places
    .map((place: DatePlace) => place.name)
    .filter(Boolean)
    .slice(0, 2);
  return placeNames.length > 0
    ? placeNames.join(" · ")
    : `${date.what.join(", ")} date`;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(new Date(value));

export function DateListView({
  dates,
  onOpenDate,
  onPlanDate,
}: DateListViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const sortedDates = useMemo(
    () =>
      dates.toSorted(
        (first, second) =>
          new Date(first.scheduledAt).getTime() -
          new Date(second.scheduledAt).getTime()
      ),
    [dates]
  );
  const visibleDates = selectedDate
    ? sortedDates.filter((date) =>
        isSameDay(new Date(date.scheduledAt), selectedDate)
      )
    : sortedDates;
  const selectedLabel = selectedDate
    ? new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "long",
        weekday: "long",
      }).format(selectedDate)
    : "All scheduled dates";

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/70 to-card/40 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Your date list
          </p>
          <h2 className="mt-1 text-xl font-bold">Upcoming dates</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A compact view of confirmed plans. Pick a day to narrow the list or
            start a new request for that date.
          </p>
        </div>
        <Button
          className="w-full rounded-full sm:w-auto"
          onClick={() => onPlanDate(selectedDate ?? new Date())}
          size="sm"
          type="button"
        >
          <Plus data-icon="inline-start" />
          Plan a date
        </Button>
      </div>

      <MiniCalendar
        aria-label="Choose a date to filter scheduled dates"
        className="w-full justify-between rounded-2xl border-primary/20 bg-background/70"
        days={7}
        onValueChange={setSelectedDate}
        value={selectedDate}
      >
        <MiniCalendarNavigation direction="prev" />
        <MiniCalendarDays className="min-w-0 flex-1 justify-around overflow-hidden">
          {(date) => <MiniCalendarDay date={date} key={date.toISOString()} />}
        </MiniCalendarDays>
        <MiniCalendarNavigation direction="next" />
      </MiniCalendar>

      <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
        <div>
          <h3 className="font-bold text-sm">{selectedLabel}</h3>
          <p className="text-xs text-muted-foreground">
            {visibleDates.length} date{visibleDates.length === 1 ? "" : "s"}
          </p>
        </div>
        {selectedDate ? (
          <Button
            className="rounded-full text-xs"
            onClick={() => setSelectedDate(undefined)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Show all
          </Button>
        ) : null}
      </div>

      {visibleDates.length === 0 ? (
        <Card className="rounded-2xl border-dashed bg-background/30">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <CalendarHeart className="size-7 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">No date on this day</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Start a request and we&apos;ll keep the plan here once it is
                confirmed.
              </p>
            </div>
            <Button
              className="rounded-full"
              onClick={() => onPlanDate(selectedDate ?? new Date())}
              size="sm"
              type="button"
            >
              <Plus data-icon="inline-start" />
              Plan for this day
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {visibleDates.map((date) => (
            <button
              className="group flex w-full items-center gap-3 py-3 text-left transition hover:bg-background/30 sm:gap-4"
              key={date.id}
              onClick={() => onOpenDate(date.id)}
              type="button"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarHeart className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-bold text-sm">
                    {getDateTitle(date)}
                  </span>
                  <Badge
                    className="rounded-full text-[10px]"
                    variant="secondary"
                  >
                    {date.status.replaceAll("_", " ")}
                  </Badge>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDate(date.scheduledAt)}</span>
                  <span>
                    {new Date(date.scheduledAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {date.searchArea ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" /> {date.searchArea}
                    </span>
                  ) : null}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
