import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button, buttonVariants } from "@chewbuu/ui/components/button";
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
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@chewbuu/ui/components/field";
import { Input } from "@chewbuu/ui/components/input";
import { Progress } from "@chewbuu/ui/components/progress";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@chewbuu/ui/components/toggle-group";
import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  UserPlus,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { datingApi } from "@/lib/dating-api";
import type {
  DateMatch,
  DatePlace,
  DateRequestPayload,
  DateWhat,
  PaymentMode,
} from "@/lib/dating-api";

const steps = [
  "What",
  "When",
  "Where",
  "Party",
  "How",
  "Spots",
  "Matches",
] as const;

const defaultValues: DateRequestPayload = {
  filters: [],
  partyMembers: [],
  paymentMode: "dutch",
  places: [],
  scheduledAt: new Date(Date.now() + 86_400_000).toISOString().slice(0, 16),
  searchArea: "",
  what: ["eat"],
};

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function DateWizard({ membershipTier }: { membershipTier: string }) {
  const [step, setStep] = useState(0);
  const [places, setPlaces] = useState<DatePlace[]>([]);
  const [matches, setMatches] = useState<DateMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState<DateMatch | null>(null);
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (value.places.length !== 3) {
        toast.error("Pick exactly three spots first.");
        setStep(5);
        return;
      }

      const response = await datingApi.createRequest({
        ...value,
        scheduledAt: new Date(value.scheduledAt).toISOString(),
      });
      setMatches(response.matches);
      setStep(6);
      toast.success("Intro videos are exchanged when a match request is sent.");
    },
  });
  const isSugar = membershipTier === "sugar";
  const canGroup = membershipTier === "mingle" || isSugar;

  const suggestPlaces = async () => {
    const value = form.state.values;
    if (!value.searchArea || value.what.length === 0) {
      toast.error("Choose what you want and where to search.");
      return;
    }
    const response = await datingApi.suggestPlaces({
      area: value.searchArea,
      filters: value.filters,
      what: value.what,
    });
    setPlaces(response.places);
    setStep(5);
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <Button
          className="w-fit"
          onClick={() => history.back()}
          type="button"
          variant="ghost"
        >
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <div className="flex flex-col gap-2">
          <Badge className="w-fit" variant="secondary">
            {steps[step]}
          </Badge>
          <h1 className="text-2xl font-semibold">Plan a real date</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Build the plan first, choose three places, then Chewbuu returns
            video-first matches.
          </p>
        </div>
        <Progress value={((step + 1) / steps.length) * 100} />
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{steps[step]}</CardTitle>
            <CardDescription>
              {step === 0 && "Eat, drink, play, or stack them together."}
              {step === 1 && "Pick the time Chewbuu should optimize around."}
              {step === 2 &&
                "Add tastes and constraints so places rank correctly."}
              {step === 3 &&
                "Invite your people when your tier allows group dates."}
              {step === 4 && "Dutch is default. Sugar can cover the date."}
              {step === 5 && "Select three places before matching starts."}
              {step === 6 &&
                "Open a profile, start the room, and send three video replies before text unlocks."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 0 && <WhatStep form={form} />}
            {step === 1 && <WhenStep form={form} />}
            {step === 2 && <WhereStep form={form} onSuggest={suggestPlaces} />}
            {step === 3 && <PartyStep canGroup={canGroup} form={form} />}
            {step === 4 && <HowStep form={form} isSugar={isSugar} />}
            {step === 5 && <SpotsStep form={form} places={places} />}
            {step === 6 && (
              <MatchesStep matches={matches} onOpen={setActiveMatch} />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-between gap-3">
          <Button
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            type="button"
            variant="outline"
          >
            Back
          </Button>
          {step < 5 && (
            <Button
              onClick={() => setStep((current) => Math.min(5, current + 1))}
              type="button"
            >
              Next
              <ChevronRight data-icon="inline-end" />
            </Button>
          )}
          {step === 5 && (
            <Button type="submit">
              <Sparkles data-icon="inline-start" />
              Find matches
            </Button>
          )}
        </div>
      </form>

      <Dialog
        onOpenChange={(open) => !open && setActiveMatch(null)}
        open={!!activeMatch}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeMatch?.displayName}</DialogTitle>
            <DialogDescription>
              {activeMatch?.compatibility}% match
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage alt="" src={activeMatch?.profilePhotoUrl ?? ""} />
                <AvatarFallback>
                  {activeMatch?.displayName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                {activeMatch?.profileSummary}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Button>
                <Video data-icon="inline-start" />
                View intro
              </Button>
              <Link
                className={buttonVariants({ variant: "outline" })}
                params={{ matchid: activeMatch?.id ?? "" }}
                to="/matches/$matchid"
              >
                <MessageCircle data-icon="inline-start" />
                Open room
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Intro videos are exchanged first. Each person sends three more
              video messages before text chat unlocks.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

type WizardForm = any;

function WhatStep({ form }: { form: WizardForm }) {
  return (
    <form.Field name="what">
      {(field) => (
        <FieldGroup>
          <Field>
            <FieldLabel>What sounds good?</FieldLabel>
            <ToggleGroup
              onValueChange={(value) =>
                value.length > 0 && field.handleChange(value as DateWhat[])
              }
              value={field.state.value}
            >
              <ToggleGroupItem value="eat">Eat</ToggleGroupItem>
              <ToggleGroupItem value="drink">Drink</ToggleGroupItem>
              <ToggleGroupItem value="play">Play</ToggleGroupItem>
            </ToggleGroup>
          </Field>
        </FieldGroup>
      )}
    </form.Field>
  );
}

function WhenStep({ form }: { form: WizardForm }) {
  return (
    <form.Field name="scheduledAt">
      {(field) => (
        <Field>
          <FieldLabel htmlFor={field.name}>Date and time</FieldLabel>
          <Input
            id={field.name}
            onChange={(event) => field.handleChange(event.target.value)}
            type="datetime-local"
            value={field.state.value}
          />
        </Field>
      )}
    </form.Field>
  );
}

function WhereStep({
  form,
  onSuggest,
}: {
  form: WizardForm;
  onSuggest: () => void;
}) {
  return (
    <FieldGroup>
      <form.Field name="searchArea">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Search area</FieldLabel>
            <Input
              id={field.name}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Nashville, TN"
              value={field.state.value}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name="filters">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Filters</FieldLabel>
            <Input
              id={field.name}
              onChange={(event) =>
                field.handleChange(splitList(event.target.value))
              }
              placeholder="chicken, whiskey, pool"
              value={field.state.value.join(", ")}
            />
            <FieldDescription>
              Answer eat what, drink what, play how. Google Places will replace
              the fallback suggestions next.
            </FieldDescription>
          </Field>
        )}
      </form.Field>
      <Button className="w-fit" onClick={onSuggest} type="button">
        Suggest places
      </Button>
    </FieldGroup>
  );
}

function PartyStep({
  canGroup,
  form,
}: {
  canGroup: boolean;
  form: WizardForm;
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Party</FieldLabel>
        <FieldDescription>
          {canGroup
            ? "Add up to three people."
            : "Social members date solo. Upgrade to Mingle for group dates."}
        </FieldDescription>
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>You</AvatarFallback>
          </Avatar>
          <form.Subscribe selector={(state) => state.values.partyMembers}>
            {(partyMembers) =>
              partyMembers.map((member) => (
                <Avatar key={member.email ?? member.name ?? member.displayName}>
                  <AvatarImage alt="" src="" />
                  <AvatarFallback>
                    {(
                      member.displayName ??
                      member.name ??
                      member.email ??
                      "?"
                    ).slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))
            }
          </form.Subscribe>
        </AvatarGroup>
      </Field>
      <form.Field name="partyMembers[0].email">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>
              <UserPlus data-icon="inline-start" />
              Friend email
            </FieldLabel>
            <Input
              disabled={!canGroup}
              id={field.name}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="friend@example.com"
              value={field.state.value ?? ""}
            />
          </Field>
        )}
      </form.Field>
    </FieldGroup>
  );
}

