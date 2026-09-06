import { Link } from "@tanstack/react-router";
import { Mail, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/60 text-foreground transition-colors">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Col */}
          <div className="space-y-4">
            <Link
              className="flex items-center gap-2.5 font-bold text-lg"
              to="/"
            >
              <img
                alt="Chewbuu Logo"
                className="size-8 rounded-full border border-border"
                src="/brand/chewbuu-logo-500.png"
              />
              <span>Chewbuu</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Real dining, real dates, and real local venues. Bringing people
              together around the table with integrated venue operations.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" />
              <span>Strictly 18+ Community</span>
            </div>
          </div>

          {/* Experiences & Pricing */}
          <div className="space-y-3">
            <p className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
              Experiences & Pricing
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link className="transition hover:text-foreground" to="/spots">
                  Explore Spots
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-foreground"
                  to="/specials"
                >
                  Daily Specials
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-foreground"
                  to="/pricing"
                >
                  Plans & Pricing
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-foreground"
                  to="/sync-platform"
                >
                  Chewbuu Sync (For Venues)
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-foreground"
                  to="/venue-portal"
                >
                  Venue Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance (Stripe Requirements) */}
          <div className="space-y-3">
            <p className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
              Compliance & Safety
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link className="transition hover:text-foreground" to="/terms">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-foreground"
                  to="/acceptable-use"
                >
                  Acceptable Use Policy (AUP)
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-foreground"
                  to="/refund-policy"
                >
                  Refund & Cancellation Policy
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-foreground"
                  to="/law-enforcement"
                >
                  Law Enforcement Protocols
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-foreground"
                  to="/privacy"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Company */}
          <div className="space-y-3">
            <p className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
              Contact & Support
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  className="transition hover:text-foreground"
                  to="/contact"
                >
                  Contact Support
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0 text-primary" />
                <a
                  className="transition hover:text-foreground"
                  href="mailto:support@chewbuu.com"
                >
                  support@chewbuu.com
                </a>
              </li>
              <li className="pt-2 text-xs text-muted-foreground leading-relaxed">
                Rocktown Labs LLC
                <br />
                Operating across verified local hospitality partners
              </li>
              <li className="text-xs text-muted-foreground">
                Support response timing varies by request
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Chewbuu by Rocktown Labs LLC. All
            rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link className="hover:underline" to="/terms">
              Terms
            </Link>
            <Link className="hover:underline" to="/acceptable-use">
              AUP
            </Link>
            <Link className="hover:underline" to="/refund-policy">
              Refunds
            </Link>
            <Link className="hover:underline" to="/law-enforcement">
              Law Enforcement
            </Link>
            <Link className="hover:underline" to="/privacy">
              Privacy
            </Link>
            <Link className="hover:underline" to="/contact">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
