import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { APP_TAGLINE } from "@/lib/brand";
import { LandingLogoAnimation } from "@/components/LandingLogoAnimation";
import { Logo } from "@/components/Logo";
import { FullPageLoading } from "@/components/LoadingTree";
import { Button, ButtonLink } from "@/components/Button";
import { TextField, FormError } from "@/components/form";
import { Container, Group, SegmentedControl } from "@/components/layout";
import { storePendingInvite } from "@/lib/pending-invite";

function useInviteParams() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const inviteId = searchParams.get("invite");

  useEffect(() => {
    if (inviteId) storePendingInvite(inviteId);
  }, [inviteId]);

  return { email, inviteId };
}

export function LandingPage() {
  const { user, loading, pending2fa } = useAuth();
  useInviteParams();
  if (loading) return <FullPageLoading />;
  if (user && !pending2fa) return <Navigate to="/setup" replace />;
  if (user && pending2fa) return <Navigate to="/verify-2fa" replace />;

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(61,82,72,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(122,92,68,0.1),transparent_50%)]"
        aria-hidden
      />
      <Container size="desktop">
        <div className="relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:py-24">
          <div>
            <div className="w-full max-w-md rounded-[1.25rem] bg-logo-bg px-10 py-12 sm:px-12 sm:py-14 lg:max-w-none">
              <LandingLogoAnimation />
            </div>
            <p className="mt-8 max-w-lg text-left text-[1.0625rem] leading-relaxed text-muted sm:text-[1.125rem] lg:text-[1.1875rem]">
              {APP_TAGLINE}
            </p>
            <div className="mt-9 flex w-full max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row">
              <ButtonLink to="/signup" className="w-full sm:w-auto">
                Create Account
              </ButtonLink>
              <ButtonLink to="/login" variant="tinted" className="w-full sm:w-auto">
                Sign In
              </ButtonLink>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-[1.5rem] bg-surface/80 p-8 ring-1 ring-black/[0.04] backdrop-blur-sm dark:ring-white/[0.06]">
              <p className="text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-muted">
                Built for home libraries
              </p>
              <ul className="mt-5 space-y-4 text-[1.0625rem] leading-snug text-foreground">
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  Catalog every volume by room and shelf
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  Track loans and due dates without spreadsheets
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  Invite family to share one library together
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Container size="form">
      <div className="py-10 sm:py-14">
        <Link to="/" className="inline-block rounded-[var(--radius-control)] bg-logo-bg px-4 py-3 outline-offset-2">
          <Logo size="md" variant="brand" />
        </Link>
        <h1 className="mt-8 text-[2.125rem] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-[1.0625rem] text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </Container>
  );
}

type AuthMode = "email" | "phone";

function useAuthRedirect() {
  const { user, loading, pending2fa } = useAuth();
  if (!loading && user && pending2fa) return <Navigate to="/verify-2fa" replace />;
  if (!loading && user) return <Navigate to="/setup" replace />;
  return null;
}

