import { Badge } from "@chewbuu/ui/components/badge";
import { Button, buttonVariants } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Input } from "@chewbuu/ui/components/input";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Camera,
  Check,
  ExternalLink,
  Globe2,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  connectApi,
  venueApi,
  type DatePlace,
  type VenueIdentityVerificationSession,
  type VenueLocation,
  type VenueMenuItem,
  type VenueMenuPreview,
  type VenueReferral,
} from "@/lib/dating-api";

export const Route = createFileRoute("/venue-portal")({
  component: VenuePortalPage,
  ssr: false,
});

function VenuePortalPage() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isClaimRequested, setIsClaimRequested] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [location, setLocation] = useState<VenueLocation | null>(null);
  const [venueQuery, setVenueQuery] = useState("");
  const [venueResults, setVenueResults] = useState<DatePlace[]>([]);
  const [isSearchingVenues, setIsSearchingVenues] = useState(false);
  const [venueSearchMessage, setVenueSearchMessage] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [menuPlan, setMenuPlan] = useState<"chewbuu" | "website">("chewbuu");
  const [preview, setPreview] = useState<VenueMenuPreview | null>(null);
  const [referral, setReferral] = useState<VenueReferral | undefined>();
  const [isStartingReferralOnboarding, setIsStartingReferralOnboarding] =
    useState(false);
  const [form, setForm] = useState({
    address: "",
    description: "",
    menuUrl: "",
    name: "",
    organizationName: "",
    phone: "",
    websiteUrl: "",
  });

  useEffect(() => {
    const loadSession = async () => {
      const session = await authClient.getSession();
      setIsSignedIn(Boolean(session.data));
    };
    void loadSession();
  }, []);

  useEffect(() => {
    const query = venueQuery.trim();
    if (isSignedIn !== true || query.length < 2) {
      setVenueResults([]);
      setVenueSearchMessage("");
      setIsSearchingVenues(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setIsSearchingVenues(true);
      setVenueSearchMessage("");
      try {
        const result = await venueApi.searchVenues(query);
        if (!active) return;
        setVenueResults(result.places);
        setVenueSearchMessage(
          result.reason === "google_not_configured"
            ? "Search is temporarily unavailable. You can still enter the venue manually."
            : result.reason === "unavailable"
              ? "We couldn’t search right now. You can still enter the venue manually."
              : result.places.length === 0
                ? "No exact matches yet. Keep typing or enter the details below."
                : ""
        );
      } catch {
        if (active) {
          setVenueResults([]);
          setVenueSearchMessage(
            "We couldn’t search right now. You can still enter the venue manually."
          );
        }
      } finally {
        if (active) setIsSearchingVenues(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [isSignedIn, venueQuery]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectVenue = (place: DatePlace) => {
    setSelectedPlaceId(place.placeId);
    setVenueQuery(place.name);
    setVenueResults([]);
    setVenueSearchMessage("");
    setForm((current) => ({
      ...current,
      address: place.address ?? current.address,
      name: place.name,
      phone: place.phone ?? current.phone,
      websiteUrl: place.websiteUri ?? current.websiteUrl,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await venueApi.createLocation({
        address: form.address,
        description: form.description || undefined,
        discoveryPlaceId: selectedPlaceId ?? undefined,
        menuUrl: menuPlan === "website" ? form.menuUrl || undefined : undefined,
        name: form.name,
        organizationName: form.organizationName || undefined,
        phone: form.phone,
        venueRole: isOwner ? "owner" : "referrer",
        websiteUrl: form.websiteUrl,
      });
      setLocation(result.location);
      setReferral(result.referral);

      if (isOwner) {
        const claimResult = await venueApi.requestClaim(result.location.id);
        setIsClaimRequested(claimResult.status === "requested");
      }

      if (menuPlan === "website" && form.menuUrl) {
        setIsPreviewing(true);
        const menuResult = await venueApi.captureMenu(
          result.location.id,
          form.menuUrl
        );
        setPreview(menuResult.preview);
        if (
          !menuResult.preview &&
          menuResult.reason === "firecrawl_not_configured"
        ) {
          toast.info(
            "Menu preview will be available once Firecrawl is configured."
          );
        }
      }
      toast.success(
        isOwner ? "Venue setup started." : "Venue sent to Chewbuu."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not set up venue."
      );
    } finally {
      setIsPreviewing(false);
      setIsSubmitting(false);
    }
  };

  const startReferralOnboarding = async () => {
    if (!location) return;
    setIsStartingReferralOnboarding(true);
    try {
      const result = await connectApi.startReferrerOnboarding(location.id);
      if (result.url) window.location.assign(result.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start referral payout onboarding."
      );
    } finally {
      setIsStartingReferralOnboarding(false);
    }
  };

  if (isSignedIn === false) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Bring a venue to Chewbuu</CardTitle>
            <CardDescription>
              Sign in to claim your venue or earn a referral reward for helping
              a favorite spot get set up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants()} to="/login">
              Sign in to continue
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 text-sm font-semibold text-primary">
          <Badge variant="secondary">Chewbuu Sync</Badge>
          <span>Venue onboarding · 1 of 5</span>
        </div>
        <div className="mt-6 max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Put your place on the map.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Find the real venue, confirm the details, and we’ll guide you
            through verification, menus, and launch.
          </p>
        </div>
        <div
          className="mt-6 grid grid-cols-5 gap-2"
          aria-label="Onboarding progress"
        >
          {["Find", "Claim", "Verify", "Build", "Launch"].map(
            (label, index) => (
              <div key={label}>
                <div
                  className={`h-1.5 rounded-full ${index === 0 ? "bg-primary" : "bg-primary/15"}`}
                />
                <span className="mt-2 block text-[11px] font-medium text-muted-foreground">
                  0{index + 1} {label}
                </span>
              </div>
            )
          )}
        </div>

        <Card className="mt-8 overflow-hidden rounded-3xl border-primary/15 shadow-xl shadow-primary/5 [&_[data-slot=input]]:rounded-xl [&_[data-slot=textarea]]:rounded-xl">
          <CardHeader className="bg-primary/5">
            <CardTitle>Start with the basics</CardTitle>
            <CardDescription>
              You can add tables, staff, shifts, and payments after the venue is
              claimed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary p-2 text-primary-foreground">
                    <Search className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Start with a real place</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Search Google for the venue name or address. We’ll use the
                      Place ID to match the right location, then you can correct
                      anything below.
                    </p>
                    <div className="relative mt-3">
                      <Input
                        aria-label="Search for your venue"
                        autoComplete="organization"
                        onChange={(event) => setVenueQuery(event.target.value)}
                        placeholder="Search by venue name or address"
                        value={venueQuery}
                      />
                      {isSearchingVenues ? (
                        <LoaderCircle className="absolute top-3 right-3 size-4 animate-spin text-muted-foreground" />
                      ) : null}
                      {venueResults.length > 0 ? (
                        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border bg-background p-1 shadow-xl">
                          {venueResults.map((place) => (
                            <button
                              className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-muted"
                              key={place.placeId}
                              onClick={() => selectVenue(place)}
                              type="button"
                            >
                              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">
                                  {place.name}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                  {place.address ?? "Address not provided"}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {venueSearchMessage ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {venueSearchMessage}
                      </p>
                    ) : null}
                    {selectedPlaceId ? (
                      <p className="mt-2 text-xs font-medium text-primary">
                        Place selected. Review the prefilled details below.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <FormField label="Venue name" required>
                <Input
                  required
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="CG's Southern Cafe"
                />
              </FormField>
              <FormField label="Organization or brand name">
                <Input
                  value={form.organizationName}
                  onChange={(event) =>
                    updateField("organizationName", event.target.value)
                  }
                  placeholder="Optional for restaurant groups"
                />
              </FormField>
              <FormField label="What should guests know about this place?">
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="A neighborhood spot known for..."
                  rows={3}
                />
              </FormField>
              <FormField label="Address" required>
                <Input
                  required
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  placeholder="123 Main Street"
                />
              </FormField>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Phone" required>
                  <Input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Official website" required>
                  <Input
                    required
                    type="url"
                    value={form.websiteUrl}
                    onChange={(event) =>
                      updateField("websiteUrl", event.target.value)
                    }
                    placeholder="https://"
                  />
                </FormField>
              </div>
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold">
                  Where should the menu live?
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    aria-pressed={menuPlan === "chewbuu"}
                    className={`rounded-2xl border p-4 text-left transition ${menuPlan === "chewbuu" ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
                    onClick={() => setMenuPlan("chewbuu")}
                    type="button"
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <MapPin className="size-4 text-primary" /> Build on
                      Chewbuu
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Create a verified menu at your future Chewbuu spot page.
                    </span>
                  </button>
                  <button
                    className={`rounded-2xl border p-4 text-left transition ${menuPlan === "website" ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
                    onClick={() => setMenuPlan("website")}
                    type="button"
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <Globe2 className="size-4 text-primary" /> Use your
                      website
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Link an official menu and we’ll create a temporary
                      preview.
                    </span>
                  </button>
                </div>
                {menuPlan === "website" ? (
                  <FormField
                    label="Official menu URL"
                    description="Optional. Leave it blank if the menu is not online yet."
                  >
                    <Input
                      type="url"
                      value={form.menuUrl}
                      onChange={(event) =>
                        updateField("menuUrl", event.target.value)
                      }
                      placeholder="https://restaurant.example/menu"
                    />
                  </FormField>
                ) : null}
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold">Your role</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    aria-pressed={isOwner}
                    className={`rounded-2xl border p-4 text-left transition ${isOwner ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
                    onClick={() => setIsOwner(true)}
                    type="button"
                  >
                    <span className="block font-semibold">
                      I manage this venue
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Submit a claim for Sync review.
                    </span>
                  </button>
                  <button
                    aria-pressed={!isOwner}
                    className={`rounded-2xl border p-4 text-left transition ${!isOwner ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
                    onClick={() => setIsOwner(false)}
                    type="button"
                  >
                    <span className="block font-semibold">
                      I’m helping this venue
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Refer the place; the $50 reward is paid after onboarding
                      and the first paid invoice clears.
                    </span>
                  </button>
                </div>
              </fieldset>
              <Button
                disabled={isSubmitting || isSignedIn !== true}
                type="submit"
              >
                {isSubmitting ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Check className="mr-2 size-4" />
                )}
                {isOwner ? "Start venue setup" : "Refer this venue"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {location ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{location.name} is in the pipeline</CardTitle>
              <CardDescription>
                Status: <strong>{location.status.replaceAll("_", " ")}</strong>
                {isClaimRequested
                  ? " · claim request submitted"
                  : " · referral recorded"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {referral ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Referral reward tracked: $
                    {(referral.rewardAmountCents / 100).toFixed(2)} ·{" "}
                    {referral.status.replaceAll("_", " ")}
                  </p>
                  {referral.status !== "paid" ? (
                    <Button
                      disabled={isStartingReferralOnboarding}
                      onClick={() => void startReferralOnboarding()}
                      type="button"
                      variant="outline"
                    >
                      {isStartingReferralOnboarding
                        ? "Opening Stripe…"
                        : "Set up referral payout"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {menuPlan === "chewbuu" ? (
                <div className="rounded-2xl bg-primary/5 p-4 text-sm">
                  <p className="font-semibold">Your Chewbuu menu home</p>
                  <p className="mt-1 text-muted-foreground">
                    Once Sync verifies the venue, its public menu will live at
                    this spot page:
                  </p>
                  <code className="mt-2 block break-all text-xs text-primary">
                    chewbuu.com/spots/{location.handle ?? location.id}
                  </code>
                </div>
              ) : null}
              <Link
                className={buttonVariants({ size: "sm", variant: "outline" })}
                params={{ venueId: location.id }}
                to="/venues/$venueId"
              >
                Open venue workspace
              </Link>
              {isPreviewing ? (
                <p className="text-sm text-muted-foreground">
                  Finding the menu…
                </p>
              ) : null}
              {preview ? <MenuPreview preview={preview} /> : null}
              <VenueSetupSteps location={location} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

type VenueSetupStep = 2 | 3 | 4 | 5;

function VenueSetupSteps({ location }: { location: VenueLocation }) {
  const [step, setStep] = useState<VenueSetupStep>(2);
  const [isSaving, setIsSaving] = useState(false);
  const [mediaSaved, setMediaSaved] = useState(false);
  const [verification, setVerification] =
    useState<VenueIdentityVerificationSession | null>(null);
  const [venueProfilePhoto, setVenueProfilePhoto] = useState<File | null>(null);
  const [venueIntroVideo, setVenueIntroVideo] = useState<File | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<File[]>([]);
  const [items, setItems] = useState<VenueMenuItem[]>([]);
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [brand, setBrand] = useState({
    accentColor: location.style?.accentColor ?? "#0f766e",
    backgroundColor: location.style?.backgroundColor ?? "#f7f4ed",
    description:
      location.description ?? "A place for real dates and good people.",
    handle: location.handle ?? "venue-handle",
    logoUrl: location.style?.logoUrl ?? "",
    tagline: location.style?.tagline ?? "A better way to run real places.",
  });
  const [staffEmails, setStaffEmails] = useState("");
  const [itemForm, setItemForm] = useState({
    description: "",
    name: "",
    priceCents: "",
    section: "",
  });

  const updateBrand = (field: keyof typeof brand, value: string) => {
    setBrand((current) => ({ ...current, [field]: value }));
  };

  const loadVerification = useCallback(async () => {
    try {
      setVerification(
        await venueApi.getIdentityVerificationStatus(location.id)
      );
    } catch {
      setVerification(null);
    }
  }, [location.id]);

  useEffect(() => {
    void loadVerification();
  }, [loadVerification]);

  const startVerification = async () => {
    setIsSaving(true);
    try {
      const session = await venueApi.createIdentityVerificationSession(
        location.id
      );
      setVerification(session);
      if (!session.url) {
        throw new Error("Stripe did not return an identity verification URL.");
      }
      window.location.assign(session.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start identity verification."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const uploadVenueMedia = async (
    file: File,
    kind: "venue_intro_video" | "venue_photo" | "venue_profile_photo"
  ) => {
    const upload = await venueApi.uploadMedia({
      contentType: file.type,
      fileName: file.name,
      kind,
      locationId: location.id,
    });
    const response = await fetch(upload.uploadUrl, {
      body: file,
      headers: { "content-type": file.type },
      method: "PUT",
    });
    if (!response.ok)
      throw new Error(`Could not upload ${kind.replaceAll("_", " ")}.`);
    await venueApi.saveMedia({
      kind,
      locationId: location.id,
      url: upload.mediaUrl,
    });
  };

  const uploadProfileMedia = async () => {
    const uploads = [
      venueProfilePhoto
        ? { file: venueProfilePhoto, kind: "venue_profile_photo" as const }
        : null,
      venueIntroVideo
        ? { file: venueIntroVideo, kind: "venue_intro_video" as const }
        : null,
      ...additionalPhotos.map((file) => ({
        file,
        kind: "venue_photo" as const,
      })),
    ].filter((upload) => upload !== null);
    await Promise.all(
      uploads.map(({ file, kind }) => uploadVenueMedia(file, kind))
    );
    setVenueProfilePhoto(null);
    setVenueIntroVideo(null);
    setAdditionalPhotos([]);
  };

  const saveBrand = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await venueApi.updateBrand({
        description: brand.description,
        handle: brand.handle,
        locationId: location.id,
        name: location.name,
        style: {
          accentColor: brand.accentColor,
          backgroundColor: brand.backgroundColor,
          ...(brand.logoUrl ? { logoUrl: brand.logoUrl } : {}),
          tagline: brand.tagline,
        },
      });
      await uploadProfileMedia();
      setMediaSaved(true);
      setStep(4);
      toast.success("Profile and venue media saved. Build the menu next.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save venue assets."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const loadItems = useCallback(async () => {
    setIsLoadingItems(true);
    try {
      const result = await venueApi.listMenuItems(location.id);
      setItems(result.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load menu items."
      );
    } finally {
      setIsLoadingItems(false);
    }
  }, [location.id]);

  useEffect(() => {
    if (step === 4) void loadItems();
  }, [loadItems, step]);

  const saveMenuItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const input = {
        description: itemForm.description || undefined,
        locationId: location.id,
        name: itemForm.name,
        priceCents: Number(itemForm.priceCents || 0),
        section: itemForm.section || undefined,
      };
      let result = await venueApi.upsertMenuItem(input);
      if (itemPhoto) {
        const upload = await venueApi.uploadMedia({
          contentType: itemPhoto.type,
          fileName: itemPhoto.name,
          kind: "food_photo",
          locationId: location.id,
        });
        const response = await fetch(upload.uploadUrl, {
          body: itemPhoto,
          headers: { "content-type": itemPhoto.type },
          method: "PUT",
        });
        if (!response.ok) throw new Error("Could not upload the menu photo.");
        await venueApi.saveMedia({
          kind: "food_photo",
          locationId: location.id,
          url: upload.mediaUrl,
        });
        result = await venueApi.upsertMenuItem({
          ...input,
          id: result.item.id,
          photoUrl: upload.mediaUrl,
        });
      }
      setItems((current) => [
        ...current.filter((item) => item.id !== result.item.id),
        result.item,
      ]);
      setItemForm({ description: "", name: "", priceCents: "", section: "" });
      setItemPhoto(null);
      toast.success("Menu item saved. Add modifiers below it when needed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save menu item."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const inviteStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const members = staffEmails
      .split(/[\n,]/)
      .map((email) => email.trim())
      .filter(Boolean)
      .map((email) => ({ email }));
    if (members.length === 0) {
      setStep(5);
      return;
    }
    setIsSaving(true);
    try {
      await venueApi.inviteMembers({ locationId: location.id, members });
      setStep(5);
      toast.success(
        `${members.length} venue invitation${members.length === 1 ? "" : "s"} sent.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not invite venue staff."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const goToStep = (nextStep: VenueSetupStep) => {
    if (nextStep >= 3 && verification?.status !== "verified") {
      toast.info("Confirm Stripe Identity before adding venue media.");
      return;
    }
    if (nextStep >= 4 && !mediaSaved) {
      toast.info("Save your profile media before continuing to the menu.");
      return;
    }
    setStep(nextStep);
  };

  return (
    <div className="mt-6 space-y-5 border-t pt-6 [&_[data-slot=input]]:rounded-xl [&_[data-slot=textarea]]:rounded-xl">
      <div className="grid gap-2 sm:grid-cols-4" aria-label="Venue setup steps">
        {(
          [
            { label: "Identity", value: 2 },
            { label: "Profile & media", value: 3 },
            { label: "Menu", value: 4 },
            { label: "People & launch", value: 5 },
          ] as const
        ).map(({ label, value }) => (
          <button
            className={`rounded-2xl border px-3 py-3 text-left text-xs transition ${step === value ? "border-primary bg-primary/10 text-foreground" : "border-border/70 text-muted-foreground hover:bg-muted/50"}`}
            key={value}
            onClick={() => goToStep(value)}
            type="button"
          >
            <span className="block font-semibold">0{value - 1}</span>
            {label}
          </button>
        ))}
      </div>

      {step === 2 ? (
        <div className="rounded-3xl border bg-muted/20 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-5 text-primary" />
            <div>
              <h3 className="font-semibold text-lg">
                Verify the venue representative
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Give Stripe permission to verify the venue representative with a
                Stripe-hosted document and selfie check. We use the verified
                name for the representative record and never handle document
                images ourselves.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Badge
              variant={
                verification?.status === "verified" ? "default" : "secondary"
              }
            >
              {verification?.status?.replaceAll("_", " ") ?? "Not started"}
            </Badge>
            {verification?.verifiedName ? (
              <span className="text-sm text-muted-foreground">
                Verified as {verification.verifiedName}
              </span>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {verification?.status !== "verified" ? (
              <Button
                disabled={isSaving}
                onClick={startVerification}
                type="button"
              >
                <BadgeCheck className="mr-2 size-4" /> Verify with Stripe
                Identity
              </Button>
            ) : null}
            <Button onClick={loadVerification} type="button" variant="outline">
              Refresh status
            </Button>
            {verification?.status === "verified" ? (
              <Button onClick={() => setStep(3)} type="button">
                Continue to profile & media
              </Button>
            ) : (
              <p className="basis-full text-xs text-muted-foreground">
                Complete verification to unlock your profile media step.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <form
          className="space-y-4 rounded-3xl border bg-muted/20 p-5"
          onSubmit={saveBrand}
        >
          <div>
            <h3 className="font-semibold text-lg">
              Make the place feel like itself
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Identity is confirmed. Now add the profile picture, intro video,
              and additional photos guests will see before you build the menu.
            </p>
          </div>
          <FormField label="Venue handle">
            <Input
              required
              value={brand.handle}
              onChange={(event) => updateBrand("handle", event.target.value)}
            />
          </FormField>
          <FormField label="Venue description">
            <Textarea
              value={brand.description}
              onChange={(event) =>
                updateBrand("description", event.target.value)
              }
              rows={3}
            />
          </FormField>
          <FormField label="Tagline">
            <Input
              value={brand.tagline}
              onChange={(event) => updateBrand("tagline", event.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Accent">
              <Input
                type="color"
                value={brand.accentColor}
                onChange={(event) =>
                  updateBrand("accentColor", event.target.value)
                }
              />
            </FormField>
            <FormField label="Background">
              <Input
                type="color"
                value={brand.backgroundColor}
                onChange={(event) =>
                  updateBrand("backgroundColor", event.target.value)
                }
              />
            </FormField>
          </div>
          <FormField label="Logo URL">
            <Input
              type="url"
              value={brand.logoUrl}
              onChange={(event) => updateBrand("logoUrl", event.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Venue profile picture"
              description="Use a clear logo, storefront, or hero image."
              required
            >
              <Input
                accept="image/*"
                onChange={(event) =>
                  setVenueProfilePhoto(event.target.files?.[0] ?? null)
                }
                required={!venueProfilePhoto}
                type="file"
              />
            </FormField>
            <FormField
              label="Venue intro video"
              description="A short welcome from the venue team helps guests know what to expect."
              required
            >
              <Input
                accept="video/*"
                onChange={(event) =>
                  setVenueIntroVideo(event.target.files?.[0] ?? null)
                }
                required={!venueIntroVideo}
                type="file"
              />
            </FormField>
          </div>
          <FormField
            label="Additional venue photos"
            description="Select the interior, patio, dishes, or other photos guests should see."
          >
            <Input
              accept="image/*"
              multiple
              onChange={(event) =>
                setAdditionalPhotos(Array.from(event.target.files ?? []))
              }
              type="file"
            />
          </FormField>
          {venueProfilePhoto ||
          venueIntroVideo ||
          additionalPhotos.length > 0 ? (
            <div className="rounded-2xl bg-primary/5 p-4 text-sm">
              <p className="font-medium">Media selected</p>
              <p className="mt-1 text-muted-foreground">
                {[
                  venueProfilePhoto ? "profile picture" : null,
                  venueIntroVideo ? "intro video" : null,
                  additionalPhotos.length > 0
                    ? `${additionalPhotos.length} additional photo${additionalPhotos.length === 1 ? "" : "s"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} type="submit">
              <Camera className="mr-2 size-4" /> Save profile & media
            </Button>
          </div>
        </form>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4 rounded-3xl border bg-muted/20 p-5">
          <div>
            <h3 className="font-semibold text-lg">
              Build the menu guests can actually order
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add venue-owned items, prices, modifiers, and an optional photo
              for that specific item. Online previews stay separate and
              unverified.
            </p>
          </div>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveMenuItem}>
            <Input
              aria-label="Menu item name"
              onChange={(event) =>
                setItemForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Item name"
              required
              value={itemForm.name}
            />
            <Input
              aria-label="Menu item price in cents"
              onChange={(event) =>
                setItemForm((current) => ({
                  ...current,
                  priceCents: event.target.value,
                }))
              }
              placeholder="Price in cents (e.g. 1450)"
              type="number"
              value={itemForm.priceCents}
            />
            <Input
              aria-label="Menu item section"
              onChange={(event) =>
                setItemForm((current) => ({
                  ...current,
                  section: event.target.value,
                }))
              }
              placeholder="Section, e.g. Brunch"
              value={itemForm.section}
            />
            <Input
              accept="image/*"
              aria-label="Menu item photo"
              onChange={(event) =>
                setItemPhoto(event.target.files?.[0] ?? null)
              }
              type="file"
            />
            <Textarea
              aria-label="Menu item description"
              className="sm:col-span-2"
              onChange={(event) =>
                setItemForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Describe what guests receive"
              value={itemForm.description}
            />
            <Button className="w-fit" disabled={isSaving} type="submit">
              <Plus className="mr-2 size-4" /> Add menu item
            </Button>
          </form>
          {isLoadingItems ? (
            <p className="text-sm text-muted-foreground">Loading menu…</p>
          ) : null}
          <div className="space-y-3">
            {items.map((item) => (
              <MenuItemCard
                item={item}
                key={item.id}
                locationId={location.id}
                onSaved={loadItems}
              />
            ))}
          </div>
          <Button onClick={() => goToStep(5)} type="button" variant="outline">
            Continue to people & launch
          </Button>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="space-y-4 rounded-3xl border bg-muted/20 p-5">
          <div>
            <h3 className="font-semibold text-lg">
              Invite the team and open the doors
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Staff can help with shifts, tables, orders, specials, and timeline
              events after they accept their invitation.
            </p>
          </div>
          <form className="space-y-4" onSubmit={inviteStaff}>
            <FormField label="Invite staff or partners">
              <Textarea
                value={staffEmails}
                onChange={(event) => setStaffEmails(event.target.value)}
                placeholder="manager@example.com\nchef@example.com"
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isSaving} type="submit">
                Send invitations & finish
              </Button>
              <Button onClick={() => setStep(2)} type="button" variant="ghost">
                Review verification
              </Button>
            </div>
          </form>
          <p className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-700">
            @{brand.handle} is ready for hours, tables, schedules, reservations,
            orders, specials, and feedback moderation.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MenuItemCard({
  item,
  locationId,
  onSaved,
}: {
  item: VenueMenuItem;
  locationId: string;
  onSaved: () => Promise<void>;
}) {
  const [groupName, setGroupName] = useState("");
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const addModifierGroup = async () => {
    if (!groupName.trim()) return;
    setIsSaving(true);
    try {
      await venueApi.upsertModifierGroup({
        locationId,
        menuItemId: item.id,
        name: groupName,
      });
      setGroupName("");
      await onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add modifier group."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addModifierOption = async (groupId: string) => {
    const name = optionDrafts[groupId]?.trim();
    if (!name) return;
    setIsSaving(true);
    try {
      await venueApi.upsertModifierOption({ groupId, locationId, name });
      setOptionDrafts((current) => ({ ...current, [groupId]: "" }));
      await onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not add modifier option."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {item.section ? `${item.section} · ` : ""}$
            {(item.priceCents / 100).toFixed(2)}
            {item.description ? ` · ${item.description}` : ""}
          </p>
        </div>
        {item.photoUrl ? (
          <img
            alt={`${item.name} menu item`}
            className="size-14 rounded-xl object-cover"
            src={item.photoUrl}
          />
        ) : null}
      </div>
      <div className="mt-4 space-y-3 border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Modifiers
        </p>
        {item.modifierGroups.map((group) => (
          <div className="rounded-xl bg-muted/40 p-3" key={group.id}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{group.name}</span>
              <Badge variant="outline">
                {group.selectionType === "multiple"
                  ? "Choose any"
                  : "Choose one"}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.options.map((option) => (
                <Badge key={option.id} variant="secondary">
                  {option.name}
                  {option.priceDeltaCents
                    ? ` +$${(option.priceDeltaCents / 100).toFixed(2)}`
                    : ""}
                </Badge>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                aria-label={`New option for ${group.name}`}
                onChange={(event) =>
                  setOptionDrafts((current) => ({
                    ...current,
                    [group.id]: event.target.value,
                  }))
                }
                placeholder="Add option"
                value={optionDrafts[group.id] ?? ""}
              />
              <Button
                disabled={isSaving}
                onClick={() => void addModifierOption(group.id)}
                type="button"
                variant="outline"
              >
                Add
              </Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            aria-label={`New modifier group for ${item.name}`}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="New modifier group, e.g. Choose a side"
            value={groupName}
          />
          <Button
            disabled={isSaving}
            onClick={() => void addModifierGroup()}
            type="button"
            variant="outline"
          >
            <Plus className="mr-1 size-4" /> Group
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  children,
  description,
  label,
  required = false,
}: {
  children: ReactNode;
  description?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block space-y-2 text-sm font-medium">
        <span>
          {label} {required ? <span aria-hidden="true">*</span> : null}
        </span>
        {children}
      </label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function MenuPreview({ preview }: { preview: VenueMenuPreview }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">{preview.title ?? "Menu preview"}</h3>
          <p className="text-sm text-muted-foreground">
            Found online · not verified by the venue
          </p>
        </div>
        <a
          className="text-muted-foreground hover:text-foreground"
          href={preview.sourceUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink aria-label="Open source menu" className="size-4" />
        </a>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {preview.items.slice(0, 12).map((item, index) => (
          <li
            className="flex justify-between gap-4"
            key={`${item.name}-${index}`}
          >
            <span>
              <span className="font-medium">{item.name}</span>
              {item.description ? (
                <span className="block text-muted-foreground">
                  {item.description}
                </span>
              ) : null}
            </span>
            {item.price ? <span className="shrink-0">{item.price}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
