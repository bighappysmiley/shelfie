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

/** Minimal pine: tall outline, tiered branches, trunk, center spine (book). */
export function LogoMark({
  size = 32,
  className = "",
  ...props
}: { size?: number; className?: string } & ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      {/* Pine silhouette */}
      <path
        d="M28 4 46 30 38 30 48 46 8 46 18 30 10 30Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      {/* Trunk */}
      <path
        d="M28 46V58M24.5 58H31.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center spine */}
      <path
        d="M28 44V14"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      {/* Branch tiers */}
      <path
        d="M24 20 28 13 32 20M21 26 28 18 35 26M18 32 28 22 38 32M15 38 28 27 41 38M12 44 28 33 44 44"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
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
