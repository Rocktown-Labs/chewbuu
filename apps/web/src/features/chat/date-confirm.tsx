import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import { Input } from "@chewbuu/ui/components/input";
import {
  QRCode,
  QRCodeOverlay,
  QRCodeSkeleton,
  QRCodeSvg,
} from "@chewbuu/ui/components/qr-code";
import { cn } from "@chewbuu/ui/lib/utils";
import {
  CalendarClock,
  CloudSun,
  MapPin,
  Navigation,
  QrCode,
  ScanLine,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ChatPerson, DateScenarioRole } from "./chat-types";
import { personInitials } from "./chat-ui";

export interface DatePlaceOption {
  address?: string;
  name: string;
  placeId: string;
  rating?: string;
}

export interface DateConfirmScreenProps {
  onCancelDate?: () => void;
  onCheckedIn?: () => void;
  onFinalize?: () => void;
  onOpenChat?: () => void;
  onReschedule?: (nextIso: string) => void;
  onSuggestPlace?: (placeName: string) => void;
  partner: ChatPerson;
  places: DatePlaceOption[];
  role: DateScenarioRole;
  scheduledAt: string;
  searchArea: string;
  title: string;
}

interface WeatherDay {
  high: number;
  low: number;
  precip: number;
  summary: string;
}

const NASHVILLE = { lat: 36.1627, lon: -86.7816 };

async function fetchWeather(): Promise<WeatherDay | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(NASHVILLE.lat));
    url.searchParams.set("longitude", String(NASHVILLE.lon));
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode"
    );
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "1");
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const data = (await response.json()) as {
      daily?: {
        precipitation_probability_max?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        weathercode?: number[];
      };
    };
    const high = data.daily?.temperature_2m_max?.[0];
    const low = data.daily?.temperature_2m_min?.[0];
    const precip = data.daily?.precipitation_probability_max?.[0] ?? 0;
    if (high === undefined || low === undefined) return null;
    return {
      high: Math.round(high),
      low: Math.round(low),
      precip,
      summary:
        precip > 40
          ? "Bring a layer — rain possible"
          : "Clear enough for walking",
    };
  } catch {
    return null;
  }
}

