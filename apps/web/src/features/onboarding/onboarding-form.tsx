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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@chewbuu/ui/components/field";
import { Input } from "@chewbuu/ui/components/input";
import { Progress } from "@chewbuu/ui/components/progress";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Sparkles,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { datingApi } from "@/lib/dating-api";
import type { DatingProfilePayload } from "@/lib/dating-api";

const steps = ["Basics", "Media", "Interests", "Friends", "Premium"] as const;
const promptChips = [
  "Chicken",
  "Whiskey",
  "Pool",
  "Football",
  "Live music",
  "Books",
  "Working out",
  "Coffee",
  "Tacos",
  "Brunch",
  "Basketball",
  "Comedy",
];

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const defaultValues: DatingProfilePayload = {
  area: "",
  bio: "",
  birthday: "",
  datingModes: ["solo"],
  favoriteThings: [],
  friendInvites: [],
  height: "",
  interestDetails: {},
  interestedIn: [],
  interests: [],
  media: [
    { isPrimary: true, kind: "profile_photo", sortOrder: 0, url: "" },
    { kind: "intro_video", sortOrder: 0, url: "" },
  ],
  safetyOptIn: false,
  sex: "",
  sexuality: "",
  trustedContacts: [],
  weight: "",
};

export function OnboardingForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const media = value.media.filter((item) => item.url);

      if (!media.some((item) => item.kind === "profile_photo")) {
        toast.error("Add a profile photo before dating.");
        setStep(1);
        return;
      }

      if (!media.some((item) => item.kind === "intro_video")) {
        toast.error("Chewbuu is video-first. Add your intro video.");
        setStep(1);
        return;
      }

      await datingApi.saveProfile({ ...value, media });
      toast.success("Profile ready. Go find a real date.");
      await navigate({ to: "/dashboard" });
    },
  });
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Real People, Real Dates, Real Results
        </Badge>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">
            Set up your Chewbuu profile
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your intro video and profile photo are required before you can date.
            Everything else helps Chewbuu match the right people, place, and
            plan.
          </p>
        </div>
        <Progress value={progress} />
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
              {step === 0 &&
                "Tell Chewbuu who you are and where dating should happen."}
              {step === 1 &&
                "Video first, with enough real photos to keep the profile honest."}
              {step === 2 &&
                "Favorites become matching signals for people and places."}
              {step === 3 &&
                "Chewbuu is better with friends, and safety contacts come later."}
              {step === 4 &&
                "Social is free. Mingle and Sugar unlock the social dating modes."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 0 && <BasicsStep form={form} />}
            {step === 1 && <MediaStep form={form} />}
            {step === 2 && <InterestsStep form={form} />}
            {step === 3 && <FriendsStep form={form} />}
            {step === 4 && <PremiumStep />}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            type="button"
            variant="outline"
          >
            <ChevronLeft data-icon="inline-start" />
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button
              onClick={() =>
                setStep((current) => Math.min(steps.length - 1, current + 1))
              }
              type="button"
            >
              Next
              <ChevronRight data-icon="inline-end" />
            </Button>
          ) : (
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  <Sparkles data-icon="inline-start" />
                  Finish onboarding
                </Button>
              )}
            </form.Subscribe>
          )}
        </div>
      </form>
    </main>
  );
}

type OnboardingFormApi = any;

function BasicsStep({ form }: { form: OnboardingFormApi }) {
  return (
    <FieldGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="area">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Area</FieldLabel>
              <Input
                id={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Nashville, TN"
                value={field.state.value}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="birthday">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Birthday</FieldLabel>
              <Input
                id={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                type="date"
                value={field.state.value}
              />
            </Field>
          )}
        </form.Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="sex">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Sex</FieldLabel>
              <Input
                id={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Woman, man, nonbinary..."
                value={field.state.value}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="sexuality">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Sexuality</FieldLabel>
              <Input
                id={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Straight, gay, bi..."
                value={field.state.value}
              />
            </Field>
          )}
        </form.Field>
      </div>
      <form.Field name="bio">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Short bio</FieldLabel>
            <Textarea
              id={field.name}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="What should someone know before saying yes?"
              value={field.state.value}
            />
          </Field>
        )}
      </form.Field>
    </FieldGroup>
  );
}

