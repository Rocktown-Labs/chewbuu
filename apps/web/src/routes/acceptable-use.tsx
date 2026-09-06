import { Badge } from "@chewbuu/ui/components/badge";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertOctagon,
  Ban,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

const aupRules = [
  {
    title: "1. Human Trafficking, Forced Labor, and Sexual Exploitation",
    critical: true,
    rules: [
      "Chewbuu maintains a strict, absolute zero-tolerance policy against human trafficking, forced labor, commercial sexual exploitation, prostitution, and escort services.",
      "You may not use Chewbuu to recruit, solicit, arrange, advertise, facilitate, coordinate, aid, abet, encourage, or profit from any form of commercial sex, escort work, or human trafficking.",
      "Compensated companionship, 'sugar dating', financial allowances, pay-per-date arrangements, or exchanging money or gifts for intimacy or personal time are strictly prohibited.",
      "Coercion, manipulation, grooming, extortion, or using physical, psychological, or financial leverage to control another person is cause for immediate account termination, evidence preservation, and referral to criminal authorities.",
    ],
  },
  {
    title: "2. Absolute Protection of Minors",
    critical: true,
    rules: [
      "Chewbuu is strictly restricted to verified adults aged 18 and older. Minors are strictly prohibited from using the platform.",
      "Any account associated with a minor, attempting to contact a minor, or depicting child sexual abuse material (CSAM) or child sexual exploitation and abuse (CSAE) will be terminated immediately.",
      "Chewbuu will make reports to the National Center for Missing & Exploited Children (NCMEC) and relevant law-enforcement agencies when required by applicable law, including 18 U.S.C. § 2258A.",
    ],
  },
  {
    title: "3. Violence, Threats, Harassment, and Stalking",
    critical: false,
    rules: [
      "You may not threaten, harass, stalk, intimidate, dox, bully, or incite violence against any individual or group.",
      "Hate speech targeting race, ethnicity, nationality, religion, sexual orientation, gender identity, disability, or veteran status is strictly prohibited.",
      "You may not attempt to track a user's physical movements without authorization or show up uninvited at their residence, workplace, or private locations.",
    ],
  },
  {
    title: "4. Non-Consensual Imagery and Sexual Misconduct",
    critical: false,
    rules: [
      "You may not upload, transmit, or solicit non-consensual intimate imagery (NCII), revenge pornography, or sexually explicit content without explicit verified consent.",
      "Secret audio, photo, or video recording during in-person dining dates or private encounters without full consent is strictly prohibited.",
      "Sending unsolicited explicit sexual images or messages ('cyber-flashing') will result in account suspension or termination.",
    ],
  },
  {
    title: "5. Fraud, Romance Scams, Deception, and Automated Bots",
    critical: false,
    rules: [
      "You must provide accurate information and use genuine photos of yourself. Impersonating another person, creating fake personas, or using AI-generated deepfakes to deceive users is prohibited.",
      "Romance scams, crypto schemes, advance-fee fraud, financial grooming, and soliciting money, gift cards, or wire transfers are strictly prohibited.",
      "Automated scripts, web scrapers, bots, multi-accounting, or commercial software interacting with Chewbuu APIs without authorization are prohibited.",
    ],
  },
  {
    title: "6. Weapons, Controlled Substances, and Unlawful Trade",
    critical: false,
    rules: [
      "You may not use Chewbuu to buy, sell, facilitate, or promote the sale of firearms, ammunition, explosives, controlled substances, illegal drugs, or prescription medications.",
      "Chewbuu may not be used for money laundering, terrorist financing, or any activity that violates state, federal, or international laws.",
    ],
  },
  {
    title: "7. Moderation, Account Termination, and Evidence Preservation",
    critical: false,
    rules: [
      "Chewbuu may use automated checks, identity verification checks, and human review when available to identify violations.",
      "We reserve the right to remove any content, suspend features, or permanently terminate accounts immediately without prior notice or refund for violations of this Policy.",
      "Chewbuu may preserve account, message, and payment information and disclose it in response to valid legal process or an emergency request involving imminent harm.",
    ],
  },
];

