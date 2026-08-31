import type { ComponentPropsWithoutRef } from "react";
import { APP_WORDMARK_PRIMARY, APP_WORDMARK_SECONDARY } from "@/lib/brand";

/** Shared wordmark styles — Open Sauce Sans, tight two-line lockup. */
export const logoTextClasses = {
  sm: "font-logo text-[0.9375rem] font-normal leading-[1] tracking-[0.006em]",
  md: "font-logo text-[1.0625rem] font-normal leading-[1] tracking-[0.006em]",
  lg: "font-logo text-[1.6875rem] font-normal leading-[1] tracking-[0.008em] sm:text-[1.9375rem]",
} as const;

const presets = {
  sm: { mark: 30, gap: "gap-1", text: logoTextClasses.sm },
  md: { mark: 38, gap: "gap-1", text: logoTextClasses.md },
  lg: { mark: 56, gap: "gap-1.5", text: logoTextClasses.lg },
} as const;

/** Minimal pine — one canopy, one trunk. No chevrons or diamond frame. */
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
        fill="currentColor"
        d="M24 8 40 36a2 2 0 0 1-1.8 2H9.8A2 2 0 0 1 8 36L24 8Z"
      />
      <path
        fill="currentColor"
        d="M21.25 36h5.5v6.75a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5V36Z"
      />
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
