import { LogoMark } from "./Logo";

export function LoadingTree({
  label = "Loading",
  size = 64,
  className = "",
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <LogoMark size={size} growing aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingTree label={label} size={72} />
    </div>
  );
}

export function FullPageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <LoadingTree label={label} size={72} />
    </div>
  );
}