function HowStep({ form, isSugar }: { form: WizardForm; isSugar: boolean }) {
  return (
    <form.Field name="paymentMode">
      {(field) => (
        <Field>
          <FieldLabel>How are you paying?</FieldLabel>
          <ToggleGroup
            onValueChange={(value) =>
              field.handleChange((value || "dutch") as unknown as PaymentMode)
            }
            value={field.state.value}
          >
            <ToggleGroupItem value="dutch">Dutch</ToggleGroupItem>
            <ToggleGroupItem disabled={!isSugar} value="requester_covers">
              Me
            </ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            All Social and Mingle searches are Dutch. Sugar members can cover
            the date.
          </FieldDescription>
        </Field>
      )}
    </form.Field>
  );
}

function SpotsStep({
  form,
  places,
}: {
  form: WizardForm;
  places: DatePlace[];
}) {
  return (
    <form.Field name="places">
      {(field) => (
        <div className="grid gap-4 md:grid-cols-3">
          {places.map((place) => {
            const selected = field.state.value.some(
              (item) => item.placeId === place.placeId
            );
            return (
              <Card key={place.placeId} size="sm">
                <CardHeader>
                  <CardTitle>{place.name}</CardTitle>
                  <CardDescription>{place.address}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {place.types.map((type) => (
                      <Badge key={type} variant="secondary">
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    disabled={!selected && field.state.value.length >= 3}
                    onClick={() =>
                      field.handleChange(
                        selected
                          ? field.state.value.filter(
                              (item) => item.placeId !== place.placeId
                            )
                          : [...field.state.value, place]
                      )
                    }
                    type="button"
                    variant={selected ? "default" : "outline"}
                  >
                    {selected ? "Selected" : "Select"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </form.Field>
  );
}

function MatchesStep({
  matches,
  onOpen,
}: {
  matches: DateMatch[];
  onOpen: (match: DateMatch) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {matches.map((match) => (
        <Card key={match.id} size="sm">
          <CardHeader>
            <CardTitle>{match.displayName}</CardTitle>
            <CardDescription>{match.compatibility}% compatible</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Avatar size="lg">
              <AvatarImage alt="" src={match.profilePhotoUrl ?? ""} />
              <AvatarFallback>{match.displayName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <p className="text-muted-foreground">{match.profileSummary}</p>
            <Button onClick={() => onOpen(match)} type="button">
              Open profile
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