function MediaStep({ form }: { form: OnboardingFormApi }) {
  return (
    <FieldGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="media[0].url">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                <Camera data-icon="inline-start" />
                Profile photo URL
              </FieldLabel>
              <Input
                id={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="https://..."
                value={field.state.value}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="media[1].url">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                <Video data-icon="inline-start" />
                Intro video URL
              </FieldLabel>
              <Input
                id={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="https://..."
                value={field.state.value}
              />
            </Field>
          )}
        </form.Field>
      </div>
      <Field>
        <FieldLabel>Photo slots</FieldLabel>
        <FieldDescription>
          Add up to six real photos after the profile photo. Upload storage is
          coming next; URLs unblock the MVP.
        </FieldDescription>
        <div className="grid gap-3 md:grid-cols-3">
          {[2, 3, 4, 5, 6, 7].map((index) => (
            <form.Field key={index} name={`media[${index}].url`}>
              {(field) => (
                <Input
                  onChange={(event) => {
                    form.setFieldValue(`media[${index}].kind`, "photo");
                    form.setFieldValue(`media[${index}].sortOrder`, index - 1);
                    field.handleChange(event.target.value);
                  }}
                  placeholder={`Photo ${index - 1}`}
                  value={field.state.value ?? ""}
                />
              )}
            </form.Field>
          ))}
        </div>
      </Field>
    </FieldGroup>
  );
}

function InterestsStep({ form }: { form: OnboardingFormApi }) {
  return (
    <FieldGroup>
      <form.Field name="favoriteThings">
        {(field) => (
          <Field>
            <FieldLabel>Favorite things</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {promptChips.map((chip) => {
                const selected = field.state.value.includes(chip);
                return (
                  <Button
                    key={chip}
                    onClick={() =>
                      field.handleChange(
                        selected
                          ? field.state.value.filter((item) => item !== chip)
                          : [...field.state.value, chip]
                      )
                    }
                    type="button"
                    variant={selected ? "default" : "outline"}
                  >
                    {chip}
                  </Button>
                );
              })}
            </div>
          </Field>
        )}
      </form.Field>
      <form.Field name="interests">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Interests</FieldLabel>
            <Input
              id={field.name}
              onChange={(event) =>
                field.handleChange(splitList(event.target.value))
              }
              placeholder="food, live music, workouts"
              value={field.state.value.join(", ")}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name="interestedIn">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Interested in</FieldLabel>
            <Input
              id={field.name}
              onChange={(event) =>
                field.handleChange(splitList(event.target.value))
              }
              placeholder="women, men, couples, friends"
              value={field.state.value.join(", ")}
            />
          </Field>
        )}
      </form.Field>
    </FieldGroup>
  );
}

function FriendsStep({ form }: { form: OnboardingFormApi }) {
  return (
    <FieldGroup>
      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <HeartHandshake />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Chewbuu is better with friends.</p>
            <p className="text-muted-foreground">
              Mingle and Sugar members can bring up to three people on group
              dates.
            </p>
          </div>
        </CardContent>
      </Card>
      <form.Field name="friendInvites[0].email">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Invite a friend</FieldLabel>
            <Input
              id={field.name}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="friend@example.com"
              value={field.state.value ?? ""}
            />
          </Field>
        )}
      </form.Field>
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="trustedContacts[0].name">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Safety contact name</FieldLabel>
              <Input
                id={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Optional"
                value={field.state.value ?? ""}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="trustedContacts[0].email">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Safety contact email</FieldLabel>
              <Input
                id={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Optional"
                value={field.state.value ?? ""}
              />
            </Field>
          )}
        </form.Field>
      </div>
    </FieldGroup>
  );
}

function PremiumStep() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        [
          "Social",
          "Free",
          "Solo dates, Dutch by default, two booked dates per day.",
        ],
        [
          "Mingle",
          "Groups",
          "Bring friends, create circles, and match with other groups.",
        ],
        [
          "Sugar",
          "Highest",
          "Cover the date, request premium matches, and unlock every social mode.",
        ],
      ].map(([name, label, description]) => (
        <Card key={name} size="sm">
          <CardHeader>
            <CardTitle>{name}</CardTitle>
            <CardDescription>{label}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">{description}</p>
            <Avatar>
              <AvatarImage alt="" src="" />
              <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
            </Avatar>
          </CardContent>
        </Card>
      ))}
      <Link
        className="text-sm underline underline-offset-4 md:col-span-3"
        to="/dashboard"
      >
        I will upgrade later
      </Link>
    </div>
  );
}
