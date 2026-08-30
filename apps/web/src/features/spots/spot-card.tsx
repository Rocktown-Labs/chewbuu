import { buttonVariants } from "@chewbuu/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Clock, Sparkles, Star } from "lucide-react";

import type { DatePlace } from "@/lib/dating-api";

import { SpotImage } from "./spot-image";

const formatPlaceType = (value: string) =>
  value
    .split("_")
    .join(" ")
    .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());

const formatPriceLevel = (value?: string) => {
  if (!value) return null;

  const prices: Record<string, string> = {
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };

  return prices[value] ?? null;
};

export function SpotCard({ spot }: { spot: DatePlace }) {
  const price = formatPriceLevel(spot.priceLevel);
  const detailId = spot.syncLocationId ?? spot.placeId;
  const isSync = spot.dataSource === "sync";

  return (
    <article className="rounded-2xl border border-border bg-card/80 p-3 transition duration-200 hover:border-primary/35 hover:shadow-md sm:p-4">
      <div className="flex min-w-0 gap-3 sm:gap-4">
        <SpotImage className="size-20 sm:size-24" spot={spot} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {isSync ? "Sync verified" : "Google discovery"}
                {!isSync ? (
                  <Sparkles aria-hidden="true" className="size-3" />
                ) : null}
              </p>
              <h3 className="line-clamp-2 font-bold text-foreground text-sm leading-snug sm:text-base">
                {spot.name}
              </h3>
            </div>
            {typeof spot.openNow === "boolean" ? (
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                  spot.openNow
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Clock aria-hidden="true" className="size-3" />
                {spot.openNow ? "Open" : "Closed"}
              </span>
            ) : null}
          </div>

          {spot.address ? (
            <p className="line-clamp-2 text-[11px] text-muted-foreground">
              {spot.address}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {spot.rating ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                <Star
                  aria-hidden="true"
                  className="size-3 fill-yellow-500 text-yellow-500"
                />
                {spot.rating}
                {spot.userRatingCount ? (
                  <span className="font-normal text-muted-foreground">
                    ({spot.userRatingCount})
                  </span>
                ) : null}
              </span>
            ) : null}
            {price ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {price}
              </span>
            ) : null}
            {spot.types.slice(0, 2).map((type) => (
              <span
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                key={type}
              >
                {formatPlaceType(type)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {spot.photoAttributions?.length ? (
        <p className="mt-2 truncate text-[9px] text-muted-foreground">
          Photo: {spot.photoAttributions.join(", ")}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
        <Link
          className={buttonVariants({
            className: "h-8 rounded-full text-xs font-bold",
            size: "sm",
          })}
          hash="menu"
          params={{ locationId: detailId }}
          preload="intent"
          to="/spots/$locationId"
        >
          View menu
        </Link>
        <Link
          className={buttonVariants({
            className: "h-8 rounded-full text-xs font-semibold",
            size: "sm",
            variant: "outline",
          })}
          params={{ locationId: detailId }}
          preload="intent"
          to="/spots/$locationId"
        >
          Get info
        </Link>
      </div>
    </article>
  );
}

export function SpotSection({
  category,
  onViewAll,
  spots,
}: {
  category: "drink" | "eat" | "play";
  onViewAll?: () => void;
  spots: DatePlace[];
}) {
  if (spots.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-lg capitalize">{category}</h3>
        {onViewAll ? (
          <button
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
            onClick={onViewAll}
            type="button"
          >
            View all
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {spots.map((spot) => (
          <SpotCard key={spot.placeId} spot={spot} />
        ))}
      </div>
    </section>
  );
}
