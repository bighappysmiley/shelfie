import type { ComponentPropsWithoutRef } from "react";
import { APP_WORDMARK_PRIMARY, APP_WORDMARK_SECONDARY } from "@/lib/brand";

const presets = {
  sm: {
    mark: 28,
    gap: "gap-2",
    primary: "text-[0.9375rem] font-semibold leading-[1.05] tracking-tight",
    secondary: "text-[0.625rem] font-medium leading-[1.05] tracking-[0.02em] text-muted",
  },
  md: {
    mark: 36,
    gap: "gap-2.5",
    primary: "text-[1.125rem] font-semibold leading-[1.05] tracking-tight",
    secondary: "text-[0.75rem] font-medium leading-[1.05] tracking-[0.02em] text-muted",
  },
  lg: {
    mark: 52,
    gap: "gap-3.5",
    primary: "text-[2rem] font-semibold leading-[1.05] tracking-tight sm:text-[2.25rem]",
    secondary:
      "text-[0.9375rem] font-medium leading-[1.05] tracking-[0.04em] text-muted sm:text-[1rem]",
  },
} as const;

export function LogoMark({
  size = 32,
  className = "",
  ...props
}: { size?: number; className?: string } & ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      <path d="M24 5L30.5 15.5H17.5L24 5Z" fill="currentColor" />
      <path d="M24 12.5L33.5 26.5H14.5L24 12.5Z" fill="currentColor" opacity="0.92" />
      <path d="M24 21L36.5 39.5H11.5L24 21Z" fill="currentColor" opacity="0.84" />
      <rect x="21.5" y="36.5" width="5" height="7.5" rx="1" fill="currentColor" />
      <rect
        x="13.5"
        y="27.5"
        width="21"
        height="14"
        rx="1.75"
        fill="var(--surface)"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M24 28.25V40.75" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path
        d="M16.25 32H20.75M27.25 32H31.75M16.25 35.25H20M27.75 35.25H31.25"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

export function Logo({
  size = "sm",
  showText = true,
  className = "",
}: {
  size?: keyof typeof presets;
  showText?: boolean;
  className?: string;
}) {
  const preset = presets[size];

  return (
    <div className={`inline-flex items-center ${preset.gap} ${className}`}>
      <LogoMark size={preset.mark} className="shrink-0 text-accent" />
      {showText && (
        <div className="flex min-w-0 flex-col">
          <span className={`text-foreground ${preset.primary}`}>{APP_WORDMARK_PRIMARY}</span>
          <span className={preset.secondary}>{APP_WORDMARK_SECONDARY}</span>
        </div>
      )}
    </div>
  );
}
