import { Badge } from "@chewbuu/ui/components/badge";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, Gavel, Mail, Shield } from "lucide-react";

const protocols = [
  {
    title: "1. Overview & General Policy",
    body: [
      "These operational guidelines are published for federal, state, local, and international law enforcement agencies seeking subscriber information, transactional records, or assistance from Chewbuu (operated by Rocktown Labs LLC).",
      "Chewbuu is committed to user privacy and civil liberties while providing prompt, lawful cooperation to authorized law enforcement and regulatory authorities investigating criminal offenses, missing persons, human trafficking, and safety threats.",
      "All requests for user data must strictly comply with applicable law, including the Electronic Communications Privacy Act (ECPA), 18 U.S.C. § 2701 et seq.",
    ],
  },
  {
    title: "2. Required Legal Process Standards",
    body: [
      "Subpoenas (18 U.S.C. § 2703(c)(2)): Valid administrative, grand jury, or trial subpoenas compel the disclosure of basic subscriber records, including user account name, email address, registration date, IP connection logs at sign-up, and payment transaction metadata.",
      "Court Orders (18 U.S.C. § 2703(d)): A court order signed by a judge or magistrate, establishing specific and articulable facts showing reasonable grounds to believe records are relevant and material to an ongoing criminal investigation, is required to compel non-content transactional logs, date request metadata, and device identifiers.",
      "Search Warrants: A search warrant issued upon a judicial finding of probable cause under Federal Rule of Criminal Procedure 41 or equivalent state law is strictly required to obtain the stored content of private communications (e.g., in-app direct messages, intro videos, or private media).",
    ],
  },
  {
    title: "3. Emergency Disclosure Requests (18 U.S.C. § 2702(b)(8))",
    highlight: true,
    body: [
      "Under 18 U.S.C. § 2702(b)(8) and § 2702(c)(4), Chewbuu may voluntarily disclose subscriber information to law enforcement where we have a good-faith belief that an emergency involving imminent danger of death or serious physical injury to any person requires disclosure without delay.",
      "Submission of Emergency Requests: Sworn law enforcement officers must submit an official emergency request from their official government email domain to lawenforcement@chewbuu.com with the subject line 'EMERGENCY DISCLOSURE REQUEST'.",
      "The request must articulate: (a) the nature of the imminent threat of death or serious bodily injury, (b) the identity of the person in danger, (c) the specific user identifier linked to Chewbuu, and (d) why obtaining judicial process through standard channels is impossible in the necessary timeframe.",
    ],
  },
  {
    title: "4. Data Preservation Requests (18 U.S.C. § 2703(f))",
    body: [
      "Chewbuu will evaluate formal preservation requests submitted pursuant to 18 U.S.C. § 2703(f) and respond as required by applicable law.",
      "When a valid preservation request is accepted, records are preserved only to the extent they exist and for the period required by applicable law or a valid request.",
      "Preservation requests must specifically identify the account by email, account ID, or phone number, and must be submitted on official law enforcement agency letterhead.",
    ],
  },
  {
    title: "5. Child Sexual Exploitation & Human Trafficking (NCMEC Reporting)",
    highlight: true,
    body: [
      "Chewbuu maintains absolute zero tolerance for child sexual abuse material (CSAM), child sexual exploitation and abuse (CSAE), and human trafficking.",
      "Chewbuu will make reports to the National Center for Missing & Exploited Children (NCMEC) CyberTipline and relevant authorities when required by applicable law. Any disclosure is limited to information lawfully available and appropriate to the report.",
      "Law enforcement agencies investigating NCMEC reports involving Chewbuu accounts may reference the NCMEC CyberTipline report number in communications with our compliance team.",
    ],
  },
  {
    title: "6. Submission Guidelines and Service of Process",
    body: [
      "Submission Channel: All legal process, preservation requests, and emergency disclosure applications must be transmitted electronically from an official government email domain (e.g., .gov or official police agency domain) to: lawenforcement@chewbuu.com.",
      "Required Documentation: Requests must be submitted in PDF format on official agency letterhead, signed by the requesting officer, detective, prosecutor, or judicial officer, and must include: (1) full agency name and address, (2) officer badge/ID number and contact phone, (3) specific Chewbuu user identifier (email, phone, profile handle, or Stripe transaction ID), and (4) case or docket number.",
      "Overly Broad Requests: Chewbuu reserves the right to reject or narrow requests that are overly broad, vague, technically unfeasible, or inconsistent with legal standards.",
    ],
  },
  {
    title: "7. User Notice Policy",
    body: [
      "Where legally permitted and reasonably practicable, Chewbuu may notify users of requests seeking their account information before disclosure.",
      "Chewbuu will not provide notice where notice is prohibited by valid legal process or where notice could create an imminent risk of physical harm, endanger minors, or impede an active investigation.",
    ],
  },
  {
    title: "8. Cost Reimbursement",
    body: [
      "As permitted under 18 U.S.C. § 2706, Chewbuu reserves the right to seek statutory reimbursement for direct costs incurred in researching, assembling, and reproducing records pursuant to legal process, except in emergency cases or investigations involving child exploitation.",
    ],
  },
];

