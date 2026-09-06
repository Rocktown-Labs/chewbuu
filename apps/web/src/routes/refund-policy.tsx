import { Badge } from "@chewbuu/ui/components/badge";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  CreditCard,
  FileCheck2,
  Mail,
  RefreshCw,
  Store,
} from "lucide-react";

const refundHighlights = [
  {
    icon: RefreshCw,
    title: "Self-Serve Cancellation",
    description:
      "Consumer members can cancel renewal from Account Settings; venue managers can cancel Sync from the Sync workspace. Support is available if a self-serve control is unavailable.",
  },
  {
    icon: Clock,
    title: "72-Hour Renewal Grace Period",
    description:
      "If your recurring subscription renews accidentally, contact support within 72 hours. Eligibility is reviewed based on the transaction and use of premium features.",
  },
  {
    icon: CreditCard,
    title: "Statement Descriptors",
    description:
      "Charges are processed in USD through Stripe. The statement descriptor shown depends on the merchant account and transaction.",
  },
  {
    icon: Store,
    title: "100% Tip & Tax Pass-Through",
    description:
      "For in-app restaurant dining, 100% of staff tips and municipal taxes are passed directly to venues and workers without platform deductions.",
  },
];

const policySections = [
  {
    title: "1. Consumer Subscriptions (Mingle, Host)",
    body: [
      "Chewbuu consumer memberships ('Mingle' at $19/month, 'Host' at $39/month, or discounted annual options) are billed in advance on a recurring monthly or annual basis.",
      "Automatic Renewal: Your subscription automatically renews at the start of each billing period unless canceled prior to the renewal date.",
      "How to Cancel: Cancel consumer auto-renewal from Account Settings, or contact support@chewbuu.com if the control is unavailable.",
      "Effect of Cancellation: Upon cancellation, auto-renewal is immediately halted. Your premium features remain fully active until the end of your prepaid billing period, with no subsequent charges.",
      "72-Hour Renewal Review: If an automatic renewal occurs and you did not intend to renew, contact support@chewbuu.com within 72 hours of the transaction date. We review the request based on whether the renewed period was used and, when approved, refund the original payment method.",
    ],
  },
  {
    title: "2. Venue Operations SaaS (Chewbuu Sync)",
    body: [
      "Chewbuu Sync subscriptions ('Sync 50' at $69/mo, 'Sync 100' at $139/mo, and 'Sync Enterprise' at $249/mo) provide restaurant operational software for floor plans, KDS orders, table reservations, and staff shifts.",
      "Free Onboarding: Initial venue onboarding, menu configuration, and staff profile setup are free to explore. Paid subscription billing activates only when your venue enables live dining operations.",
      "Cancellation: Authorized venue operators can cancel Sync renewal from the Sync workspace. Cancellation becomes effective at the end of the current billing cycle.",
      "Proration and Upgrades: Plan tier upgrades take effect immediately with prorated billing adjustments applied to your next statement.",
    ],
  },
  {
    title: "3. In-App Dining Transactions, Table Bookings, and Pre-Orders",
    body: [
      "Chewbuu operates as a technology marketplace facilitating food, beverage, and reservation transactions between diners and independent restaurant partners via Stripe Connect.",
      "Platform Fee: Chewbuu retains a 5% technology fee on food and beverage item subtotals. We do not assess platform fees on staff tips or local government taxes.",
      "Food Quality and Order Disputes: Because meals are prepared and served by independent restaurant partners, disputes regarding food preparation, incorrect items, or dining room service are handled directly by the venue or mediated by Chewbuu Support in accordance with the restaurant's policies.",
      "Table Reservation Deposits: If a partner venue requires a reservation deposit or charges a no-show fee, the venue's cancellation terms apply and are shown when available. Contact the venue or support about an eligible refund.",
    ],
  },
  {
    title: "4. Chewbuu Spotlight Promotional Boosts",
    body: [
      "Chewbuu Spotlight packages ('Spotlight Venue' at $49/week, 'Spotlight Event' at $29/event, and 'Special Boost' at $19/3-days) are digital promotional advertising services.",
      "Spotlight campaigns begin distribution immediately upon activation. Because advertising placement is delivered in real time across discovery feeds, Spotlight fees are non-refundable once the campaign has commenced, except in the event of documented technical service outages.",
    ],
  },
  {
    title: "5. Chargebacks, Inquiries, and Fair Resolution",
    body: [
      "If you notice an unexpected charge or have an issue with your billing, we strongly encourage you to contact support@chewbuu.com before initiating a dispute or chargeback with your card issuer.",
      "Chargeback timing is controlled by the card issuer and payment network. Support can investigate billing issues and process an approved refund through the original payment method.",
      "Abusive or fraudulent payment activity may result in account restrictions and may be reported to the payment processor.",
    ],
  },
  {
    title: "6. Refund Processing Times and Method",
    body: [
      "All approved refunds are credited back to the original payment method used during purchase (credit card, debit card, or Apple Pay / Google Pay via Stripe).",
      "Approved refunds are submitted through the original payment method. The time for credited funds to appear is controlled by Stripe, your financial institution, or your card issuer.",
      "Chewbuu does not issue cash or paper check refunds for card-based transactions.",
    ],
  },
];

function RefundPolicyRoute() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-12 md:px-8 lg:px-12">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit" variant="secondary">
            <FileCheck2 aria-hidden="true" className="size-3.5" />
            Billing & Refunds
          </Badge>
          <div className="space-y-3">
            <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
              Last updated September 6, 2026
            </p>
            <h1 className="text-balance font-extrabold text-4xl md:text-5xl">
              Refund & Cancellation Policy
            </h1>
            <p className="max-w-3xl text-muted-foreground text-sm/relaxed md:text-base/relaxed">
              We believe billing should be simple, transparent, and fair. Learn
              how subscription auto-renewal, self-serve cancellation, grace
              period refunds, and dining payments work on Chewbuu.
            </p>
          </div>
        </div>

        {/* Highlight Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {refundHighlights.map(({ icon: Icon, title, description }) => (
            <div
              className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
              key={title}
            >
              <span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 font-bold text-base">{title}</h2>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
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
            to="/pricing"
          >
            Pricing & Plans
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
            Billing Support
          </Link>
        </div>

        <div className="grid gap-5">
          {policySections.map((section) => (
            <article
              className="rounded-2xl border border-border bg-card p-6"
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

        {/* Help Contact Banner */}
        <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
          <div className="flex items-start gap-3.5">
            <Mail className="mt-1 size-5 shrink-0 text-primary" />
            <div className="space-y-2">
              <h2 className="font-extrabold text-xl">
                Need Help With a Refund or Cancellation?
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Our support team is here to assist. Email us at{" "}
                <a
                  className="font-bold text-foreground hover:underline"
                  href="mailto:support@chewbuu.com"
                >
                  support@chewbuu.com
                </a>{" "}
                with your account email and transaction details. We review and
                review billing inquiries as soon as practicable; response timing
                varies by request and payment processor.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/refund-policy")({
  component: RefundPolicyRoute,
});
