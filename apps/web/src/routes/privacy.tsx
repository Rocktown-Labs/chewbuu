import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

const privacyOverview = [
  "We collect account, profile, media, date planning, location, chat, payment, support, device, and safety information.",
  "We use it to run Chewbuu, verify people, suggest places, match users, manage dates, process subscriptions, prevent abuse, and support active-date safety.",
  "We do not plan to sell private dating data, exact active-date location, messages, sensitive profile details, or media to data brokers.",
  "We may share limited booking or safety details with service providers, venue partners, trusted contacts, emergency responders, or law enforcement when needed.",
  "Important concerns: dating data is sensitive, location can reveal habits, safety recording tools require consent, and partner ads should stay coarse and privacy-protective.",
];

const privacySections = [
  {
    title: "Information We Collect",
    body: [
      "Account details such as your name, email, phone number, username, birthday, membership tier, login data, and support messages.",
      "Profile details you choose to provide, including photos, videos, bio, relationship status, preferences, interests, politics, religion, kids, future-kids preferences, and what you are looking for.",
      "Date planning details such as selected places, date times, party members, payment preferences, match decisions, chat activity, date recaps, reviews, and safety check-ins.",
      "Location information when you allow it, including coarse location for recommendations and more precise location during active date safety flows.",
      "Device, usage, fraud-prevention, and security data that helps us operate Chewbuu and detect bots, abuse, spam, fake profiles, and unsafe behavior.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "To create profiles, verify real people, suggest date spots, return matches, support chats, manage bookings, and let users post recaps.",
      "To power safety features such as trusted contacts, active-date geofences, arrival and departure checks, escalation workflows, and incident review.",
      "To help restaurants or venue partners confirm and manage Chewbuu bookings, understand who is attached to a reservation, and reduce dine-and-dash or safety issues.",
      "To process subscriptions, payments, refunds, support requests, product analytics, security monitoring, and legal compliance.",
      "To improve the app, including reliability, onboarding, matching, recommendations, fraud detection, and place quality.",
    ],
  },
  {
    title: "Data We Do Not Sell",
    body: [
      "Chewbuu is built around subscriptions and date commerce, not selling personal dating data.",
      "We do not sell your private messages, exact active-date location, profile media, sexual orientation, politics, religion, race, or relationship preferences to data brokers.",
      "If Chewbuu offers venue or event ads, we may use privacy-protective segments such as city, membership tier, broad date category, or coarse interests. We will not give advertisers your private profile or chat content.",
    ],
  },
  {
    title: "Sharing",
    body: [
      "We share information with service providers that help us run Chewbuu, including hosting, authentication, payments, storage, messaging, analytics, security, email, SMS, chat, video, and support tools.",
      "We may share limited booking and safety information with date spots, restaurant partners, safety contacts, emergency responders, or law enforcement when needed to manage an active date, prevent harm, investigate abuse, or comply with law.",
      "We may share aggregated or de-identified trends with venue partners, such as booking volume, popular date categories, and review summaries.",
      "If Chewbuu adds partner dashboards or ads, we will provide controls and additional disclosures before expanding how partner data is used.",
    ],
  },
  {
    title: "Safety Recording And Active Date Tools",
    body: [
      "Chewbuu may offer active-date tools that let users discreetly check in, contact safety support, notify a trusted contact, alert a venue, request help, or end a date.",
      "If audio recording or similar emergency recording tools are enabled, users must consent before using those features. These tools are intended for safety, incident documentation, and abuse prevention, not routine monitoring.",
      "Safety recordings, reports, and location pings may be reviewed by Chewbuu or trusted providers when a user requests help, reports an incident, or when we believe there is a risk of harm.",
    ],
  },
  {
    title: "Retention And Choices",
    body: [
      "We keep information while your account is active and as needed for safety, fraud prevention, legal, tax, payment, backup, dispute, and support purposes.",
      "You can request access, correction, deletion, or a copy of your data by contacting support. Some information may be retained where needed for safety, legal compliance, payment records, or abuse prevention.",
      "You can control browser or device permissions for camera, microphone, notifications, and location. Some Chewbuu features may not work without those permissions.",
    ],
  },
];

function PrivacyRoute() {
  const [showOverview, setShowOverview] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const acknowledgePolicy = () => {
    localStorage.setItem(
      "chewbuu_privacy_acknowledged_at",
      new Date().toISOString()
    );
    setAcknowledged(true);
  };

  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground md:px-12">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit" variant="secondary">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Privacy
          </Badge>
          <div className="space-y-3">
            <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
              Last updated July 17, 2026
            </p>
            <h1 className="text-balance font-extrabold text-4xl md:text-6xl">
              Chewbuu Privacy Policy
            </h1>
            <p className="max-w-3xl text-muted-foreground text-sm/relaxed md:text-base/relaxed">
              This is a launch draft for review by counsel. It explains how
              Chewbuu expects to collect, use, and protect information while
              helping people request dates, chat with matches, meet at real
              places, and stay safer during active dates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowOverview((current) => !current)}
              type="button"
              variant="outline"
            >
              <Sparkles data-icon="inline-start" />
              {showOverview ? "Hide AI overview" : "AI overview"}
            </Button>
            <Button onClick={acknowledgePolicy} type="button">
              <CheckCircle2 data-icon="inline-start" />
              {acknowledged ? "Acknowledged" : "I understand"}
            </Button>
          </div>
        </div>

        {showOverview && (
          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
            <h2 className="font-extrabold text-xl">AI Overview</h2>
            <p className="mt-2 text-muted-foreground text-sm/relaxed">
              A plain-language summary of the most important privacy points.
              This summary does not replace the policy below.
            </p>
            <ul className="mt-4 flex flex-col gap-3 text-sm/relaxed">
              {privacyOverview.map((item) => (
                <li className="flex gap-3" key={item}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {acknowledged && (
          <p className="rounded-2xl border border-border bg-card p-4 text-muted-foreground text-sm">
            Acknowledgement saved on this device. Account creation still
            requires accepting the Privacy Policy and Terms of Service.
          </p>
        )}

        <div className="grid gap-4">
          {privacySections.map((section) => (
            <section
              className="rounded-2xl border border-border bg-card p-6"
              key={section.title}
            >
              <h2 className="font-extrabold text-xl">{section.title}</h2>
              <ul className="mt-4 flex flex-col gap-3 text-muted-foreground text-sm/relaxed">
                {section.body.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
          <h2 className="font-extrabold text-xl">Contact</h2>
          <p className="mt-3 text-muted-foreground text-sm/relaxed">
            Questions or privacy requests can be sent to{" "}
            <a
              className="font-semibold text-foreground"
              href="mailto:support@chewbuu.com"
            >
              support@chewbuu.com
            </a>
            . For related rules, read the{" "}
            <Link className="font-semibold text-foreground" to="/terms">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/privacy")({
  component: PrivacyRoute,
});
