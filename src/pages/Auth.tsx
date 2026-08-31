import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button, ButtonLink } from "@/components/Button";
import { TextField, FormError } from "@/components/form";
import { Card, Container } from "@/components/layout";

export function LandingPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/library" replace />;

  return (
    <Container size="narrow">
      <div className="py-10 sm:py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-muted">Shelfie</p>
        <h1 className="mt-3 max-w-md text-2xl font-semibold tracking-tight sm:text-3xl">
          Your books, where they live, and who borrowed them.
        </h1>
        <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">
          Catalog your shelves, scan barcodes and covers, and keep track of loans — private to your
          account.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink to="/signup">Create account</ButtonLink>
          <ButtonLink to="/login" variant="secondary">
            Sign in
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
      <div className="py-10 sm:py-12">
        <Link to="/" className="text-base font-semibold tracking-tight">
          Shelfie
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-[0.95rem] text-muted">{subtitle}</p>
        <Card className="mt-6">{children}</Card>
      </div>
    </Container>
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
          <p className="rounded-md bg-success-bg px-3 py-2.5 text-sm font-medium text-success">
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
