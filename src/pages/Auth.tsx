import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { APP_TAGLINE } from "@/lib/brand";
import { LandingLogoAnimation } from "@/components/LandingLogoAnimation";
import { Logo } from "@/components/Logo";
import { Button, ButtonLink } from "@/components/Button";
import { TextField, FormError } from "@/components/form";
import { Container, Group, SegmentedControl } from "@/components/layout";

export function LandingPage() {
  const { user, loading, pending2fa } = useAuth();
  if (loading) return null;
  if (user && !pending2fa) return <Navigate to="/library" replace />;
  if (user && pending2fa) return <Navigate to="/verify-2fa" replace />;

  return (
    <Container size="narrow">
      <div className="flex flex-col py-14 sm:py-20">
        <div className="w-full max-w-md rounded-[1.25rem] bg-logo-bg px-10 py-12 sm:px-12 sm:py-14">
          <LandingLogoAnimation />
        </div>
        <p className="mt-8 max-w-md text-left text-[1.0625rem] leading-relaxed text-muted sm:text-[1.125rem]">
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
    </Container>
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
  if (!loading && user) return <Navigate to="/library" replace />;
  return null;
}

export function LoginPage() {
  const redirect = useAuthRedirect();
  const { signIn, signInWithPhone, verifyPhoneOtp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (redirect) return redirect;

  const onEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.needsSecondFactor) {
        navigate("/verify-2fa", { replace: true });
      } else {
        navigate("/library", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check your credentials.");
    } finally {
      setBusy(false);
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
      navigate("/library", { replace: true });
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
  const { signUp, signUpWithPhone, verifyPhoneOtp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

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
        setInfo("A confirmation link has been sent to your email. Sign in after confirming.");
      } else {
        navigate("/library", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed. Please try again.");
    } finally {
      setBusy(false);
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
      navigate("/library", { replace: true });
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
                {busy ? "Creating Account…" : "Create Account"}
              </Button>
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
  if (!loading && user && !pending2fa) return <Navigate to="/library" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifySecondFactor(code.trim());
      navigate("/library", { replace: true });
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
