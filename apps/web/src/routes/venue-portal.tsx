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
import { Check, ExternalLink, LoaderCircle, Sparkles } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  venueApi,
  type VenueLocation,
  type VenueMediaKind,
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
  const [preview, setPreview] = useState<VenueMenuPreview | null>(null);
  const [referral, setReferral] = useState<VenueReferral | undefined>();
  const [mediaFiles, setMediaFiles] = useState<
    Record<VenueMediaKind, File | null>
  >({
    food_photo: null,
    menu_photo: null,
    venue_photo: null,
  });
  const [form, setForm] = useState({
    address: "",
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

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const useChewbuuSyncBrand = () => {
    setForm((current) => ({
      ...current,
      name: "Chewbuu Sync",
      organizationName: "Chewbuu Sync",
      websiteUrl: "https://chewbuu.com",
    }));
    toast.info(
      "Chewbuu Sync defaults loaded. Save the identity after creation."
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await venueApi.createLocation({
        address: form.address || undefined,
        menuUrl: form.menuUrl || undefined,
        name: form.name,
        organizationName: form.organizationName || undefined,
        phone: form.phone || undefined,
        venueRole: isOwner ? "owner" : "referrer",
        websiteUrl: form.websiteUrl || undefined,
      });
      setLocation(result.location);
      setReferral(result.referral);

      if (isOwner) {
        const claimResult = await venueApi.requestClaim(result.location.id);
        setIsClaimRequested(claimResult.status === "requested");
      }

      if (form.menuUrl) {
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
      const mediaToUpload = Object.entries(mediaFiles).filter(
        (entry): entry is [VenueMediaKind, File] => entry[1] instanceof File
      );
      await Promise.all(
        mediaToUpload.map(async ([kind, file]) => {
          const upload = await venueApi.uploadMedia({
            contentType: file.type,
            fileName: file.name,
            kind,
            locationId: result.location.id,
          });
          const uploadResponse = await fetch(upload.uploadUrl, {
            body: file,
            headers: { "content-type": file.type },
            method: "PUT",
          });
          if (!uploadResponse.ok) {
            throw new Error(`Could not upload ${kind.replaceAll("_", " ")}.`);
          }
          await venueApi.saveMedia({
            kind,
            locationId: result.location.id,
            url: upload.mediaUrl,
          });
        })
      );
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
        <Badge variant="secondary">
          <Sparkles className="mr-1 size-3" /> Chewbuu Sync
        </Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Put your venue on the date map.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Claim a spot, or help a favorite restaurant get ready for
          reservations, dining, ordering, and specials. Anything found online is
          marked unverified until the venue confirms it.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Start with the basics</CardTitle>
                <CardDescription>
                  You can add tables, staff, shifts, and payments after the
                  venue is claimed.
                </CardDescription>
              </div>
              <Button
                onClick={useChewbuuSyncBrand}
                type="button"
                variant="outline"
              >
                Use Chewbuu Sync brand
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
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
              <FormField label="Address">
                <Input
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  placeholder="123 Main Street"
                />
              </FormField>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Phone">
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Official website">
                  <Input
                    type="url"
                    value={form.websiteUrl}
                    onChange={(event) =>
                      updateField("websiteUrl", event.target.value)
                    }
                    placeholder="https://"
                  />
                </FormField>
              </div>
              <FormField
                label="Menu URL"
                description="We’ll try to create a temporary menu preview from this official page."
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
              <div className="grid gap-5 sm:grid-cols-3">
                <FormField label="Store photo">
                  <Input
                    accept="image/*"
                    onChange={(event) =>
                      setMediaFiles((current) => ({
                        ...current,
                        venue_photo: event.target.files?.[0] ?? null,
                      }))
                    }
                    type="file"
                  />
                </FormField>
                <FormField label="Menu photo">
                  <Input
                    accept="image/*"
                    onChange={(event) =>
                      setMediaFiles((current) => ({
                        ...current,
                        menu_photo: event.target.files?.[0] ?? null,
                      }))
                    }
                    type="file"
                  />
                </FormField>
                <FormField label="Food photo">
                  <Input
                    accept="image/*"
                    onChange={(event) =>
                      setMediaFiles((current) => ({
                        ...current,
                        food_photo: event.target.files?.[0] ?? null,
                      }))
                    }
                    type="file"
                  />
                </FormField>
              </div>
              <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
                <input
                  checked={isOwner}
                  className="mt-1"
                  onChange={(event) => setIsOwner(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="font-medium">
                    I work at or manage this venue
                  </span>
                  <span className="block text-muted-foreground">
                    We’ll submit a claim request for review. If you’re helping
                    as a guest, you’ll be credited as the venue referrer
                    instead.
                  </span>
                </span>
              </label>
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
                <p className="text-sm text-muted-foreground">
                  Referral reward tracked: $
                  {(referral.rewardAmountCents / 100).toFixed(2)} ·{" "}
                  {referral.status.replaceAll("_", " ")}
                </p>
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

function VenueSetupSteps({ location }: { location: VenueLocation }) {
  const [step, setStep] = useState<2 | 3 | 4>(2);
  const [isSaving, setIsSaving] = useState(false);
  const [brand, setBrand] = useState({
    accentColor: location.style?.accentColor ?? "#0f766e",
    backgroundColor: location.style?.backgroundColor ?? "#f7f4ed",
    description:
      location.description ?? "A place for real dates and good people.",
    handle: location.handle ?? "chewbuusync",
    logoUrl: location.style?.logoUrl ?? "",
    tagline: location.style?.tagline ?? "A better way to run real places.",
  });
  const [staffEmails, setStaffEmails] = useState("");

  const updateBrand = (field: keyof typeof brand, value: string) => {
    setBrand((current) => ({ ...current, [field]: value }));
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
      setStep(3);
      toast.success("Venue identity saved. Add staff or partners next.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save venue identity."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const inviteStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const members = staffEmails
      .split(/[\\n,]/)
      .map((email) => email.trim())
      .filter(Boolean)
      .map((email) => ({ email }));
    if (members.length === 0) {
      setStep(4);
      return;
    }
    setIsSaving(true);
    try {
      await venueApi.inviteMembers({ locationId: location.id, members });
      setStep(4);
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

  return (
    <div className="mt-5 space-y-4 border-t pt-5">
      <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
        <Badge variant={step === 2 ? "default" : "secondary"}>
          2 · Identity
        </Badge>
        <Badge variant={step === 3 ? "default" : "secondary"}>3 · People</Badge>
        <Badge variant={step === 4 ? "default" : "secondary"}>4 · Ready</Badge>
      </div>
      {step === 2 ? (
        <form className="space-y-4" onSubmit={saveBrand}>
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
          <Button disabled={isSaving} type="submit">
            Save venue identity
          </Button>
        </form>
      ) : null}
      {step === 3 ? (
        <form className="space-y-4" onSubmit={inviteStaff}>
          <FormField
            label="Invite staff or partners"
            description="Existing Chewbuu members are added immediately. New people receive a secure invitation email."
          >
            <Textarea
              value={staffEmails}
              onChange={(event) => setStaffEmails(event.target.value)}
              placeholder="manager@example.com\nchef@example.com"
            />
          </FormField>
          <Button disabled={isSaving} type="submit">
            Send venue invitations
          </Button>
          <Button
            className="ml-2"
            onClick={() => setStep(4)}
            type="button"
            variant="ghost"
          >
            Skip for now
          </Button>
        </form>
      ) : null}
      {step === 4 ? (
        <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">
          @{brand.handle} is ready for menu editing, hours, tables, schedules,
          reservations, and orders.
        </p>
      ) : null}
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
