import { Badge } from "@chewbuu/ui/components/badge";
import { Button, buttonVariants } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Globe2,
  MapPin,
  Phone,
  Sparkles,
  Star,
  Tag,
  Utensils,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  spotsApi,
  type PublicSpotDetails,
  type PublicSpotMenuResponse,
} from "@/lib/dating-api";

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

const menuReason = (reason?: PublicSpotMenuResponse["reason"]) => {
  if (reason === "firecrawl_not_configured") {
    return "AI menu previews are not configured yet.";
  }
  if (reason === "invalid_menu") {
    return "We could not find a readable menu on the official website.";
  }
  return "No menu preview is available for this spot yet.";
};

export function PublicSpotPage({ placeId }: { placeId: string }) {
  const [details, setDetails] = useState<PublicSpotDetails | null>(null);
  const [menuResponse, setMenuResponse] =
    useState<PublicSpotMenuResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await spotsApi.get(placeId);
        if (isMounted) setDetails(result);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Spot details are unavailable."
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void loadDetails();
    return () => {
      isMounted = false;
    };
  }, [placeId]);

  const loadMenu = useCallback(async () => {
    if (!details || details.source === "sync") return;
    setIsLoadingMenu(true);
    try {
      setMenuResponse(await spotsApi.getMenu(placeId));
    } catch (loadError) {
      setMenuResponse({
        menu: null,
        place: details.place,
        reason: loadError instanceof Error ? "unavailable" : "invalid_menu",
        source: "google",
      });
    } finally {
      setIsLoadingMenu(false);
    }
  }, [details, placeId]);

  useEffect(() => {
    if (details?.source === "google" && window.location.hash === "#menu") {
      void loadMenu();
    }
  }, [details, loadMenu]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
        <p className="text-sm text-muted-foreground">Loading spot details…</p>
      </main>
    );
  }

  if (error || !details) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12">
        <Card className="w-full max-w-lg border-dashed">
          <CardHeader>
            <CardTitle>This spot is unavailable</CardTitle>
            <CardDescription>
              {error ?? "The place may no longer be public or discoverable."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants()} to="/spots">
              Back to Spots
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { place, source, syncSummary } = details;
  const price = formatPriceLevel(place.priceLevel);
  const isSync = source === "sync";
  const menuItems =
    syncSummary?.menuItems ?? menuResponse?.syncSummary?.menuItems ?? [];

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          to="/spots"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to Spots
        </Link>

        <header className="mt-8 rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:p-6">
          <div className="flex gap-4 sm:gap-5">
            <SpotImage className="size-24 sm:size-32" spot={place} />
            <div className="min-w-0 flex-1">
              <Badge variant={isSync ? "default" : "secondary"}>
                {isSync ? "Sync verified" : "Google discovery"}
              </Badge>
              <h1 className="mt-3 text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
                {place.name}
              </h1>
              {place.address ? (
                <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {place.address}
                </p>
              ) : null}
            </div>
          </div>
          {place.photoAttributions?.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Photo: {place.photoAttributions.join(", ")}
            </p>
          ) : null}
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                <Star
                  aria-hidden="true"
                  className="size-5 fill-yellow-500 text-yellow-500"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Google rating</p>
                <p className="font-semibold">
                  {place.rating ?? "Not available"}
                  {place.userRatingCount ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({place.userRatingCount.toLocaleString()} reviews)
                    </span>
                  ) : null}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                <Clock aria-hidden="true" className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current status</p>
                <p className="font-semibold">
                  {typeof place.openNow === "boolean"
                    ? place.openNow
                      ? "Open now"
                      : "Closed now"
                    : "Hours not available"}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-card/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Place details
              </p>
              <h2 className="mt-1 font-semibold text-xl">
                Plan with the full picture
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {price ? <Badge variant="secondary">{price}</Badge> : null}
              {place.types.slice(0, 4).map((type) => (
                <Badge key={type} variant="secondary">
                  {formatPlaceType(type)}
                </Badge>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {place.websiteUri ? (
              <a
                className={buttonVariants({
                  variant: "outline",
                  className: "rounded-full",
                })}
                href={place.websiteUri}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Globe2 aria-hidden="true" /> Official website
              </a>
            ) : null}
            {place.phone ? (
              <a
                className={buttonVariants({
                  variant: "outline",
                  className: "rounded-full",
                })}
                href={`tel:${place.phone}`}
              >
                <Phone aria-hidden="true" /> Call
              </a>
            ) : null}
            {place.googleMapsUri ? (
              <a
                className={buttonVariants({
                  variant: "outline",
                  className: "rounded-full",
                })}
                href={place.googleMapsUri}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" /> Google Maps
              </a>
            ) : null}
          </div>
          {!isSync ? (
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <Sparkles
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-primary"
              />
              Google provides discovery details. Chewbuu does not verify this
              business information.
            </p>
          ) : null}
        </section>

        <section className="mt-5" id="menu">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Utensils aria-hidden="true" className="size-5 text-primary" />
              <h2 className="font-semibold text-2xl">Menu</h2>
            </div>
            {isSync ? (
              <Badge>Sync menu</Badge>
            ) : (
              <Button
                className="rounded-full"
                disabled={isLoadingMenu}
                onClick={() => void loadMenu()}
                type="button"
              >
                <Sparkles aria-hidden="true" />
                {isLoadingMenu ? "Checking menu…" : "AI menu preview"}
              </Button>
            )}
          </div>
          {isSync ? (
            menuItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {menuItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-primary">
                          {item.section ?? "Menu"}
                        </p>
                        <p className="mt-1 font-semibold">{item.name}</p>
                        {item.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      <span className="font-semibold">
                        ${(item.priceCents / 100).toFixed(2)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="mt-4 border-dashed">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  This Sync venue is still building its verified Chewbuu menu.
                </CardContent>
              </Card>
            )
          ) : menuResponse?.menu ? (
            <div className="mt-4 space-y-3">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  AI-cleaned from the official website. This preview is
                  unverified and may be out of date.
                </CardContent>
              </Card>
              {menuResponse.menu.items.map((item, index) => (
                <Card key={`${item.name}-${index}`}>
                  <CardContent className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {item.section ?? "Menu"}
                    </p>
                    <p className="mt-1 font-semibold">{item.name}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    {item.price ? (
                      <p className="mt-2 text-sm font-semibold">{item.price}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mt-4 border-dashed">
              <CardContent className="p-5 text-sm text-muted-foreground">
                {menuResponse
                  ? menuReason(menuResponse.reason)
                  : "Use AI menu preview to check the official website."}
              </CardContent>
            </Card>
          )}
        </section>

        {syncSummary?.specials.length ? (
          <section className="mt-8">
            <div className="flex items-center gap-2">
              <Tag aria-hidden="true" className="size-5 text-primary" />
              <h2 className="font-semibold text-2xl">Current specials</h2>
            </div>
            <div className="mt-4 space-y-3">
              {syncSummary.specials.map((special) => (
                <Card key={special.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-primary">
                          {special.category}
                        </p>
                        <CardTitle className="mt-1">{special.title}</CardTitle>
                      </div>
                      {special.priceText ? (
                        <Badge variant="secondary">{special.priceText}</Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  {special.description ? (
                    <CardContent className="text-sm text-muted-foreground">
                      {special.description}
                    </CardContent>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin aria-hidden="true" className="size-3.5" />
          {isSync
            ? "Venue details and menu are published by Chewbuu Sync."
            : "Business details are provided by Google Places; menu previews are AI-generated and unverified."}
        </p>
      </div>
    </main>
  );
}
