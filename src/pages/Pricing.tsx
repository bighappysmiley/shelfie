import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/Button";
import { FormError, TextField, TextArea } from "@/components/form";
import { TIER_LIMITS, TIER_ORDER, type SubscriptionTier } from "@/lib/tiers";
import { submitEnterpriseLead } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export function PricingPage() {
  const { user, userProfile } = useAuth();
  const [busyTier, setBusyTier] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState("");
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [enterpriseSent, setEnterpriseSent] = useState(false);
  const [lead, setLead] = useState({
    name: userProfile?.displayName ?? "",
    email: user?.email ?? "",
    company: "",
    teamSize: "",
    message: "",
  });

  const startCheckout = async (tier: SubscriptionTier) => {
    if (tier === "free") return;
    if (tier === "enterprise") {
      setEnterpriseOpen(true);
      return;
    }
    setBusyTier(tier);
    setError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Sign in to upgrade");
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Checkout unavailable");
      if (body.url) {
        window.location.href = body.url as string;
        return;
      }
      throw new Error(body.message || "Stripe is not configured yet. Contact support for Pro.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusyTier(null);
    }
  };

  const submitLead = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await submitEnterpriseLead(lead);
      setEnterpriseSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    }
  };

  return (
    <div>
      <PageHeader
        title="Plans"
        subtitle="Unlock more books, shelf scans, and team seats"
      />
      {error && (
        <div className="mb-4 px-1">
          <FormError message={error} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TIER_ORDER.map((tier) => {
          const limits = TIER_LIMITS[tier];
          return (
            <div
              key={tier}
              className="flex flex-col rounded-[var(--radius-group)] border border-[var(--border)] bg-surface p-5 shadow-sm"
            >
              <h2 className="text-xl font-semibold">{limits.label}</h2>
              <p className="mt-1 text-[0.875rem] text-muted">{limits.description}</p>
              <p className="mt-4 text-2xl font-bold">
                {limits.priceMonthlyUsd == null
                  ? "Custom"
                  : limits.priceMonthlyUsd === 0
                    ? "Free"
                    : `$${limits.priceMonthlyUsd}`}
                {limits.priceMonthlyUsd != null && limits.priceMonthlyUsd > 0 && (
                  <span className="text-base font-normal text-muted">/mo</span>
                )}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-[0.875rem]">
                <li>{limits.maxBooks.toLocaleString()} books</li>
                <li>{limits.maxShelfScansPerMonth} shelf scans / month</li>
                <li>Up to {limits.maxLibraries} libraries</li>
                <li>{limits.maxMembersPerLibrary} members per library</li>
              </ul>
              <Button
                className="mt-5 w-full"
                variant={tier === "free" ? "secondary" : "primary"}
                disabled={tier === "free" || busyTier === tier}
                onClick={() => void startCheckout(tier)}
              >
                {tier === "free"
                  ? "Current free plan"
                  : tier === "enterprise"
                    ? "Contact sales"
                    : busyTier === tier
                      ? "Starting…"
                      : `Get ${limits.label}`}
              </Button>
            </div>
          );
        })}
      </div>

      {enterpriseOpen && (
        <div className="mt-8 max-w-lg rounded-[var(--radius-group)] border border-[var(--border)] bg-surface p-5">
          <h3 className="text-lg font-semibold">Enterprise inquiry</h3>
          {enterpriseSent ? (
            <p className="mt-3 text-[0.9375rem] text-muted">
              Thanks — we received your request and will follow up by email or in-app
              notification.
            </p>
          ) : (
            <form onSubmit={submitLead} className="mt-4 space-y-3">
              <TextField
                label="Name"
                value={lead.name}
                onChange={(e) => setLead((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <TextField
                label="Work email"
                type="email"
                value={lead.email}
                onChange={(e) => setLead((p) => ({ ...p, email: e.target.value }))}
                required
              />
              <TextField
                label="Company"
                value={lead.company}
                onChange={(e) => setLead((p) => ({ ...p, company: e.target.value }))}
              />
              <TextField
                label="Team size"
                value={lead.teamSize}
                onChange={(e) => setLead((p) => ({ ...p, teamSize: e.target.value }))}
                placeholder="e.g. 25"
              />
              <TextArea
                label="What do you need?"
                value={lead.message}
                onChange={(e) => setLead((p) => ({ ...p, message: e.target.value }))}
                rows={4}
                required
              />
              <Button type="submit">Send to Shelfie</Button>
            </form>
          )}
        </div>
      )}

      <p className="mt-6 px-1 text-[0.8125rem] text-muted">
        Already subscribed? Manage billing from{" "}
        <Link to="/account" className="text-link">
          Account
        </Link>
        , or contact{" "}
        <Link to="/support" className="text-link">
          Support
        </Link>
        .
      </p>
    </div>
  );
}
