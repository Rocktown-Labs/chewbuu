import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  HelpCircle,
  Scale,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

const termsOverview = [
  "You must be 18 or older, use your real account, keep credentials secure, and provide accurate profile, safety, and payment information.",
  "Zero tolerance for human trafficking, forced labor, prostitution, escort services, sexual exploitation, abuse, coercion, grooming, or commercial solicitation.",
  "No fake profiles, harassment, scams, threats, non-consensual content, illegal activity, or attempts to bypass safety and verification systems.",
  "Chewbuu connects adults for in-person dining and social dates at partner venues, but cannot guarantee chemistry, personal behavior, or venue table availability.",
  "Subscriptions auto-renew monthly or annually until canceled. Consumer subscriptions can be canceled in Account Settings; venue managers can cancel Sync in the Sync workspace. Payments are processed in USD, and the final statement descriptor is shown by the payment processor.",
  "Depending on availability, safety tools may use location, trusted contacts, venue alerts, and emergency escalation. Chewbuu cooperates with valid lawful law-enforcement requests.",
];

const termsSections = [
  {
    title: "1. Eligibility and Strict Age Requirement",
    body: [
      "You must be at least 18 years of age and legally capable of entering a binding contract to use Chewbuu.",
      "Minors (anyone under the age of 18) are strictly prohibited from creating accounts, browsing profiles, or attending events.",
      "You agree to provide accurate, truthful account, profile, age, identity, contact, and payment information.",
      "You are solely responsible for maintaining the confidentiality of your credentials and for all activity conducted through your account.",
    ],
  },
  {
    title: "2. Human Trafficking, Exploitation, and Abuse",
    highlight: true,
    body: [
      "Chewbuu strictly prohibits human trafficking, forced labor, sexual exploitation, prostitution, escort services, abuse, coercion, and the use of Chewbuu to recruit, solicit, arrange, facilitate, aid, abet, encourage, or profit from these activities.",
      "Users may not use the service to exploit, threaten, groom, or control another person, or to exchange money, financial compensation, gifts, or allowances for dates, companionship, or intimacy.",
      "Any profile, message, or activity suggesting, facilitating, or promoting sexual exploitation, non-consensual sexual content, or compensated dating arrangements will result in immediate permanent account termination.",
      "We reserve the right to remove content, suspend or terminate accounts without prior notice, preserve relevant information, and cooperate with valid lawful criminal investigations, child protection agencies, and emergency law-enforcement requests.",
    ],
  },
  {
    title: "3. Real Profiles, Community Conduct, and Acceptable Use",
    body: [
      "Chewbuu is dedicated to real people planning authentic, in-person dining and social experiences. Impersonation, fake profiles, automated bots, romance scams, harassment, stalking, hate speech, and spam are strictly forbidden.",
      "Users must comply at all times with our Acceptable Use Policy (/acceptable-use), which governs permissible conduct on the platform.",
      "You may not upload or distribute content that is non-consensual, misleading, sexually explicit, hateful, defamatory, or infringing upon third-party rights.",
      "Chewbuu uses the verification checks and safety review processes described in the service and may restrict accounts or content that violate these Terms.",
    ],
  },
  {
    title: "4. Social Dining, Matches, and Date Coordination",
    body: [
      "Chewbuu provides tools to request in-person dates, discover restaurant specials, coordinate group dinners, exchange intro videos, and plan dining itineraries.",
      "A match, invitation, venue recommendation, or compatibility signal is not an endorsement or guarantee of personal compatibility, safety, table availability, or pricing.",
      "You are solely responsible for your interactions with others, both on the app and at physical venues. Exercise sound personal judgment, prioritize public meeting locations, and utilize Chewbuu's active-date safety features.",
    ],
  },
  {
    title: "5. Subscription Billing, Auto-Renewal, and Cancellation",
    body: [
      "Chewbuu offers free access ('Social') and premium paid subscription tiers ('Mingle', 'Host') for consumers, as well as operational software tiers ('Chewbuu Sync') for restaurant venues.",
      "Recurring Billing: All paid subscriptions are billed automatically in advance on a recurring monthly or annual basis until canceled.",
      "Statement Descriptor: Charges are processed in USD through Stripe. The final descriptor shown on your statement depends on the merchant account and transaction.",
      "Self-Serve Cancellation: Consumer subscribers can cancel renewal from Account Settings, and venue managers can cancel Sync from the Sync workspace. Cancellation takes effect at the end of the current paid billing cycle. If self-serve controls are unavailable, email support@chewbuu.com; a completed cancellation stops future renewal charges.",
      "Refund Policy: Subscriptions and payments are subject to our dedicated Refund Policy (/refund-policy), including a 72-hour grace period for accidental subscription renewals upon request.",
    ],
  },
  {
    title: "6. Venue Commerce, Tips, and In-App Dining Transactions",
    body: [
      "Chewbuu enables diners to view menus, pre-order, and pay their dining checks at participating restaurant partners through Stripe Connect.",
      "Chewbuu collects a 5% platform service fee solely on food and beverage subtotals to support payment processing and marketplace coordination.",
      "100% of staff tips and municipal taxes are passed through directly to the venue and service workers; Chewbuu retains $0 from tips and taxes.",
      "Diners are responsible for all ordered food, beverage, applicable taxes, and tips. Restaurant disputes, cancellations, or meal quality issues are resolved under our Refund Policy in coordination with the venue partner.",
    ],
  },
  {
    title: "7. Active Safety Features and Data Consent",
    body: [
      "Chewbuu may offer date check-ins, trusted emergency contacts, location radius verification at partner venues, discreet assistance alerts, and incident reporting.",
      "Safety tools are supplementary and do not replace personal vigilance, venue management, or official emergency services (911). If you are in immediate danger, always contact local emergency responders first.",
      "By activating active-date safety features, you consent to the collection and processing of relevant location and safety signals as outlined in our Privacy Policy (/privacy).",
    ],
  },
  {
    title: "8. Law Enforcement Cooperation and Legal Process",
    body: [
      "Chewbuu maintains formal Protocols for Law Enforcement (/law-enforcement) to respond to subpoenas, court orders, warrants, and emergency requests involving imminent harm.",
      "We strictly uphold user privacy against unlawful or overly broad requests, but cooperate fully with authorized legal process concerning criminal investigations, human trafficking, fraud, and physical safety threats.",
    ],
  },
  {
    title: "9. Disclaimers, Limitation of Liability, and Governing Law",
    body: [
      "Chewbuu is provided on an 'AS IS' and 'AS AVAILABLE' basis without express or implied warranties of merchantability, fitness for a particular purpose, or non-infringement.",
      "To the fullest extent permitted by applicable law, Rocktown Labs LLC and its affiliates shall not be liable for any indirect, incidental, punitive, or consequential damages arising from your use of the platform or conduct of third parties.",
      "These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.",
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
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-12 md:px-8 lg:px-12">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit" variant="secondary">
            <Scale aria-hidden="true" className="size-3.5" />
            Terms & Conditions
          </Badge>
          <div className="space-y-3">
            <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
              Last updated September 6, 2026
            </p>
            <h1 className="text-balance font-extrabold text-4xl md:text-5xl">
              Chewbuu Terms and Conditions
            </h1>
            <p className="max-w-3xl text-muted-foreground text-sm/relaxed md:text-base/relaxed">
              These Terms govern your use of the Chewbuu consumer social dining
              platform and Chewbuu Sync venue operations software provided by
              Rocktown Labs LLC.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowOverview((current) => !current)}
              type="button"
              variant="outline"
            >
              <Sparkles data-icon="inline-start" />
              {showOverview ? "Hide summary" : "Key rules summary"}
            </Button>
            <Button onClick={acknowledgeTerms} type="button">
              <CheckCircle2 data-icon="inline-start" />
              {acknowledged ? "Acknowledged on this device" : "I understand"}
            </Button>
          </div>
        </div>

        {showOverview && (
          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
            <h2 className="font-extrabold text-xl">Key Rules Summary</h2>
            <p className="mt-2 text-muted-foreground text-sm/relaxed">
              A plain-language overview of the core commitments on Chewbuu. This
              summary does not replace the full binding terms below.
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

        {/* Highlight Banner: Human Trafficking & Zero Tolerance */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <strong className="font-bold">Zero Tolerance Policy:</strong>{" "}
              Human trafficking, commercial sexual exploitation, prostitution,
              escort solicitation, coercion, and abuse are strictly prohibited
              on Chewbuu. Violations result in immediate termination, reporting,
              and evidence preservation. Read our dedicated{" "}
              <Link
                className="font-bold underline underline-offset-2 hover:text-amber-700"
                to="/acceptable-use"
              >
                Acceptable Use Policy
              </Link>
              .
            </div>
          </div>
        </div>

        {/* Quick Cross-Nav Bar */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4 text-xs font-semibold text-muted-foreground">
          <span className="text-foreground">Policy directory:</span>
          <Link
            className="hover:text-primary underline-offset-2 hover:underline"
            to="/acceptable-use"
          >
            Acceptable Use (AUP)
          </Link>
          <span>•</span>
          <Link
            className="hover:text-primary underline-offset-2 hover:underline"
            to="/refund-policy"
          >
            Refund & Cancellation
          </Link>
          <span>•</span>
          <Link
            className="hover:text-primary underline-offset-2 hover:underline"
            to="/law-enforcement"
          >
            Law Enforcement Protocols
          </Link>
          <span>•</span>
          <Link
            className="hover:text-primary underline-offset-2 hover:underline"
            to="/privacy"
          >
            Privacy Policy
          </Link>
          <span>•</span>
          <Link
            className="hover:text-primary underline-offset-2 hover:underline"
            to="/pricing"
          >
            Pricing & Plans
          </Link>
          <span>•</span>
          <Link
            className="hover:text-primary underline-offset-2 hover:underline"
            to="/contact"
          >
            Contact Support
          </Link>
        </div>

        {acknowledged && (
          <p className="rounded-2xl border border-border bg-card p-4 text-muted-foreground text-sm">
            Acknowledgement saved on this device. Account creation and continued
            service usage remain subject to these Terms of Service.
          </p>
        )}

        <div className="grid gap-5">
          {termsSections.map((section) => (
            <section
              className={`rounded-2xl border p-6 transition ${
                section.highlight
                  ? "border-amber-500/30 bg-amber-500/5 shadow-sm"
                  : "border-border bg-card"
              }`}
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
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-1 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-extrabold text-xl">Questions or Reports</h2>
              <p className="mt-2 text-muted-foreground text-sm/relaxed">
                For questions regarding these Terms, billing inquiries, or
                safety reports, please reach out to our team at{" "}
                <a
                  className="font-bold text-foreground hover:underline"
                  href="mailto:support@chewbuu.com"
                >
                  support@chewbuu.com
                </a>
                . For formal legal process, see our{" "}
                <Link
                  className="font-bold text-foreground hover:underline"
                  to="/law-enforcement"
                >
                  Law Enforcement Protocols
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/terms")({
  component: TermsRoute,
});
