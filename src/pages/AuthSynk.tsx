import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { FullPageLoading } from "@/components/LoadingTree";
import { ButtonLink } from "@/components/Button";
import { Container } from "@/components/layout";
import { readSynkPassFromUrl } from "@/lib/synk";

/**
 * Completes Synk ID sign-in or linking when a pass is present in the URL
 * (legacy deep-link / external return). Primary flow is in-app via SynkVerifyModal.
 */
export function AuthSynkPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [label, setLabel] = useState("Signing in with Synk ID");

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        const { pass, assertion, mode } = readSynkPassFromUrl();
        if (!pass && !assertion) {
          throw new Error("Missing Synk pass. Start again from sign in.");
        }

        // Drop secrets from the address bar ASAP.
        window.history.replaceState(
          {},
          document.title,
          mode === "link" ? "/auth/synk?mode=link" : "/auth/synk",
        );

        if (mode === "link") {
          setLabel("Linking Synk ID");
          await api.synk.link(pass, assertion);
          if (cancelled) return;
          navigate("/account", { replace: true, state: { synkLinked: true } });
          return;
        }

        setLabel("Signing in with Synk ID");
        const res = await fetch("/api/synk-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "signin",
            synk_pass: pass,
            synk_assertion: assertion,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          token_hash?: string;
        };
        if (!res.ok || !data.token_hash) {
          throw new Error(data.error || "Synk sign-in failed");
        }

        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: "email",
        });
        if (otpError) throw otpError;

        if (cancelled) return;
        navigate("/setup", { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Synk sign-in failed.");
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
          <h1 className="text-[1.75rem] font-bold tracking-tight">Synk ID failed</h1>
          <p className="mt-3 text-[1.0625rem] text-muted">{error}</p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <ButtonLink to="/login">Back to sign in</ButtonLink>
            <Link to="/account" className="text-[0.9375rem] text-link">
              Account settings
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return <FullPageLoading label={label} />;
}
