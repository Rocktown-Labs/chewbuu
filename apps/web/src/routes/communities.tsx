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
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, LoaderCircle, Mail, Palette, Users } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  circlesApi,
  entitlementsApi,
  type AccountEntitlements,
  type BrandStyle,
  type Circle,
  type CommunityKind,
} from "@/lib/dating-api";

const communitySearchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/communities")({
  component: CommunitiesPage,
  ssr: false,
  validateSearch: (search) => communitySearchSchema.parse(search),
});

type SetupStep = 1 | 2 | 3 | 4;

function CommunitiesPage() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Circle[]>([]);
  const [entitlements, setEntitlements] = useState<AccountEntitlements | null>(
    null
  );
  const [kind, setKind] = useState<CommunityKind>("crew");
  const [step, setStep] = useState<SetupStep>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [created, setCreated] = useState<Circle | null>(null);
  const [form, setForm] = useState({
    accentColor: "#0f766e",
    backgroundColor: "#f7f4ed",
    description: "",
    handle: "chewbuu",
    logoUrl: "",
    name: "Chewbuu",
    tagline: "Real people. Real plans. Real community.",
  });
  const [emails, setEmails] = useState("");

  const load = async () => {
    try {
      const [circleResult, entitlementResult] = await Promise.all([
        circlesApi.get(),
        entitlementsApi.get(),
      ]);
      setCommunities(circleResult.circles);
      setEntitlements(entitlementResult);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load communities."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!invite) return;
    const accept = async () => {
      try {
        await circlesApi.acceptInvite(invite);
        toast.success("You joined the Circle.");
        await load();
        await navigate({
          replace: true,
          search: { invite: undefined },
          to: "/communities",
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not accept invitation."
        );
      }
    };
    void accept();
  }, [invite, navigate]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectKind = (nextKind: CommunityKind) => {
    setKind(nextKind);
    if (nextKind === "crew") {
      setForm((current) => ({
        ...current,
        handle: "chewbuu",
        name: "Chewbuu",
      }));
    } else {
      setForm((current) => ({ ...current, handle: "", name: "" }));
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = await circlesApi.create({
        kind,
        name: form.name,
        ...(form.handle ? { handle: form.handle } : {}),
      });
      setCreated(result.circle);
      setStep(2);
      toast.success(
        `${kind === "crew" ? "Crew" : "Circle"} created. Now make it yours.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create community."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleMetadata = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!created) return;
    setIsSaving(true);
    try {
      const result = await circlesApi.update({
        description: form.description,
        handle: form.handle,
        id: created.id,
        name: form.name,
        style: toStyle(form),
      });
      setCreated(result.circle);
      setCommunities((current) => [
        result.circle,
        ...current.filter((item) => item.id !== result.circle.id),
      ]);
      setStep(3);
      toast.success("Branding saved. Add your people next.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save metadata."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePeople = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!created) return;
    const members = emails
      .split(/[\n,]/)
      .map((email) => email.trim())
      .filter(Boolean)
      .map((email) => ({ email }));
    if (members.length === 0) {
      setStep(4);
      return;
    }
    setIsSaving(true);
    try {
      await circlesApi.inviteMembers({ circleId: created.id, members });
      setStep(4);
      toast.success(
        `${members.length} invitation${members.length === 1 ? "" : "s"} sent.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not invite people."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f4ed] px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <Badge className="border-0 bg-teal-900 text-teal-50">
            <Users className="mr-1 size-3" /> Chewbuu communities
          </Badge>
          <h1 className="mt-5 max-w-xl font-semibold text-4xl tracking-tight sm:text-6xl">
            Make a place for your people.
          </h1>
          <p className="mt-4 max-w-xl text-slate-600">
            Crews and Circles use the same simple setup: create the space, shape
            the identity, then invite the people who make it matter.
          </p>

          <Card className="mt-8 border-slate-200 bg-white/80 shadow-xl shadow-slate-900/5">
            <CardHeader>
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Community type"
              >
                <Button
                  onClick={() => selectKind("crew")}
                  type="button"
                  variant={kind === "crew" ? "default" : "outline"}
                >
                  Create a Crew
                </Button>
                <Button
                  onClick={() => selectKind("circle")}
                  type="button"
                  variant={kind === "circle" ? "default" : "outline"}
                >
                  Create a Circle
                </Button>
              </div>
              <CardTitle className="mt-4">
                Step {step} of 3 ·{" "}
                {step === 1 ? "Create" : step === 2 ? "Style" : "People"}
              </CardTitle>
              <CardDescription>
                {entitlements?.isAdmin
                  ? "Admin test access: Sugar + Sync are active. Reserved Chewbuu handles are available to you."
                  : "Mingle or Sugar membership is required to create a community."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 1 ? (
                <form className="space-y-5" onSubmit={handleCreate}>
                  <Field label={`${kind === "crew" ? "Crew" : "Circle"} name`}>
                    <Input
                      required
                      value={form.name}
                      onChange={(event) => update("name", event.target.value)}
                    />
                  </Field>
                  <Field label="Handle">
                    <Input
                      value={form.handle}
                      onChange={(event) => update("handle", event.target.value)}
                      placeholder="@your-community"
                    />
                  </Field>
                  <Button disabled={isSaving} type="submit">
                    {isSaving ? (
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 size-4" />
                    )}
                    Create {kind === "crew" ? "Crew" : "Circle"}
                  </Button>
                </form>
              ) : null}
              {step === 2 ? (
                <form className="space-y-5" onSubmit={handleMetadata}>
                  <Field label="Description">
                    <Textarea
                      value={form.description}
                      onChange={(event) =>
                        update("description", event.target.value)
                      }
                      placeholder="What brings this community together?"
                    />
                  </Field>
                  <Field label="Tagline">
                    <Input
                      value={form.tagline}
                      onChange={(event) =>
                        update("tagline", event.target.value)
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Accent">
                      <Input
                        type="color"
                        value={form.accentColor}
                        onChange={(event) =>
                          update("accentColor", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Background">
                      <Input
                        type="color"
                        value={form.backgroundColor}
                        onChange={(event) =>
                          update("backgroundColor", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Logo URL">
                    <Input
                      type="url"
                      value={form.logoUrl}
                      onChange={(event) =>
                        update("logoUrl", event.target.value)
                      }
                      placeholder="https://..."
                    />
                  </Field>
                  <Button disabled={isSaving} type="submit">
                    <Palette className="mr-2 size-4" /> Save identity
                  </Button>
                </form>
              ) : null}
              {step === 3 ? (
                <form className="space-y-5" onSubmit={handlePeople}>
                  <Field
                    label="Invite people"
                    description="One email per line or separated by commas. Existing Chewbuu members join immediately; everyone else gets an email invitation."
                  >
                    <Textarea
                      value={emails}
                      onChange={(event) => setEmails(event.target.value)}
                      placeholder="friend@example.com\nteam@example.com"
                    />
                  </Field>
                  <Button disabled={isSaving} type="submit">
                    <Mail className="mr-2 size-4" /> Send invitations
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
              {step === 4 && created ? (
                <div className="space-y-4">
                  <div
                    className="rounded-2xl p-5"
                    style={toCssStyle(created.style)}
                  >
                    <p className="text-sm opacity-70">@{created.handle}</p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      {created.name}
                    </h3>
                    <p className="mt-1 opacity-80">
                      {created.style?.tagline || form.tagline}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">
                    Your {created.kind} is ready. You can return here to manage
                    its identity and people.
                  </p>
                  <Link
                    className={buttonVariants({ variant: "outline" })}
                    to="/me"
                  >
                    Return to Chewbuu
                  </Link>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4 lg:pt-28">
          <div
            className="rounded-3xl p-7 shadow-xl shadow-teal-950/10"
            style={toCssStyle(toStyle(form))}
          >
            <p className="text-sm opacity-70">
              {kind === "crew" ? "Crew preview" : "Circle preview"}
            </p>
            <h2 className="mt-8 text-4xl font-semibold">
              @{form.handle || "your-handle"}
            </h2>
            <p className="mt-2 max-w-xs opacity-80">
              {form.tagline || "A community with a point of view."}
            </p>
          </div>
          <Card className="border-slate-200 bg-white/70">
            <CardHeader>
              <CardTitle className="text-base">Your communities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : communities.length === 0 ? (
                <p className="text-sm text-slate-500">
                  None yet. Start with your Crew or Circle.
                </p>
              ) : (
                communities.map((community) => (
                  <div
                    className="flex items-center justify-between rounded-xl border p-3"
                    key={community.id}
                  >
                    <span>
                      <strong>{community.name}</strong>
                      <span className="block text-xs text-slate-500">
                        @{community.handle || "no-handle"}
                      </span>
                    </span>
                    <Badge variant="outline">{community.kind}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function Field({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description?: string;
  label: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {description ? (
        <span className="block text-xs font-normal text-slate-500">
          {description}
        </span>
      ) : null}
    </label>
  );
}

const toStyle = (form: {
  accentColor: string;
  backgroundColor: string;
  logoUrl: string;
  tagline: string;
}): BrandStyle => ({
  accentColor: form.accentColor,
  backgroundColor: form.backgroundColor,
  ...(form.logoUrl ? { logoUrl: form.logoUrl } : {}),
  tagline: form.tagline,
});

const toCssStyle = (style?: BrandStyle) => ({
  backgroundColor: style?.backgroundColor || "#f7f4ed",
  border: `2px solid ${style?.accentColor || "#0f766e"}`,
  color: "#0f172a",
});