function LawEnforcementRoute() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-12 md:px-8 lg:px-12">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit" variant="secondary">
            <Gavel aria-hidden="true" className="size-3.5" />
            Legal & Compliance
          </Badge>
          <div className="space-y-3">
            <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
              Last updated September 6, 2026
            </p>
            <h1 className="text-balance font-extrabold text-4xl md:text-5xl">
              Law Enforcement Protocols
            </h1>
            <p className="max-w-3xl text-muted-foreground text-sm/relaxed md:text-base/relaxed">
              Operational guidelines and legal standards for government
              agencies, prosecutors, and sworn law enforcement officers seeking
              records or assistance from Chewbuu (Rocktown Labs LLC).
            </p>
          </div>
        </div>

        {/* Emergency Callout Card */}
        <div className="rounded-3xl border border-primary/40 bg-primary/10 p-6">
          <div className="flex items-start gap-3.5">
            <Shield className="mt-1 size-6 shrink-0 text-primary" />
            <div className="space-y-2 text-sm leading-relaxed">
              <h2 className="font-extrabold text-base text-foreground">
                Dedicated Law Enforcement Contact Point
              </h2>
              <p className="text-muted-foreground">
                Authorized law enforcement officials may direct legal process,
                preservation letters (18 U.S.C. § 2703(f)), and emergency
                disclosure requests directly to:
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground transition hover:opacity-90"
                  href="mailto:lawenforcement@chewbuu.com"
                >
                  <Mail className="size-4" /> lawenforcement@chewbuu.com
                </a>
                <span className="text-xs text-muted-foreground">
                  Include your agency, case number, legal authority, and a
                  specific account identifier.
                </span>
              </div>
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
            to="/acceptable-use"
          >
            Acceptable Use (AUP)
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
            Contact Legal Team
          </Link>
        </div>

        <div className="grid gap-5">
          {protocols.map((section) => (
            <article
              className={`rounded-2xl border p-6 transition ${
                section.highlight
                  ? "border-amber-500/30 bg-amber-500/5 shadow-sm"
                  : "border-border bg-card"
              }`}
              key={section.title}
            >
              <h2 className="font-extrabold text-lg sm:text-xl">
                {section.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-3 text-muted-foreground text-sm/relaxed">
                {section.body.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-3.5">
            <Building2 className="mt-1 size-5 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <h2 className="font-extrabold text-base">
                Corporate Information for Service of Process
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Entity: Rocktown Labs LLC
                <br />
                Attn: Legal & Compliance Department
                <br />
                Electronic Submission:{" "}
                <a
                  className="font-bold text-foreground hover:underline"
                  href="mailto:lawenforcement@chewbuu.com"
                >
                  lawenforcement@chewbuu.com
                </a>
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/law-enforcement")({
  component: LawEnforcementRoute,
});