function AcceptableUseRoute() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-12 md:px-8 lg:px-12">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit" variant="secondary">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Acceptable Use Policy (AUP)
          </Badge>
          <div className="space-y-3">
            <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
              Last updated September 6, 2026
            </p>
            <h1 className="text-balance font-extrabold text-4xl md:text-5xl">
              Acceptable Use Policy
            </h1>
            <p className="max-w-3xl text-muted-foreground text-sm/relaxed md:text-base/relaxed">
              Chewbuu is built to bring verified adults together for real-world
              social dining and dates at licensed hospitality partner venues.
              This Acceptable Use Policy establishes strict standards of conduct
              to keep our community safe, lawful, and authentic.
            </p>
          </div>
        </div>

        {/* Critical Alert: Human Trafficking & Zero Tolerance */}
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-destructive-foreground dark:text-rose-200">
          <div className="flex items-start gap-3.5">
            <AlertOctagon className="mt-1 size-6 shrink-0 text-destructive" />
            <div className="space-y-2 text-sm leading-relaxed">
              <h2 className="font-extrabold text-base text-foreground">
                Strict Zero Tolerance for Human Trafficking & Commercial Sexual
                Exploitation
              </h2>
              <p className="text-muted-foreground">
                Chewbuu strictly prohibits human trafficking, forced labor,
                prostitution, escort services, sex work, grooming, sexual
                exploitation, and compensated companionship. Any attempt to use
                Chewbuu to solicit, recruit, arrange, facilitate, or profit from
                commercial sexual services or exploitation will result in
                account restriction or termination, preservation of relevant
                evidence, and reporting to law enforcement authorities when
                required by law or appropriate for an emergency.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Cross-Links */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4 text-xs font-semibold text-muted-foreground">
          <span className="text-foreground">Related policies:</span>
          <Link
            className="hover:text-primary underline-offset-2 hover:underline"
            to="/terms"
          >
            Terms & Conditions
          </Link>
          <span>•</span>
          <Link
            className="hover:text-primary underline-offset-2 hover:underline"
            to="/refund-policy"
          >
            Refund & Cancellation Policy
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
            to="/contact"
          >
            Contact Safety Team
          </Link>
        </div>

        <div className="grid gap-5">
          {aupRules.map((section) => (
            <article
              className={`rounded-2xl border p-6 transition ${
                section.critical
                  ? "border-amber-500/40 bg-amber-500/5 shadow-sm"
                  : "border-border bg-card"
              }`}
              key={section.title}
            >
              <div className="flex items-center gap-2.5">
                {section.critical ? (
                  <ShieldAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Ban className="size-4 shrink-0 text-primary" />
                )}
                <h2 className="font-extrabold text-lg sm:text-xl">
                  {section.title}
                </h2>
              </div>
              <ul className="mt-4 flex flex-col gap-3 text-muted-foreground text-sm/relaxed">
                {section.rules.map((rule) => (
                  <li className="flex gap-3" key={rule}>
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Reporting Section */}
        <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
          <div className="flex items-start gap-3.5">
            <Mail className="mt-1 size-5 shrink-0 text-primary" />
            <div className="space-y-2">
              <h2 className="font-extrabold text-xl">
                How to Report a Violation
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If you encounter any profile, message, or activity that violates
                this Acceptable Use Policy, contact our Trust & Safety team
                directly at{" "}
                <a
                  className="font-bold text-foreground hover:underline"
                  href="mailto:safety@chewbuu.com"
                >
                  safety@chewbuu.com
                </a>
                . We review reports as soon as practicable, but do not promise a
                fixed response time. If there is immediate danger or risk of
                physical harm, please call local emergency services (911 in the
                United States) first.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/acceptable-use")({
  component: AcceptableUseRoute,
});
