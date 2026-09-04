import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { FullPageLoading } from "@/components/LoadingTree";
import { ButtonLink } from "@/components/Button";
import { Container } from "@/components/layout";

/**
 * Handles Supabase email confirmation / magic-link redirects.
 * Supports both PKCE (?code=) and legacy hash tokens (#access_token=).
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const errorDescription =
          url.searchParams.get("error_description") ||
          hash.get("error_description") ||
          url.searchParams.get("error") ||
          hash.get("error");

        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          // Hash tokens are picked up by detectSessionInUrl; wait briefly for session.
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!data.session) {
            // Give the client a moment to parse the hash on first paint.
            await new Promise((r) => setTimeout(r, 250));
            const again = await supabase.auth.getSession();
            if (again.error) throw again.error;
            if (!again.data.session) {
              throw new Error("Could not complete email verification. Try signing in again.");
            }
          }
        }

        if (cancelled) return;
        // Clean sensitive tokens from the address bar, then continue onboarding.
        window.history.replaceState({}, document.title, "/auth/callback");
        navigate("/setup", { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Email verification failed.");
      }
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <Container size="form">
        <div className="py-16 text-center">
          <h1 className="text-[1.75rem] font-bold tracking-tight">Verification failed</h1>
          <p className="mt-3 text-[1.0625rem] text-muted">{error}</p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <ButtonLink to="/login">Back to sign in</ButtonLink>
            <Link to="/signup" className="text-[0.9375rem] text-link">
              Create an account
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return <FullPageLoading label="Verifying email" />;
}
