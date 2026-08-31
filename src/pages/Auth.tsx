import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";
import { TextField, FormError } from "@/components/form";
import { Card } from "@/components/layout";

export function LandingPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/library" replace />;

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 0%, #e8e8ed 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 20%, #dfe3ea 0%, transparent 50%), linear-gradient(180deg, #f5f5f7 0%, #ebebef 100%)",
        }}
      />
      <div className="mx-auto flex max-w-3xl flex-col items-start px-6 pb-16 pt-16 sm:px-8 sm:pt-24">
        <p className="text-4xl font-semibold tracking-tight sm:text-5xl">Shelfie</p>
        <h1 className="mt-4 max-w-xl text-2xl font-semibold tracking-tight text-foreground/90 sm:text-3xl">
          Your books, where they live, and who borrowed them.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted">
          Catalog your shelves, scan barcodes and covers, and keep track of loans — private to your
          account.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-[0.95rem] font-medium text-white hover:bg-brand-hover"
          >
            Create account
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg border border-black/10 bg-surface px-5 py-2.5 text-[0.95rem] font-medium hover:bg-black/[0.04] dark:border-white/10"
          >
            Sign in
          </Link>
        </div>
      </div>
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
    <div className="mx-auto max-w-md px-6 py-12 sm:px-8">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        Shelfie
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{subtitle}</p>
      <Card className="mt-8">{children}</Card>
    </div>
  );
}

export function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/library" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate("/library", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Welcome back to your library">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <FormError message={error} />}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        New here?{" "}
        <Link to="/signup" className="font-medium text-foreground hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function SignupPage() {
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/library" replace />;

  const onSubmit = async (e: FormEvent) => {
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
        setInfo("Check your email for a confirmation link, then sign in.");
      } else {
        navigate("/library", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Start your private library">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <FormError message={error} />}
        {info && (
          <p className="rounded-lg bg-success-bg px-4 py-3 text-sm font-medium text-success">
            {info}
          </p>
        )}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
