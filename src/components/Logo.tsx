import type { ComponentPropsWithoutRef } from "react";
import { APP_WORDMARK_PRIMARY, APP_WORDMARK_SECONDARY } from "@/lib/brand";

/** Shared wordmark styles — Open Sauce Sans, tight two-line lockup. */
export const logoTextClasses = {
  sm: "font-logo text-[0.9375rem] font-normal leading-[1] tracking-[0.006em]",
  md: "font-logo text-[1.0625rem] font-normal leading-[1] tracking-[0.006em]",
  lg: "font-logo text-[1.6875rem] font-normal leading-[1] tracking-[0.008em] sm:text-[1.9375rem]",
} as const;

const presets = {
  sm: { mark: 30, gap: "gap-1.5", text: logoTextClasses.sm },
  md: { mark: 38, gap: "gap-2", text: logoTextClasses.md },
  lg: { mark: 56, gap: "gap-2.5", text: logoTextClasses.lg },
} as const;

/** Open book with bookmark — catalog / bookkeeping, one clear symbol. */
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
      <path
        d="M24 8V18M24 18L20 22M24 18L28 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 16C16 16 12 20 12 28V38C12 40.2 16 41 24 39"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 16C32 16 36 20 36 28V38C36 40.2 32 41 24 39"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 16V39" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  size = "sm",
  showText = true,
  variant = "default",
  className = "",
}: {
  size?: keyof typeof presets;
  showText?: boolean;
  variant?: "default" | "brand";
  className?: string;
}) {
  const preset = presets[size];
  const onBrand = variant === "brand";

  return (
    <div className={`inline-flex items-center justify-start ${preset.gap} ${className}`}>
      <LogoMark
        size={preset.mark}
        className={`shrink-0 ${onBrand ? "text-logo-mark-on-brand" : "text-logo-mark"}`}
      />
      {showText && (
        <div
          className={`flex min-w-0 flex-col items-start gap-px text-left ${
            onBrand ? "text-logo-text-on-brand" : "text-foreground"
          }`}
        >
          <span className={`block w-full text-left ${preset.text}`}>{APP_WORDMARK_PRIMARY}</span>
          <span className={`block w-full text-left ${preset.text}`}>{APP_WORDMARK_SECONDARY}</span>
        </div>
      )}
    </div>
  );
}
