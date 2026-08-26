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
            <CardTitle>Start with the basics</CardTitle>
            <CardDescription>
              You can add tables, staff, shifts, and payments after the venue is
              claimed.
            </CardDescription>
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
              {isPreviewing ? (
                <p className="text-sm text-muted-foreground">
                  Finding the menu…
                </p>
              ) : null}
              {preview ? <MenuPreview preview={preview} /> : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
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