export function DateConfirmScreen({
  onCancelDate,
  onCheckedIn,
  onFinalize,
  onOpenChat,
  onReschedule,
  onSuggestPlace,
  partner,
  places: initialPlaces,
  role,
  scheduledAt,
  searchArea,
  title,
}: DateConfirmScreenProps) {
  const [places, setPlaces] = useState(initialPlaces);
  const [locked, setLocked] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const rescheduleTokensLeft = "2";
  const cancelStrikeCount = "0";
  const [weather, setWeather] = useState<WeatherDay | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const day = await fetchWeather();
      if (active) setWeather(day);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const when = useMemo(() => new Date(scheduledAt), [scheduledAt]);
  const qrValue = useMemo(
    () =>
      JSON.stringify({
        app: "chewbuu",
        partnerId: partner.id,
        t: scheduledAt,
        v: 1,
      }),
    [partner.id, scheduledAt]
  );

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${places[0]?.name ?? searchArea} ${places[0]?.address ?? ""}`
  )}`;

  const handleFinalize = () => {
    setLocked(true);
    onFinalize?.();
    toast.success("Date plan locked. Chat stays open until check-in.");
  };

  const handleCheckIn = () => {
    setCheckedIn(true);
    setScanOpen(false);
    setShowQr(false);
    onCheckedIn?.();
    toast.success("Checked in — live date unlocked.");
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl border-border bg-card/50">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>
                {role === "sender"
                  ? "You started this request — adjust spots before locking."
                  : "You received this request — suggest a spot if needed."}
              </CardDescription>
            </div>
            <Badge className="rounded-full" variant="secondary">
              {role === "sender" ? "Requester" : "Invitee"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 p-3">
            <Avatar className="size-12 border border-border">
              <AvatarImage src={partner.avatar} />
              <AvatarFallback>{personInitials(partner.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm">{partner.name}</p>
              <p className="text-xs text-muted-foreground">
                {partner.compatibility
                  ? `${partner.compatibility}% match · `
                  : null}
                {when.toLocaleString([], {
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  month: "short",
                  weekday: "short",
                })}
              </p>
            </div>
            {onOpenChat ? (
              <Button
                className="rounded-full text-xs"
                onClick={onOpenChat}
                size="sm"
                type="button"
                variant="outline"
              >
                Open chat
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CalendarClock className="size-3.5 text-primary" />
                When
              </div>
              <p className="mt-1 text-sm">
                {when.toLocaleString([], {
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  month: "long",
                  weekday: "long",
                })}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {searchArea}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CloudSun className="size-3.5 text-primary" />
                Day-of weather
              </div>
              {weather ? (
                <>
                  <p className="mt-1 text-sm">
                    {weather.high}° / {weather.low}°F
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {weather.summary} · {weather.precip}% rain
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Loading forecast…
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">Spots</span>
              <a
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                href={mapsUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Navigation className="size-3" />
                Directions
              </a>
            </div>
            {places.map((place, index) => (
              <div
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/60 p-3"
                key={place.placeId}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-bold text-xs">
                      {index + 1}. {place.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {place.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {place.rating ? (
                    <Badge
                      className="rounded-full text-[10px]"
                      variant="secondary"
                    >
                      <Star
                        className="fill-amber-400 text-amber-400"
                        data-icon="inline-start"
                      />
                      {place.rating}
                    </Badge>
                  ) : null}
                  {!locked && role === "sender" ? (
                    <Button
                      className="h-7 rounded-full px-2 text-[10px]"
                      onClick={() => {
                        setPlaces((prev) => {
                          const next = [...prev];
                          const [item] = next.splice(index, 1);
                          next.push(item);
                          return next;
                        });
                        toast.message(`Moved ${place.name} to the end`);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Reorder
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}

            {!locked && role === "receiver" ? (
              <div className="flex gap-2">
                <Input
                  className="h-9 rounded-full text-xs"
                  onChange={(event) => setSuggestion(event.target.value)}
                  placeholder="Suggest a different spot…"
                  value={suggestion}
                />
                <Button
                  className="rounded-full text-xs"
                  onClick={() => {
                    if (!suggestion.trim()) return;
                    onSuggestPlace?.(suggestion.trim());
                    toast.success("Suggestion sent to the requester");
                    setSuggestion("");
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Suggest
                </Button>
              </div>
            ) : null}
          </div>

          {!locked ? (
            <Button
              className="w-full rounded-full font-bold"
              onClick={handleFinalize}
              type="button"
            >
              Confirm & lock plan
            </Button>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div
                  className={cn(
                    "rounded-2xl border border-border bg-background p-3 shadow-sm",
                    checkedIn && "opacity-60"
                  )}
                >
                  <QRCode
                    backgroundColor="#fffaf0"
                    foregroundColor="#3b2415"
                    level="H"
                    size={168}
                    value={qrValue}
                  >
                    <QRCodeSvg className="rounded-lg" />
                    <QRCodeOverlay className="flex size-10 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground shadow">
                      CB
                    </QRCodeOverlay>
                    <QRCodeSkeleton className="rounded-lg" />
                  </QRCode>
                </div>
                <div>
                  <p className="font-bold text-sm">Venue check-in</p>
                  <p className="mt-0.5 max-w-sm text-[11px] text-muted-foreground">
                    Show your Chewbuu code or scan theirs when you arrive.
                    Either person can start.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  className="rounded-full"
                  disabled={checkedIn}
                  onClick={() => setShowQr(true)}
                  type="button"
                >
                  <QrCode data-icon="inline-start" />
                  Show my code
                </Button>
                <Button
                  className="rounded-full"
                  disabled={checkedIn}
                  onClick={() => setScanOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <ScanLine data-icon="inline-start" />
                  Scan partner
                </Button>
              </div>
              {checkedIn ? (
                <Badge className="mx-auto rounded-full" variant="secondary">
                  Checked in
                </Badge>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
            <Button
              className="rounded-full text-xs"
              onClick={() => setRescheduleOpen(true)}
              type="button"
              variant="outline"
            >
              Reschedule
            </Button>
            <Button
              className="rounded-full text-xs"
              onClick={() => setCancelOpen(true)}
              type="button"
              variant="ghost"
            >
              Cancel date
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Your check-in code</DialogTitle>
            <DialogDescription>
              Have {partner.name.split(" ")[0]} scan this at the venue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <QRCode
              backgroundColor="#fffaf0"
              foregroundColor="#3b2415"
              level="H"
              size={220}
              value={qrValue}
            >
              <QRCodeSvg className="rounded-xl" />
              <QRCodeOverlay className="flex size-12 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                CB
              </QRCodeOverlay>
              <QRCodeSkeleton className="rounded-xl" />
            </QRCode>
          </div>
          <DialogFooter>
            <Button
              className="w-full rounded-full"
              onClick={handleCheckIn}
              type="button"
            >
              Simulate successful scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan partner code</DialogTitle>
            <DialogDescription>
              Point your camera at their Chewbuu QR when you arrive.
            </DialogDescription>
          </DialogHeader>
          <div className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ScanLine className="size-10" />
              <p className="text-xs">Camera preview (demo)</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full rounded-full"
              onClick={handleCheckIn}
              type="button"
            >
              Simulate scan success
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule this date?</DialogTitle>
            <DialogDescription>
              You have {rescheduleTokensLeft} free reschedules left this week.
              Extra reschedules lower your reliability score and may pause new
              requests.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">
            Penalty path: use a token now, or after tokens hit 0 take a
            reliability strike. Three strikes in 30 days locks booking for 7
            days.
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              className="rounded-full"
              onClick={() => setRescheduleOpen(false)}
              type="button"
              variant="ghost"
            >
              Keep plan
            </Button>
            <Button
              className="rounded-full"
              onClick={() => {
                const next = new Date(when);
                next.setDate(next.getDate() + 1);
                onReschedule?.(next.toISOString());
                setRescheduleOpen(false);
                toast.message("Reschedule requested — token used");
              }}
              type="button"
            >
              Use 1 token & reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this date?</DialogTitle>
            <DialogDescription>
              Late cancels (under 12 hours) count as a strike. You currently
              have {cancelStrikeCount} strikes.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs">
            Canceling now notifies {partner.name}, frees the slot, and may
            reduce your daily booking allowance if you cancel often.
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              className="rounded-full"
              onClick={() => setCancelOpen(false)}
              type="button"
              variant="ghost"
            >
              Keep date
            </Button>
            <Button
              className="rounded-full"
              onClick={() => {
                onCancelDate?.();
                setCancelOpen(false);
                toast.error("Date canceled — reliability updated");
              }}
              type="button"
              variant="destructive"
            >
              Cancel & accept penalty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
