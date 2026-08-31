import type { ComponentPropsWithoutRef } from "react";
import { APP_WORDMARK_PRIMARY, APP_WORDMARK_SECONDARY } from "@/lib/brand";

const presets = {
  sm: {
    mark: 30,
    gap: "gap-3",
    text: "text-[0.9375rem] font-medium leading-[1.08] tracking-[-0.01em]",
  },
  md: {
    mark: 38,
    gap: "gap-3.5",
    text: "text-[1.0625rem] font-medium leading-[1.08] tracking-[-0.01em]",
  },
  lg: {
    mark: 56,
    gap: "gap-5",
    text: "text-[1.75rem] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[2rem]",
  },
} as const;

/** Line-art diamond: pine bough / book spine (matches brand reference). */
export function LogoMark({
  size = 32,
  className = "",
  ...props
}: { size?: number; className?: string } & ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      <path
        d="M32 7 55 32 32 57 9 32Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M32 50V17"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M27 29 32 21 37 29M23 35 32 25 41 35M19 41 32 30 45 41M15 47 32 36 49 47"
        stroke="currentColor"
        strokeWidth="1.75"
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
    <div className={`inline-flex items-center ${preset.gap} ${className}`}>
      <LogoMark
        size={preset.mark}
        className={`shrink-0 ${onBrand ? "text-logo-mark-on-brand" : "text-logo-mark"}`}
      />
      {showText && (
        <div className={`flex flex-col gap-0 ${onBrand ? "text-logo-text-on-brand" : "text-foreground"}`}>
          <span className={preset.text}>{APP_WORDMARK_PRIMARY}</span>
          <span className={preset.text}>{APP_WORDMARK_SECONDARY}</span>
        </div>
      )}
    </div>
  );
}
