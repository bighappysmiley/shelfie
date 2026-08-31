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
  canopyClassName = "text-logo-mark",
  growing = false,
  ...props
}: {
  size?: number;
  className?: string;
  canopyClassName?: string;
  growing?: boolean;
} & ComponentPropsWithoutRef<"svg">) {
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
      <g className={growing ? "loading-tree-canopy" : undefined}>
        <path
          fill="currentColor"
          className={canopyClassName}
          d="M24 8 40 34a2 2 0 0 1-1.8 2H9.8A2 2 0 0 1 8 34L24 8Z"
        />
      </g>
      <g className={growing ? "loading-tree-trunk" : undefined}>
        <path
          fill="currentColor"
          className="text-logo-trunk"
          d="M21.25 36.5h5.5v6.25a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5V36.5Z"
        />
      </g>
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
        canopyClassName={onBrand ? "text-logo-mark-on-brand" : "text-logo-mark"}
        className="shrink-0"
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
