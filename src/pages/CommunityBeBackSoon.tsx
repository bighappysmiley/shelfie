import { Link } from "react-router-dom";
import { Logo, LogoMark } from "@/components/Logo";

/**
 * Apple-inspired maintenance screen for Community.
 * Calm full-bleed composition: brand, one headline, one sentence, one exit.
 */
export function CommunityBeBackSoonPage() {
  return (
    <div className="community-be-back relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="community-be-back-glow pointer-events-none absolute inset-0" aria-hidden />

      <header className="safe-top relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          to="/home"
          className="rounded-[var(--radius-control)] outline-offset-4"
          aria-label="Pine home"
        >
          <Logo size="sm" />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center sm:px-10">
        <div className="community-be-back-enter flex max-w-[28rem] flex-col items-center">
          <LogoMark
            size={56}
            className="community-be-back-mark mb-8 text-[var(--logo-mark)]"
            growing
          />

          <p className="font-logo text-[0.8125rem] font-medium tracking-[0.08em] text-muted uppercase">
            Community
          </p>

          <h1 className="mt-3 font-logo text-[2.25rem] leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[2.75rem]">
            We’ll be back soon.
          </h1>

          <p className="mt-4 max-w-[22rem] text-[1.0625rem] leading-relaxed text-muted sm:text-[1.125rem]">
            Community is temporarily unavailable while we make a few improvements.
            Please check back shortly.
          </p>

          <Link
            to="/home"
            className="mt-10 inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-pill)] bg-foreground px-6 text-[1.0625rem] font-medium text-background transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
