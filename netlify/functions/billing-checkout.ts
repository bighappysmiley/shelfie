import type { Config } from "@netlify/functions";
import { json, error, parseBody } from "./utils";
import { withAuth } from "./lib/auth";
import { normalizeTier } from "./lib/tiers";

export const config: Config = {
  path: "/api/billing/checkout",
};

const PRICE_ENV: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  pro_plus: process.env.STRIPE_PRICE_PRO_PLUS,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};

export default withAuth(async (request, user) => {
  if (request.method !== "POST") return error("Method not allowed", 405);

  const body = await parseBody<{ tier: string }>(request);
  const tier = normalizeTier(body.tier);
  if (tier === "free") return error("Nothing to checkout", 400);
  if (tier === "enterprise") {
    return json({
      message: "Use the enterprise contact form on /pricing",
    });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = PRICE_ENV[tier];
  const appUrl = process.env.APP_URL || "https://shelfielibrary.netlify.app";

  if (!secret || !priceId) {
    return json(
      {
        error:
          "Stripe is not configured yet. Ask support to grant Pro, or set STRIPE_SECRET_KEY and price IDs.",
        message:
          "Stripe is not configured yet. Ask support to grant Pro, or set STRIPE_SECRET_KEY and price IDs.",
      },
      503,
    );
  }

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", `${appUrl}/account?billing=success`);
  params.set("cancel_url", `${appUrl}/pricing?billing=cancel`);
  params.set("client_reference_id", user.id);
  params.set("customer_email", user.email ?? "");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[tier]", tier);
  params.set("metadata[user_id]", user.id);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    return error(data.error?.message || "Could not start checkout", 502);
  }

  return json({ url: data.url, sessionId: data.id });
});
