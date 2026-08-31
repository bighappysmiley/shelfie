const APP_URL = process.env.APP_URL || "https://shelfielibrary.netlify.app";

export async function sendLibraryInviteEmail(params: {
  to: string;
  libraryName: string;
  inviterName: string;
  inviteId: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, error: "Email service not configured" };
  }

  const from =
    process.env.INVITE_FROM_EMAIL || "Pine Bookkeeping <onboarding@resend.dev>";
  const signupUrl = `${APP_URL}/signup?email=${encodeURIComponent(params.to)}&invite=${params.inviteId}`;
  const loginUrl = `${APP_URL}/login?email=${encodeURIComponent(params.to)}&invite=${params.inviteId}`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #1a2426; max-width: 520px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem; margin: 0 0 12px;">You're invited to a library</h1>
  <p style="margin: 0 0 16px;">
    <strong>${escapeHtml(params.inviterName)}</strong> invited you to collaborate on
    <strong>${escapeHtml(params.libraryName)}</strong> in Pine Bookkeeping.
  </p>
  <p style="margin: 0 0 20px; color: #5c6864;">
    Catalog books together, track loans, and organize by room or shelf.
  </p>
  <p style="margin: 0 0 12px;">
    <a href="${signupUrl}" style="display: inline-block; background: #3d5248; color: #f0f2e8; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
      Create account &amp; join
    </a>
  </p>
  <p style="margin: 0 0 20px; font-size: 0.9375rem; color: #5c6864;">
    Already have an account? <a href="${loginUrl}" style="color: #3d5248;">Sign in</a> — the invitation will appear in Notifications.
  </p>
  <p style="margin: 0; font-size: 0.8125rem; color: #9aa8a0;">
    If you didn't expect this email, you can ignore it.
  </p>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: `${params.inviterName} invited you to ${params.libraryName}`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend error:", res.status, body);
      return { sent: false, error: "Could not send invitation email" };
    }

    return { sent: true };
  } catch (err) {
    console.error("Email send failed:", err);
    return { sent: false, error: "Could not send invitation email" };
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
