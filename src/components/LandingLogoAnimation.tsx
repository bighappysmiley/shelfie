import { useEffect, useState } from "react";
import { APP_WORDMARK_PRIMARY, APP_WORDMARK_SECONDARY } from "@/lib/brand";
import { Logo, LogoMark, logoTextClasses } from "./Logo";

const LINE1 = APP_WORDMARK_PRIMARY;
const LINE2 = APP_WORDMARK_SECONDARY;
const TYPE_MS = 72;
const CURSOR_FALL_MS = 520;
const ICON_REVEAL_MS = 320;

type Phase = "fall" | "type1" | "type2" | "icon" | "done";

const textClass = `${logoTextClasses.lg} text-logo-text-on-brand`;

function BlinkCursor() {
  return (
    <span
      className="logo-cursor-blink ml-px inline-block h-[1.05em] w-0.5 align-[-0.08em] bg-logo-text-on-brand"
      aria-hidden
    />
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function LandingLogoAnimation() {
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("fall");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [showIcon, setShowIcon] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;

    if (phase === "fall") {
      const t = window.setTimeout(() => setPhase("type1"), CURSOR_FALL_MS);
      return () => window.clearTimeout(t);
    }

    if (phase === "type1") {
      if (line1.length < LINE1.length) {
        const t = window.setTimeout(
          () => setLine1(LINE1.slice(0, line1.length + 1)),
          TYPE_MS,
        );
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(() => setPhase("type2"), TYPE_MS * 1.4);
      return () => window.clearTimeout(t);
    }

    if (phase === "type2") {
      if (line2.length < LINE2.length) {
        const t = window.setTimeout(
          () => setLine2(LINE2.slice(0, line2.length + 1)),
          TYPE_MS,
        );
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(() => setPhase("icon"), TYPE_MS);
      return () => window.clearTimeout(t);
    }

    if (phase === "icon") {
      setShowIcon(true);
      const t = window.setTimeout(() => setPhase("done"), ICON_REVEAL_MS);
      return () => window.clearTimeout(t);
    }
  }, [phase, line1, line2, reducedMotion]);

  if (reducedMotion) {
    return <Logo size="lg" variant="brand" />;
  }

  return (
    <div className="inline-flex items-center gap-1 sm:gap-1.5">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-[3.5rem] sm:w-[3.5rem]">
        {showIcon && (
          <LogoMark
            size={56}
            canopyClassName="text-logo-mark-on-brand"
            className="logo-icon-reveal"
          />
        )}
      </div>

      <div className="relative flex min-h-[4.25rem] min-w-0 flex-col items-start justify-center text-left sm:min-h-[4.5rem]">
        {phase === "fall" && (
          <span
            className="logo-cursor-fall pointer-events-none absolute left-0 top-[0.35em] h-[1.05em] w-0.5 bg-logo-text-on-brand"
            aria-hidden
          />
        )}

        <span className={`block w-full text-left ${textClass}`}>
          {line1}
          {phase === "type1" && <BlinkCursor />}
        </span>
        <span className={`block w-full text-left ${textClass}`}>
          {line2}
          {phase === "type2" && <BlinkCursor />}
        </span>
      </div>
    </div>
  );
}