export function LoginPage() {
  const redirect = useAuthRedirect();
  const { email: inviteEmail } = useInviteParams();
  const { signIn, signInWithPhone, verifyPhoneOtp, resendSignupConfirmation } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  if (redirect) return redirect;

  const onEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setNeedsConfirm(false);
    setBusy(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.needsSecondFactor) {
        navigate("/verify-2fa", { replace: true });
      } else {
        navigate("/setup", { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed. Check your credentials.";
      const lower = message.toLowerCase();
      if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
        setNeedsConfirm(true);
        setError("Confirm your email before signing in. Check your inbox for the link, or resend it below.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onResendConfirm = async () => {
    setError("");
    setInfo("");
    setResendBusy(true);
    try {
      await resendSignupConfirmation(email.trim());
      setInfo("Confirmation email resent. Open the link, then sign in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend confirmation email.");
    } finally {
      setResendBusy(false);
    }
  };

  const onPhoneSend = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithPhone(phone.trim());
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code.");
    } finally {
      setBusy(false);
    }
  };

  const onPhoneVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyPhoneOtp(phone.trim(), otp.trim());
      navigate("/setup", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign In" subtitle="Access your library catalog">
      <Group>
        <div className="px-4 py-3 hairline-b">
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: "email", label: "Email" },
              { value: "phone", label: "Phone" },
            ]}
          />
        </div>

        {mode === "email" ? (
          <form onSubmit={onEmailSubmit}>
            {info && (
              <p className="px-4 pt-3 text-[0.9375rem] text-success">{info}</p>
            )}
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              required
              grouped
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              grouped
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="px-4 py-4">
              {error && <FormError message={error} />}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing In…" : "Sign In"}
              </Button>
              {needsConfirm && (
                <button
                  type="button"
                  className="mt-3 w-full text-center text-[0.9375rem] text-link disabled:opacity-50"
                  disabled={resendBusy || !email.trim()}
                  onClick={() => void onResendConfirm()}
                >
                  {resendBusy ? "Resending…" : "Resend confirmation email"}
                </button>
              )}
            </div>
          </form>
        ) : !otpSent ? (
          <form onSubmit={onPhoneSend}>
            <TextField
              label="Phone Number"
              type="tel"
              autoComplete="tel"
              required
              grouped
              hint="Include country code, e.g. +1 555 0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="px-4 py-4">
              {error && <FormError message={error} />}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending Code…" : "Send Verification Code"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={onPhoneVerify}>
            <TextField
              label="Verification Code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              grouped
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <div className="px-4 py-4">
              {error && <FormError message={error} />}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Verifying…" : "Verify & Sign In"}
              </Button>
              <button
                type="button"
                className="mt-3 w-full text-center text-[0.9375rem] text-link"
                onClick={() => setOtpSent(false)}
              >
                Use a different number
              </button>
            </div>
          </form>
        )}
      </Group>
      <p className="mt-6 text-center text-[0.9375rem] text-muted">
        Do not have an account?{" "}
        <Link to="/signup" className="text-link">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export function SignupPage() {
  const redirect = useAuthRedirect();
  const { email: inviteEmail } = useInviteParams();
  const { signUp, signUpWithPhone, verifyPhoneOtp, resendSignupConfirmation } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  if (redirect) return redirect;

  const onEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      const result = await signUp(email.trim(), password);
      if (result.needsConfirmation) {
        setAwaitingConfirm(true);
        setInfo(
          "Check your email for a confirmation link. Open it on this device to finish creating your account.",
        );
      } else {
        navigate("/setup", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setError("");
    setInfo("");
    setResendBusy(true);
    try {
      await resendSignupConfirmation(email.trim());
      setInfo("Confirmation email resent. Check your inbox and spam folder.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend confirmation email.");
    } finally {
      setResendBusy(false);
    }
  };

  const onPhoneSend = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signUpWithPhone(phone.trim());
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code.");
    } finally {
      setBusy(false);
    }
  };

  const onPhoneVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyPhoneOtp(phone.trim(), otp.trim());
      navigate("/setup", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create Account" subtitle="Set up a private library catalog">
      <Group>
        <div className="px-4 py-3 hairline-b">
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: "email", label: "Email" },
              { value: "phone", label: "Phone" },
            ]}
          />
        </div>

        {mode === "email" ? (
          <form onSubmit={onEmailSubmit}>
            {info && (
              <p className="px-4 pt-3 text-[0.9375rem] text-success">{info}</p>
            )}
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              required
              grouped
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              grouped
              hint="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="px-4 py-4">
              {error && <FormError message={error} />}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating Account…" : awaitingConfirm ? "Create Account Again" : "Create Account"}
              </Button>
              {awaitingConfirm && (
                <button
                  type="button"
                  className="mt-3 w-full text-center text-[0.9375rem] text-link disabled:opacity-50"
                  disabled={resendBusy || !email.trim()}
                  onClick={() => void onResend()}
                >
                  {resendBusy ? "Resending…" : "Resend confirmation email"}
                </button>
              )}
            </div>
          </form>
        ) : !otpSent ? (
          <form onSubmit={onPhoneSend}>
            <TextField
              label="Phone Number"
              type="tel"
              autoComplete="tel"
              required
              grouped
              hint="We'll text you a code to verify your number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="px-4 py-4">
              {error && <FormError message={error} />}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending Code…" : "Send Verification Code"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={onPhoneVerify}>
            <TextField
              label="Verification Code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              grouped
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <div className="px-4 py-4">
              {error && <FormError message={error} />}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Verifying…" : "Verify & Create Account"}
              </Button>
            </div>
          </form>
        )}
      </Group>
      <p className="mt-6 text-center text-[0.9375rem] text-muted">
        Already registered?{" "}
        <Link to="/login" className="text-link">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export function Verify2FAPage() {
  const { user, loading, pending2fa, verifySecondFactor, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && !user) return <Navigate to="/login" replace />;
  if (!loading && user && !pending2fa) return <Navigate to="/setup" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifySecondFactor(code.trim());
      navigate("/setup", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Verify Identity"
      subtitle="Enter the code sent to your phone or email to finish signing in"
    >
      <Group>
        <form onSubmit={onSubmit}>
          <TextField
            label="Verification Code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            grouped
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="px-4 py-4">
            {error && <FormError message={error} />}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Verifying…" : "Continue"}
            </Button>
            <button
              type="button"
              className="mt-3 w-full text-center text-[0.9375rem] text-muted"
              onClick={() => signOut().then(() => navigate("/login"))}
            >
              Sign out
            </button>
          </div>
        </form>
      </Group>
    </AuthShell>
  );
}
