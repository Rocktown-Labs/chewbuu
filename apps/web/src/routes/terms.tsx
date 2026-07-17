import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileText, Sparkles } from "lucide-react";
import { useState } from "react";

const termsOverview = [
  "You must be 18 or older, use your real account, keep credentials secure, and provide accurate profile, safety, and payment information.",
  "No fake profiles, harassment, scams, threats, non-consensual content, illegal activity, or attempts to bypass safety and verification systems.",
  "Chewbuu helps request dates, exchange videos, chat, book places, invite friends or partners, and post recaps, but it cannot guarantee chemistry, behavior, venue availability, or safety.",
  "Subscriptions, venue bookings, pre-orders, ads, and partner tools may create fees or commercial relationships. Users usually pay their own date costs unless a feature says otherwise.",
  "Safety tools can use location, reports, recordings where consented and lawful, trusted contacts, venue alerts, and emergency escalation. Misuse can lead to account action.",
];

const termsSections = [
  {
    title: "Eligibility",
    body: [
      "You must be at least 18 years old and legally able to enter this agreement to use Chewbuu.",
      "You agree to provide accurate account, profile, age, contact, payment, and safety information.",
      "You are responsible for keeping your account secure and for activity that happens through your account.",
    ],
  },
  {
    title: "Real Profiles And Respectful Conduct",
    body: [
      "Chewbuu is for real people planning real dates. Fake profiles, impersonation, harassment, threats, scams, spam, abuse, illegal activity, and attempts to bypass safety systems are not allowed.",
      "You may not upload content that is misleading, hateful, explicit without consent, exploitative, illegal, or violates another person's rights.",
      "Chewbuu may remove content, restrict features, suspend accounts, or ban users when needed to protect the community, enforce these terms, or comply with law.",
    ],
  },
  {
    title: "Date Requests, Matches, Chats, And Recaps",
    body: [
      "Chewbuu helps users request dates, select places, review matches, exchange videos, chat, invite friends or partners, and post date recaps.",
      "A match, chat, booking, venue recommendation, or compatibility signal is not a guarantee of chemistry, safety, availability, pricing, or a successful date.",
      "You are responsible for how you interact with other people on and off Chewbuu. Use judgment, respect boundaries, and report unsafe behavior.",
    ],
  },
  {
    title: "Subscriptions, Date Costs, And Partner Venues",
    body: [
      "Chewbuu may offer free and paid tiers. Paid subscriptions, booking features, pre-orders, partner offers, and premium tools may have additional purchase terms.",
      "Unless Chewbuu states otherwise, users are responsible for their own date costs, tips, taxes, venue charges, cancellations, and no-show fees.",
      "Venue partners may use Chewbuu tools to confirm bookings, manage date plans, prepare pre-orders, run eligible promotions, and reduce fraud or skipped bills.",
      "Chewbuu may receive subscription revenue, transaction fees, partner payments, advertising revenue, or other commercial consideration from features that help users and venues complete real dates.",
    ],
  },
  {
    title: "Safety Features",
    body: [
      "Chewbuu may offer date check-ins, trusted contact notifications, location geofencing, venue alerts, discreet prompts, incident reports, and emergency escalation tools.",
      "Safety tools are designed to help, but they do not replace your judgment, venue staff, emergency services, or law enforcement. If there is immediate danger, call emergency services first.",
      "By enabling or using active-date safety tools, you consent to the collection and use of related safety data, which may include location, timestamps, device signals, reports, messages, photos, videos, and emergency recordings where available and lawful.",
      "If safety recording tools are offered, all users must consent before using them. Misuse of safety tools or false reports may result in account action.",
    ],
  },
  {
    title: "Privacy And Data",
    body: [
      "Your use of Chewbuu is also governed by our Privacy Policy.",
      "Chewbuu does not plan to sell personal dating data. We may use data to operate the service, improve matching and recommendations, detect bots and abuse, keep people safer, support partner bookings, process payments, and comply with law.",
      "If Chewbuu introduces venue ads, party promotions, or partner dashboards, those features may use coarse, aggregated, or privacy-protective signals rather than private messages or sensitive profile details.",
    ],
  },
  {
    title: "Disclaimers And Changes",
    body: [
      "Chewbuu is provided as is and as available. We do not promise uninterrupted service, perfect matches, venue availability, or that every user or place will behave as expected.",
      "We may update these terms as Chewbuu evolves. If changes are material, we will provide reasonable notice in the app, by email, or by updating this page.",
      "These launch terms are a product draft and should be reviewed by legal counsel before broad public release.",
    ],
  },
];

function TermsRoute() {
  const [showOverview, setShowOverview] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const acknowledgeTerms = () => {
    localStorage.setItem(
      "chewbuu_terms_acknowledged_at",
      new Date().toISOString()
    );
    setAcknowledged(true);
  };

  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground md:px-12">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit" variant="secondary">
            <FileText aria-hidden="true" className="size-3.5" />
            Terms
          </Badge>
          <div className="space-y-3">
            <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
              Last updated July 17, 2026
            </p>
            <h1 className="text-balance font-extrabold text-4xl md:text-6xl">
              Chewbuu Terms of Service
            </h1>
            <p className="max-w-3xl text-muted-foreground text-sm/relaxed md:text-base/relaxed">
              These terms describe the rules for using Chewbuu to create a
              profile, request dates, match, chat, invite friends or partners,
              meet at local places, and use active-date safety tools.
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
            <Button onClick={acknowledgeTerms} type="button">
              <CheckCircle2 data-icon="inline-start" />
              {acknowledged ? "Acknowledged" : "I understand"}
            </Button>
          </div>
        </div>

        {showOverview && (
          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
            <h2 className="font-extrabold text-xl">AI Overview</h2>
            <p className="mt-2 text-muted-foreground text-sm/relaxed">
              A plain-language summary of the most important terms. This summary
              does not replace the full terms below.
            </p>
            <ul className="mt-4 flex flex-col gap-3 text-sm/relaxed">
              {termsOverview.map((item) => (
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
          {termsSections.map((section) => (
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
          <h2 className="font-extrabold text-xl">Questions</h2>
          <p className="mt-3 text-muted-foreground text-sm/relaxed">
            Contact{" "}
            <a
              className="font-semibold text-foreground"
              href="mailto:support@chewbuu.com"
            >
              support@chewbuu.com
            </a>{" "}
            with questions. You should also review the{" "}
            <Link className="font-semibold text-foreground" to="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/terms")({
  component: TermsRoute,
});
