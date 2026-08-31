import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button, ButtonLink } from "@/components/Button";
import { TextField, FormError } from "@/components/form";
import { Container, Group } from "@/components/layout";

export function LandingPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/library" replace />;

  return (
    <Container size="narrow">
      <div className="py-16 sm:py-24">
        <h1 className="text-[2.125rem] font-bold tracking-tight sm:text-[2.75rem]">
          Shelfie
        </h1>
        <p className="mt-4 max-w-md text-[1.25rem] leading-snug text-muted">
          Catalog your books, track loans, and manage locations in one private library.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
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
        <Link to="/" className="text-[1.0625rem] font-semibold text-link">
          Shelfie
        </Link>
        <h1 className="mt-8 text-[2.125rem] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-[1.0625rem] text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
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
      setError(err instanceof Error ? err.message : "Sign in failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign In" subtitle="Access your library catalog">
      <Group>
        <form onSubmit={onSubmit}>
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

  return (
    <AuthShell title="Create Account" subtitle="Set up a private library catalog">
      <Group>
        <form onSubmit={onSubmit}>
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
