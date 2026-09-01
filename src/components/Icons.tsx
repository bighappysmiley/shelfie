import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconCommunity(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M14.5 19c0-2 1.2-3.5 3.2-4" />
    </Icon>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </Icon>
  );
}

export function IconLibrary(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4h5v16H4z" />
      <path d="M10.5 4h5v16h-5z" />
      <path d="M17 6.5 20 5v14l-3-1.5z" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconLoan(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 3h5v5" />
      <path d="M21 3 12 12" />
      <path d="M13 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7" />
    </Icon>
  );
}

export function IconPeople(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19c0-2.2-1.5-3.8-3.5-4.5" />
    </Icon>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h4a8 8 0 0 1 4 8z" />
    </Icon>
  );
}

export function IconShelf(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
      <path d="M6 6v12M12 6v12M18 6v12" />
    </Icon>
  );
}

export function IconStats(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19V8" />
    </Icon>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </Icon>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

export function IconList(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  );
}

export function IconCompass(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-1.8 4.7-4.7 1.8 1.8-4.7 4.7-1.8z" />
    </Icon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />
    </Icon>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c0-3.5 3-6 7-6s7 2.5 7 6" />
    </Icon>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 0 0 11.5 11.5z" />
    </Icon>
  );
}

export function IconX(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function IconSmile(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4 4 0 0 0 7 0" />
      <circle cx="9" cy="10" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.75" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconSend(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12 14-7-4 14-2-5-8-2z" />
    </Icon>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 17v5" />
      <path d="M8 3h8l-1 7 3 2v2H6v-2l3-2-1-7z" />
    </Icon>
  );
}

export function IconSticker(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 3 8v8l9 5 9-5V8l-9-5z" />
      <path d="M12 12v8" />
      <path d="M12 12 3 8" />
      <path d="M12 12 21 16" />
    </Icon>
  );
}

export function IconGift(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="10" width="18" height="11" rx="1" />
      <path d="M12 10V21M3 10h18M12 10c-2-2-4-3-4-5a2 2 0 0 1 4 0c0 2-2 3-4 5zM12 10c2-2 4-3 4-5a2 2 0 0 0-4 0c0 2 2 3 4 5z" />
    </Icon>
  );
}

export function IconMic(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z" />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
    </Icon>
  );
}

export function IconHeadphones(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 14a8 8 0 0 1 16 0" />
      <rect x="2" y="14" width="5" height="7" rx="2" />
      <rect x="17" y="14" width="5" height="7" rx="2" />
    </Icon>
  );
}

export function IconReply(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 17 4 12l5-5" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </Icon>
  );
}

export function IconDots(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconThreads(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </Icon>
  );
}

export function IconUserPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </Icon>
  );
}

export function IconBold(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7V5zm0 7h7a3.5 3.5 0 0 1 0 7H7v-7z" />
    </Icon>
  );
}

export function IconItalic(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 5h-9M14 19H5M15 5 9 19" />
    </Icon>
  );
}

export function IconStrike(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M16 6.5C15.2 5.6 13.8 5 12 5c-2.8 0-5 1.7-5 4s2.2 4 5 4c1.8 0 3.2-.6 4-1.5M8 17.5c.8.9 2.2 1.5 4 1.5 2.8 0 5-1.7 5-4" />
    </Icon>
  );
}

export function IconSpoiler(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 12h10" />
    </Icon>
  );
}

export function IconCode(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m16 18 6-6-6-6M8 6 2 12l6 6" />
    </Icon>
  );
}

export function IconUnderline(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 5v6a5 5 0 0 0 10 0V5M5 19h14" />
    </Icon>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icon>
  );
}
