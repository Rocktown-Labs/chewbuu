import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import { Input } from "@chewbuu/ui/components/input";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CreditCard,
  Gavel,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const departments = [
  {
    email: "support@chewbuu.com",
    icon: MessageSquare,
    response: "Response timing varies",
    title: "Customer & Member Support",
    description:
      "Help with your profile, date planning, app navigation, or general questions.",
  },
  {
    email: "billing@chewbuu.com",
    icon: CreditCard,
    response: "Response timing varies",
    title: "Billing & Subscriptions",
    description:
      "Subscription cancellations, 72-hour renewal refunds, receipts, or statement inquiries.",
  },
  {
    email: "safety@chewbuu.com",
    icon: ShieldCheck,
    response: "Review timing varies",
    title: "Trust & Safety / Abuse Reports",
    description:
      "Report fake accounts, harassment, policy violations, or safety concerns.",
  },
  {
    email: "lawenforcement@chewbuu.com",
    icon: Gavel,
    response: "For official legal process",
    title: "Law Enforcement & Legal Process",
    description:
      "Subpoenas, warrants, preservation letters, and emergency requests from sworn agencies.",
  },
  {
    email: "venues@chewbuu.com",
    icon: Store,
    response: "Response timing varies",
    title: "Venue & Restaurant Partners",
    description:
      "Chewbuu Sync operations, table management setup, specials promotions, and merchant payouts.",
  },
];

function ContactRoute() {
  const [topic, setTopic] = useState("general");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedTo, setSubmittedTo] = useState("support@chewbuu.com");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !message) {
      toast.error("Please provide your email and message.");
      return;
    }

    // Compose mailto fallback as client-side trigger
    const targetEmail =
      topic === "billing"
        ? "billing@chewbuu.com"
        : topic === "safety"
          ? "safety@chewbuu.com"
          : topic === "venue"
            ? "venues@chewbuu.com"
            : topic === "legal"
              ? "lawenforcement@chewbuu.com"
              : "support@chewbuu.com";

    const subject = encodeURIComponent(
      `[Chewbuu Inquiry] ${topic.toUpperCase()} - from ${name || "Member"}`
    );
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}`
    );

    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
    setSubmittedTo(targetEmail);
    setSubmitted(true);
    toast.success("Opening your email client to send your inquiry!");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-12 md:px-8 lg:px-12">
        <div className="space-y-4 text-center sm:text-left">
          <Badge className="w-fit mx-auto sm:mx-0" variant="secondary">
            <Mail aria-hidden="true" className="size-3.5" />
            Contact & Support
          </Badge>
          <h1 className="text-balance font-extrabold text-4xl sm:text-5xl">
            Get in touch with Chewbuu
          </h1>
          <p className="max-w-2xl text-muted-foreground text-sm/relaxed sm:text-base/relaxed">
            Have a question about your account, a billing charge, or restaurant
            partnership? We are here to help. Reach our team directly through
            the departments below.
          </p>
        </div>

        {/* Contact Department Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map(
            ({ icon: Icon, title, description, email: mailto, response }) => (
              <div
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
                key={title}
              >
                <div>
                  <span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h2 className="mt-3.5 font-bold text-base">{title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>

                <div className="mt-4 border-t border-border/60 pt-3 text-xs">
                  <a
                    className="font-bold text-primary hover:underline"
                    href={`mailto:${mailto}`}
                  >
                    {mailto}
                  </a>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {response}
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Form and Entity Split */}
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          {/* Interactive Message Box */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-extrabold text-2xl">
              Send us a direct message
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Select your topic and submit; our support team will follow up
              quickly.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-semibold"
                    htmlFor="contact-name"
                  >
                    Your Name
                  </label>
                  <Input
                    id="contact-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    value={name}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-semibold"
                    htmlFor="contact-email"
                  >
                    Account / Contact Email *
                  </label>
                  <Input
                    id="contact-email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    required
                    type="email"
                    value={email}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold"
                  htmlFor="contact-topic"
                >
                  Inquiry Category *
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  id="contact-topic"
                  onChange={(e) => setTopic(e.target.value)}
                  value={topic}
                >
                  <option value="general">
                    General Support & Account Help
                  </option>
                  <option value="billing">
                    Billing, Cancellation & Refunds
                  </option>
                  <option value="safety">Trust & Safety / Member Report</option>
                  <option value="venue">Venue Partner (Chewbuu Sync)</option>
                  <option value="legal">Legal Process & Compliance</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold"
                  htmlFor="contact-message"
                >
                  How can we help? *
                </label>
                <Textarea
                  id="contact-message"
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry, order details, or question..."
                  required
                  rows={4}
                  value={message}
                />
              </div>

              <Button className="w-full sm:w-auto font-bold" type="submit">
                <Send data-icon="inline-start" /> Send Inquiry
              </Button>

              {submitted && (
                <p className="text-xs font-semibold text-emerald-600">
                  Thank you! If your email client didn't open automatically, you
                  can always write to {submittedTo} directly.
                </p>
              )}
            </form>
          </div>

          {/* Corporate Entity & Compliance Info */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-muted/20 p-6 sm:p-8">
              <span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </span>
              <h3 className="mt-4 font-extrabold text-xl">Operating Entity</h3>
              <div className="mt-3 space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">Rocktown Labs LLC</strong>
                  <br />
                  Chewbuu Platform Operations
                </p>
                <p>
                  Chewbuu provides in-person social dining experiences and cloud
                  restaurant operations software across licensed partner venues.
                </p>
                <p className="pt-2">
                  <strong className="text-foreground">
                    Corporate Inquiries:
                  </strong>
                  <br />
                  <a
                    className="font-semibold text-primary hover:underline"
                    href="mailto:support@chewbuu.com"
                  >
                    support@chewbuu.com
                  </a>
                </p>
              </div>
            </div>

            {/* Quick Policies Links */}
            <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground space-y-2.5">
              <p className="font-bold text-foreground">
                Policies & Compliance:
              </p>
              <ul className="space-y-1.5">
                <li>
                  <Link
                    className="hover:text-foreground hover:underline"
                    to="/terms"
                  >
                    → Terms and Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-foreground hover:underline"
                    to="/acceptable-use"
                  >
                    → Acceptable Use Policy (AUP)
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-foreground hover:underline"
                    to="/refund-policy"
                  >
                    → Refund & Cancellation Policy
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-foreground hover:underline"
                    to="/law-enforcement"
                  >
                    → Protocols for Law Enforcement
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-foreground hover:underline"
                    to="/pricing"
                  >
                    → Full Pricing & Fee Breakdown
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/contact")({
  component: ContactRoute,
});
